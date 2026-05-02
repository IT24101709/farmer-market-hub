const express = require('express');
const router = express.Router();
const {
  getAllDeliveriesAdmin,
  assignDelivery,
  getDeliveryAgents,
  getPendingShipments,
  getDeliveryStats
} = require('../controllers/deliveryController');
const { protect, adminRole } = require('../middleware/authMiddleware');

// Admin delivery management routes
router.get('/deliveries', protect, adminRole, getAllDeliveriesAdmin);
router.post('/deliveries/assign', protect, adminRole, assignDelivery);
router.get('/delivery-agents', protect, adminRole, getDeliveryAgents);
router.get('/shipments/pending', protect, adminRole, getPendingShipments);
router.get('/deliveries/stats', protect, adminRole, getDeliveryStats);

module.exports = router;
