const express = require('express');
const router = express.Router();
const { getDashboardInsights, getPriceTrends } = require('../controllers/farmerController');
const { protect } = require('../middleware/authMiddleware');

// Dashboard Insights
router.get('/insights', protect, getDashboardInsights);

// Price Trends
router.get('/price-trends/:vegetableName', protect, getPriceTrends);

module.exports = router;
