const db = require('../config/db');

class StatsModel {
    static async getOverallStats(businessId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as total_records_processed,
                SUM(CASE WHEN rr.result = 100 THEN 1 ELSE 0 END) as all_time_exact,
                SUM(CASE WHEN rr.result > 0 AND rr.result < 100 THEN 1 ELSE 0 END) as all_time_partial,
                SUM(CASE WHEN rr.result = 0 THEN 1 ELSE 0 END) as all_time_unmatched
            FROM reconciliation_results rr
            JOIN reconciliation_groups rg ON rr.reconciliation_id = rg.id
            JOIN ledgers l ON rg.ledger_id = l.id
            JOIN bank_accounts ba ON l.bank_account_id = ba.id
            WHERE ba.business_id = ?`,
            [businessId]
        );
        return rows[0];
    }

    static async getMonthlyStats(businessId) {
        const [rows] = await db.execute(
            `SELECT 
                l.target_month,
                l.target_year,
                COUNT(rr.id) as total_records,
                SUM(CASE WHEN rr.result = 100 THEN 1 ELSE 0 END) as exact_matches,
                SUM(CASE WHEN rr.result > 0 AND rr.result < 100 THEN 1 ELSE 0 END) as partial_matches,
                SUM(CASE WHEN rr.result = 0 THEN 1 ELSE 0 END) as unmatched
            FROM reconciliation_results rr
            JOIN reconciliation_groups rg ON rr.reconciliation_id = rg.id
            JOIN ledgers l ON rg.ledger_id = l.id
            JOIN bank_accounts ba ON l.bank_account_id = ba.id
            WHERE ba.business_id = ?
            GROUP BY l.target_year, l.target_month
            ORDER BY l.target_year DESC, l.target_month DESC
            LIMIT 2`,
            [businessId]
        );
        return rows;
    }

    static async getRecentMatches(businessId) {
        const [rows] = await db.execute(
            `SELECT 
                rr.id,
                rr.transaction_type,
                rr.bank_amount as amount,
                rr.result,
                rr.created_at as match_date,
                COALESCE(rr.invoice_id, rr.bank_txn_id) as transaction_id
            FROM reconciliation_results rr
            JOIN reconciliation_groups rg ON rr.reconciliation_id = rg.id
            JOIN ledgers l ON rg.ledger_id = l.id
            JOIN bank_accounts ba ON l.bank_account_id = ba.id
            WHERE ba.business_id = ? AND rr.result > 0
            ORDER BY rr.created_at DESC
            LIMIT 5`,
            [businessId]
        );
        return rows;
    }
}

module.exports = StatsModel;
