const db = require('../config/db');

/* ── helpers ── */
const safeNum  = (v) => { const n = Number(v); return isNaN(n) ? null : n; };
const safeDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };

/* ════════════════════════════════════════════════════════
   runReconciliation  — CORRECT FLOW:

   Algorithm (per ledger invoice, in order):

   Tier 1 — Invoice ID match
     · Scan bank records for:
         bank.transaction_id  == ledger.transaction_id  (case-insensitive), OR
         bank.invoice_number  == ledger.transaction_id  (case-insensitive), OR
         bank.description contains ledger.transaction_id (keyword)
     · If found → result = 100 (Matched)

   Tier 2 — Amount match + Date difference → Partial
     · Amount must be exactly equal (± 0.01 tolerance)
     · If amount matches:
         diffDays = |bank_date − invoice_date| in full days
         pct      = max(0, 100 − (diffDays / 31) × 100)   clamped 0–100
         result   = round(pct)   →  100=Matched, 1–99=Partial, 0=Unmatched

   Tier 3 — No match → result = 0 (Unmatched)

   Sorting: both sets sorted by ABS(amount) DESC, date ASC before matching.
   Safety : used-Sets ensure no record is matched twice.
   ════════════════════════════════════════════════════════ */
const runReconciliation = async (req, res) => {
    let conn;
    try {
        const { ledgerId, bankStatementGroupId } = req.body;
        if (!ledgerId || !bankStatementGroupId)
            return res.status(400).json({ message: 'Missing ledgerId or bankStatementGroupId' });

        conn = await db.getConnection();

        /* ── 1. Verify bank statement group exists ── */
        const [grpRows] = await conn.execute(
            `SELECT id, bank_account_id, target_month, target_year
             FROM bank_statement_groups WHERE id = ?`,
            [bankStatementGroupId]
        );
        if (!grpRows.length) {
            conn.release();
            return res.status(404).json({ message: 'Bank statement group not found' });
        }

        /* ── 2. Verify ledger exists ── */
        const [ledgerRows] = await conn.execute(
            `SELECT id FROM ledgers WHERE id = ?`, [ledgerId]
        );
        if (!ledgerRows.length) {
            conn.release();
            return res.status(404).json({ message: 'Ledger not found' });
        }

        /* ── 3. Create (or reuse) a reconciliation_groups row ── */
        // If one already exists for this ledger+bankGroup pair, reuse it (wipe old results)
        const [existingGroup] = await conn.execute(
            `SELECT id FROM reconciliation_groups
             WHERE ledger_id = ? AND bank_statement_group_id = ?
             LIMIT 1`,
            [ledgerId, bankStatementGroupId]
        );

        let reconGroupId;
        if (existingGroup.length > 0) {
            reconGroupId = existingGroup[0].id;
            // Reset status so it shows as running again
            await conn.execute(
                `UPDATE reconciliation_groups
                 SET status = 'in_progress', completed_at = NULL
                 WHERE id = ?`,
                [reconGroupId]
            );
        } else {
            const [insertResult] = await conn.execute(
                `INSERT INTO reconciliation_groups (ledger_id, bank_statement_group_id, status)
                 VALUES (?, ?, 'in_progress')`,
                [ledgerId, bankStatementGroupId]
            );
            reconGroupId = insertResult.insertId;
        }

        /* ── 4. Fetch & sort ledger invoice records ── */
        const [ledgerRecords] = await conn.execute(
            `SELECT id, transaction_id, transaction_date, amount, transaction_type, description
             FROM ledger_records WHERE ledger_id = ?
             ORDER BY ABS(amount) DESC, transaction_date ASC`,
            [ledgerId]
        );

        /* ── 5. Fetch & sort bank statement records ── */
        const [bankRecords] = await conn.execute(
            `SELECT id, transaction_id, invoice_number, transaction_date, amount, transaction_type, description
             FROM bank_statement_records WHERE bank_statement_group_id = ?
             ORDER BY ABS(amount) DESC, transaction_date ASC`,
            [bankStatementGroupId]
        );

        /* ── 6. Used-sets — no record matched twice ── */
        const usedBankIds = new Set();

        /* ── Tier 1 helper: find bank record by invoice ID ── */
        const findByInvoiceId = (invoiceId) => {
            if (!invoiceId) return null;
            const needle = invoiceId.trim().toLowerCase();
            return bankRecords.find(b => {
                if (usedBankIds.has(b.id)) return false;
                const bTxn  = (b.transaction_id || '').trim().toLowerCase();
                const bInv  = (b.invoice_number  || '').trim().toLowerCase();
                const bDesc = (b.description     || '').trim().toLowerCase();
                return bTxn === needle || bInv === needle || bDesc.includes(needle);
            }) || null;
        };

        /* ── Tier 2 helper: find bank record by exact amount, pick best date ── */
        const findByAmountDate = (ledgerAmount, ledgerDate) => {
            if (ledgerAmount === null || ledgerDate === null) return null;
            let best = null, bestPct = -1;
            for (const b of bankRecords) {
                if (usedBankIds.has(b.id)) continue;
                const bAmt  = safeNum(b.amount);
                const bDate = safeDate(b.transaction_date);
                if (bAmt === null || bDate === null) continue;
                if (Math.abs(bAmt - ledgerAmount) > 0.01) continue; // amount MUST match
                const diffDays = Math.abs(bDate.getTime() - ledgerDate.getTime()) / 86400000;
                const pct = Math.max(0, Math.min(100, 100 - (diffDays / 31) * 100));
                if (pct > bestPct) { bestPct = pct; best = b; }
            }
            return best ? { record: best, pct: bestPct } : null;
        };

        /* ── 7. Delete old results for this run ── */
        await conn.execute(
            `DELETE FROM reconciliation_results WHERE reconciliation_id = ?`,
            [reconGroupId]
        );

        /* ── 8. Main matching loop ── */
        const toInsert = [];
        const summary  = { matched: 0, partial: 0, unmatched: 0 };

        for (const ledger of ledgerRecords) {
            const invoiceId  = (ledger.transaction_id || '').trim() || null;
            const ledgerAmt  = safeNum(ledger.amount);
            const ledgerDate = safeDate(ledger.transaction_date);

            let matchedBank = null;
            let resultScore = 0;

            /* TIER 1 — Invoice ID */
            const t1 = findByInvoiceId(invoiceId);
            if (t1) {
                matchedBank = t1;
                resultScore = 100;
                usedBankIds.add(t1.id);
                summary.matched++;
            }

            /* TIER 2 — Amount exact + Date difference → partial % */
            if (!matchedBank) {
                const t2 = findByAmountDate(ledgerAmt, ledgerDate);
                if (t2) {
                    matchedBank = t2.record;
                    resultScore = Math.max(0, Math.min(100, Math.round(t2.pct)));
                    usedBankIds.add(t2.record.id);
                    if      (resultScore >= 100) { resultScore = 100; summary.matched++;   }
                    else if (resultScore  >   0) {                    summary.partial++;   }
                    else                         {                    summary.unmatched++; }
                } else {
                    /* TIER 3 — Unmatched */
                    summary.unmatched++;
                }
            }

            toInsert.push([
                reconGroupId,
                ledger.id,
                matchedBank ? matchedBank.id                        : null,
                invoiceId,
                ledger.description                                  || null,
                ledger.transaction_type                             || null,
                ledgerAmt,
                matchedBank ? safeNum(matchedBank.amount)           : null,
                matchedBank ? (matchedBank.transaction_id || null)  : null,
                resultScore
            ]);
        }

        /* ── 9. Batch insert + mark completed (in a transaction) ── */
        await conn.beginTransaction();
        try {
            if (toInsert.length > 0) {
                await conn.query(
                    `INSERT INTO reconciliation_results
                     (reconciliation_id, ledger_record_id, bank_statement_record_id,
                      invoice_id, description, transaction_type,
                      invoice_amount, bank_amount, bank_txn_id, result)
                     VALUES ?`,
                    [toInsert]
                );
            }
            await conn.execute(
                `UPDATE reconciliation_groups
                 SET status = 'completed', completed_at = NOW()
                 WHERE id = ?`,
                [reconGroupId]
            );

            // Flag ALL ledger records in this ledger as reconciled
            await conn.execute(
                `UPDATE ledger_records lr
                 JOIN reconciliation_groups rg ON lr.ledger_id = rg.ledger_id
                 SET lr.is_reconciled = TRUE
                 WHERE rg.id = ?`,
                [reconGroupId]
            );

            // Flag ALL bank statement records in this bank statement group as reconciled
            await conn.execute(
                `UPDATE bank_statement_records bsr
                 JOIN reconciliation_groups rg ON bsr.bank_statement_group_id = rg.bank_statement_group_id
                 SET bsr.is_reconciled = TRUE
                 WHERE rg.id = ?`,
                [reconGroupId]
            );

            await conn.commit();
        } catch (insertErr) {
            await conn.rollback();
            throw insertErr;
        }

        conn.release();
        return res.status(200).json({
            message  : 'Reconciliation completed successfully',
            reconId  : reconGroupId,        // ← frontend navigates here
            summary,
            totals   : {
                ledger_records : ledgerRecords.length,
                bank_records   : bankRecords.length
            }
        });

    } catch (err) {
        if (conn) { try { await conn.rollback(); } catch (_) {} conn.release(); }
        console.error('Reconciliation error:', err);
        return res.status(500).json({ message: 'Server error during reconciliation', error: err.message });
    }
};

