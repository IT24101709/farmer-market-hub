const express = require('express');
const router = express.Router();

const {
  createDelivery,
  getAllDeliveries,
  getMyDeliveries,
  getDeliveryById,
  getDeliveryByOrderId,
  assignAgent,
  assignDriver,
  updateStatus,
  cancelDelivery
} = require('../controllers/deliveryController');

const { protect, adminRole, deliveryAgentRole } = require('../middleware/authMiddleware');

// Apply verifyToken (protect) middleware to all routes
router.use(protect);

// @route   POST /api/deliveries
// @desc    Create delivery
// @access  Private Admin
router.post('/', adminRole, createDelivery);

// @route   GET /api/deliveries
// @desc    Get all deliveries
// @access  Private Admin
router.get('/', adminRole, getAllDeliveries);

// @route   GET /api/deliveries/my
// @desc    Get agent's deliveries
// @access  Private DeliveryAgent
router.get('/my', deliveryAgentRole, getMyDeliveries);

// @route   GET /api/deliveries/order/:orderId
// @desc    Get delivery by order ID
// @access  Private
router.get('/order/:orderId', getDeliveryByOrderId);

// @route   GET /api/deliveries/:id
// @desc    Get delivery by ID
// @access  Private
router.get('/:id', getDeliveryById);

// @route   PATCH /api/deliveries/:id/assign
// @desc    Assign agent to delivery
// @access  Private Admin
router.patch('/:id/assign', adminRole, assignAgent);

// @route   PATCH /api/deliveries/:id/status
// @desc    Update delivery status
// @access  Private DeliveryAgent
router.patch('/:id/status', deliveryAgentRole, updateStatus);

// @route   PATCH /api/deliveries/:id/cancel
// @desc    Cancel delivery
// @access  Private Admin
router.patch('/:id/cancel', adminRole, cancelDelivery);

module.exports = router;
