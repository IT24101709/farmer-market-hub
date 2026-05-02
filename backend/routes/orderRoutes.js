const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrder,
  deleteOrder
} = require('../controllers/orderController');
const { protect, customerRole, adminRole } = require('../middleware/authMiddleware');

router.post('/', protect, customerRole, createOrder);
router.get('/my', protect, customerRole, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id', protect, updateOrder);
router.delete('/:id', protect, adminRole, deleteOrder);

module.exports = router;
