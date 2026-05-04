const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const reconciliationController = require('../controller/reconciliationController');

// Run the automated reconciliation matching algorithm
router.post('/run', authMiddleware, reconciliationController.runReconciliation);

// Get results for a specific reconciliation run
router.get('/results/:reconId', authMiddleware, reconciliationController.getResults);

// Get all reconciliation runs for this business
router.get('/', authMiddleware, reconciliationController.getReconciliations);

module.exports = router;
