
const trainingData = [
    {
        label: 'transaction_id_anchor',
        phrases: [
            // --- Existing ---
            'Invoice Number', 'Invoice Number:', 'Invoice No.', 'Invoice No:',
            'Invoice #', 'Inv Number', 'Inv No', 'Inv#',
            'Transaction ID', 'Transaction ID:', 'Txn ID', 'Txn #',
            'Transaction No', 'Transaction Number',
            'Receipt Number', 'Receipt No:', 'Receipt #',
            'Bill Number', 'Bill No:', 'Bill #',
            'Reference Number', 'Ref Number', 'Ref No:', 'Ref ID',
            'Invoice ID', 'Invoice Reference', 'Invoice Ref',
            'Bill ID', 'Bill Ref',
            'UTR Number', 'UTR No', 'UTR', 'RRN',
            'Order Reference', 'Order Ref No',
            'Receipt ID', 'Record Number',

            // --- Generic Short-form / OCR Variants ---
            'No.', 'No:', 'No #', 'Num', 'Num.', '#',
            'ID', 'ID:', 'ID No', 'ID Number',
            'Ref', 'Ref.', 'Ref:', 'Ref No.', 'Ref. No.',
            'S.No', 'Sr No', 'Sr. No.', 'Sl No', 'Sl. No.',
        ]
    },

    {
        label: 'transaction_date_anchor',
        phrases: [
            // --- Existing ---
            'Date', 'Date:', 'Invoice Date', 'Bill Date', 'Document Date', 'Issued On',
            'Date of Issue', 'Date Issued', 'Billing Date', 'Transaction Date',
            'Dt', 'Dt.', 'Dated', 'Transaction Time', 'Date & Time', 'Timestamp',

            // --- Payment / Finance Dates ---
            'Payment Received Date', 'Payment Received On',
            'Transaction Dt', 'Txn Dt',
            'Credit Date', 'Debit Date',
            'Last Payment Date', 'Last Transaction Date',
            'Opening Date', 'Closing Date',
            'Cheque Date', 'DD Date',
            'UPI Date', 'Transfer Dt',

            // --- E-Commerce Dates ---
            'Order Date', 'Placed On', 'Order Placed', 'Date of Order',
            'Dispatch Date', 'Dispatched On',
            'Shipping Date', 'Shipment Date',
        ]
    },

    {
        label: 'amount_anchor',
        phrases: [
            'Amount', 'Total Paid', 'Final Amount', 'Net Payable',
            'Net Due', 'Amount to be Paid',
            'Total Invoice Value', 'Total Bill Value',
            'Total Order Value', 'Order Total', 'Cart Total',
            'Total Charges', 'Total Fees',
            'Grand Total (Incl. Tax)', 'Grand Total (Excl. Tax)',
            'Total (Incl. GST)', 'Total (Excl. GST)',
            'Total (with Tax)', 'Total (before Tax)',
            'Estimated Total'
        ]
    },
    {
        label: 'transaction_type_anchor_debit',
        phrases: [
            'Income',
            'Amount Received', 'Received From', 'Payment Inward',
            'Sold To', 'Bill To', 'Billed To'
        ]
    },

    {
        label: 'description_anchor',
        phrases: [
            "Description",
            "Details",
            "Product",
            "Service"
        ]
    }
];


module.exports = {
    trainingData
};