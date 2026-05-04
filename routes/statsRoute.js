const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const { getDashboardStats } = require('../controller/statsController');

router.get('/dashboard-stats', verifyToken, getDashboardStats);

module.exports = router;
