const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getHistory,
  getTodayDeliveries,
  updateDeliveryStatus,
  shipOrder
} = require('../controllers/deliveryController');
const { protect, deliveryAgentRole, farmerRole } = require('../middleware/authMiddleware');

// Delivery Agent routes
router.get('/dashboard', protect, deliveryAgentRole, getDashboard);
router.get('/history', protect, deliveryAgentRole, getHistory);
router.get('/today', protect, deliveryAgentRole, getTodayDeliveries);
router.put('/:deliveryId/item/:itemId', protect, deliveryAgentRole, updateDeliveryStatus);
router.put('/ship/:orderId', protect, farmerRole, shipOrder);

module.exports = router;
