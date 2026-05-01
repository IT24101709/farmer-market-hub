const express = require('express');
const router = express.Router();
const { getDashboardInsights, getPriceTrends, getMyOrders, getOrderById, getPaymentHistory } = require('../controllers/farmerController');
const { protect } = require('../middleware/authMiddleware');

// Dashboard Insights
router.get('/insights', protect, getDashboardInsights);

// Price Trends
router.get('/price-trends/:vegetableName', protect, getPriceTrends);

// Orders (Farmer)
router.get('/orders', protect, getMyOrders);
router.get('/orders/:id', protect, getOrderById);

// Payments (Farmer)
router.get('/payments', protect, getPaymentHistory);

module.exports = router;
