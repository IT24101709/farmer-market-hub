const express = require('express');
const router = express.Router();
const {
  processPayment,
  getOverview,
  getMyPayments,
  getPaymentByOrderId,
  getPaymentById,
  updatePaymentStatus,
  deletePayment
} = require('../controllers/paymentController');
const { protect, adminRole, customerRole } = require('../middleware/authMiddleware');

// All payment routes require authentication
router.use(protect);

// Customer: pay for a confirmed order
router.post('/process', customerRole, processPayment);

// Admin: full payment overview + stats
router.get('/overview', adminRole, getOverview);

// Customer: their own payment history (must come before /:id)
router.get('/my', customerRole, getMyPayments);

// Any authenticated user: payment by order ID (must come before /:id)
router.get('/order/:orderId', getPaymentByOrderId);

// Admin: update status manually
router.patch('/:id/status', adminRole, updatePaymentStatus);

// Admin: delete payment record
router.delete('/:id', adminRole, deletePayment);

// Any authenticated user: payment by payment ID
router.get('/:id', getPaymentById);

module.exports = router;
