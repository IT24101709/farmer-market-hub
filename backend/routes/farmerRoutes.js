const express = require('express');
const router = express.Router();
const {
  getDashboardInsights,
  getStockStats,
  getPriceTrends,
  getMyOrders,
  getOrderById,
  getPaymentHistory,
  confirmFarmerOrderLines
} = require('../controllers/farmerController');
const { protect, farmerRole } = require('../middleware/authMiddleware');

// Dashboard Insights
router.get('/insights', protect, getDashboardInsights);
router.get('/stock-stats', protect, getStockStats);

// Price Trends
router.get('/price-trends/:vegetableName', protect, getPriceTrends);

// Orders (Farmer) — specific routes before /orders/:id
router.get('/orders', protect, farmerRole, getMyOrders);
router.post('/orders/:id/confirm', protect, farmerRole, confirmFarmerOrderLines);
router.get('/orders/:id', protect, farmerRole, getOrderById);

// Payments (Farmer)
router.get('/payments', protect, getPaymentHistory);

module.exports = router;
