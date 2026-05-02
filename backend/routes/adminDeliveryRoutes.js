const express = require('express');
const router = express.Router();
const {
  getAllDeliveries,
  assignAgent,
  getDeliveryAgents,
  getPendingShipments,
  getDeliveryStats
} = require('../controllers/deliveryController');
const { protect, adminRole } = require('../middleware/authMiddleware');

// Admin delivery management routes
router.get('/deliveries', protect, adminRole, getAllDeliveries);
router.patch('/:id/assign', protect, adminRole, assignAgent);
router.get('/delivery-agents', protect, adminRole, getDeliveryAgents);
router.get('/shipments/pending', protect, adminRole, getPendingShipments);
router.get('/deliveries/stats', protect, adminRole, getDeliveryStats);

module.exports = router;