/* ════════════════════════════════════════════════════════
   getReconciliations — list all runs for this business
   ════════════════════════════════════════════════════════ */
const getReconciliations = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'User ID not found in token' });

        const BusinessModel = require('../model/businessModel');
        const businesses = await BusinessModel.findByUserId(userId);

        if (!businesses || businesses.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No businesses found for this user'
            });
        }

        const activeBusinessId = req.query.businessId || businesses[0].id;

        const [rows] = await db.execute(
            `SELECT
                 rg.id,
                 rg.status,
                 rg.created_at,
                 rg.completed_at,
                 l.target_month,
                 l.target_year,
                 ba.bank_name,
                 ba.account_nickname,
                 (SELECT COUNT(*) FROM reconciliation_results rr
                  WHERE rr.reconciliation_id = rg.id AND rr.result = 100)           AS matched_count,
                 (SELECT COUNT(*) FROM reconciliation_results rr
                  WHERE rr.reconciliation_id = rg.id AND rr.result > 0
                    AND rr.result < 100)                                             AS partial_count,
                 (SELECT COUNT(*) FROM reconciliation_results rr
                  WHERE rr.reconciliation_id = rg.id AND rr.result = 0)             AS unmatched_count,
                 (SELECT COUNT(*) FROM reconciliation_results rr
                  WHERE rr.reconciliation_id = rg.id)                               AS total_count
             FROM reconciliation_groups rg
             JOIN ledgers       l  ON rg.ledger_id             = l.id
             JOIN bank_accounts ba ON l.bank_account_id        = ba.id
             JOIN businesses    b  ON ba.business_id           = b.id
             WHERE b.id = ?
             ORDER BY rg.created_at DESC`,
            [activeBusinessId]
        );

        return res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error('getReconciliations error:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/* ════════════════════════════════════════════════════════
   getResults — all rows for one run  (0=unmatched, 1-99=partial, 100=matched)
   ════════════════════════════════════════════════════════ */
const getResults = async (req, res) => {
    try {
        const { reconId } = req.params;
        if (!reconId || isNaN(Number(reconId)))
            return res.status(400).json({ message: 'Invalid reconId' });

        /* ── result rows ── */
        const [rows] = await db.execute(
            `SELECT
                 rr.id,
                 rr.invoice_id,
                 rr.description,
                 rr.transaction_type,
                 rr.invoice_amount,
                 rr.bank_amount,
                 rr.bank_txn_id,
                 rr.result,
                 lr.transaction_date  AS invoice_date,
                 bsr.transaction_date AS bank_date
             FROM reconciliation_results rr
             LEFT JOIN ledger_records         lr  ON rr.ledger_record_id         = lr.id
             LEFT JOIN bank_statement_records bsr ON rr.bank_statement_record_id = bsr.id
             WHERE rr.reconciliation_id = ?
             ORDER BY rr.result DESC, rr.id ASC`,
            [reconId]
        );

        /* ── run meta (bank account, period) — correct JOIN path ── */
        const [metaRows] = await db.execute(
            `SELECT
                 rg.id,
                 rg.status,
                 l.target_month,
                 l.target_year,
                 ba.bank_name,
                 ba.account_nickname,
                 ba.account_last_four
             FROM reconciliation_groups rg
             JOIN ledgers       l  ON rg.ledger_id      = l.id
             JOIN bank_accounts ba ON l.bank_account_id = ba.id
             WHERE rg.id = ?
             LIMIT 1`,
            [reconId]
        );

        return res.status(200).json({
            success : true,
            meta    : metaRows[0] || null,
            results : rows
        });
    } catch (err) {
        console.error('getResults error:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { runReconciliation, getReconciliations, getResults };
