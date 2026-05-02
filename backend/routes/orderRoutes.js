const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  confirmOrder,
  sendToDelivery,
  assignAgent,
  startDelivery,
  completeDelivery,
  adminApproveOrder,
  setOrderStatus,
  updateOrderStatus,
  getAllOrders
} = require('../controllers/orderController');
const { protect, customerRole, adminRole, farmerRole, deliveryRole } = require('../middleware/authMiddleware');

// Order lifecycle routes (step-by-step)
router.post('/', protect, customerRole, createOrder);
router.get('/my', protect, customerRole, getMyOrders);
router.get('/', protect, adminRole, getAllOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id', protect, updateOrder);
router.delete('/:id', protect, adminRole, deleteOrder);

// Step 2: Farmer confirms order -> CONFIRMED
router.put('/:id/confirm', protect, farmerRole, confirmOrder);
// Step 3: Send to delivery module -> READY_FOR_DELIVERY
router.put('/:id/send-to-delivery', protect, adminRole, sendToDelivery);
// Step 4: Assign delivery agent -> ASSIGNED
router.put('/:id/assign-agent', protect, adminRole, assignAgent);
// Step 5: Start delivery -> IN_TRANSIT
router.put('/:id/start-delivery', protect, deliveryRole, startDelivery);
// Step 6: Complete delivery -> DELIVERED
router.put('/:id/complete-delivery', protect, deliveryRole, completeDelivery);
// Admin: Approve/Reject order (force any status)
router.put('/:id/admin-approve', protect, adminRole, adminApproveOrder);
// Admin: Set order status directly
router.put('/:id/set-status', protect, adminRole, setOrderStatus);
// Admin: Update order status (PATCH)
router.patch('/:id/status', protect, adminRole, updateOrderStatus);

module.exports = router;
