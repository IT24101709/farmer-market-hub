const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getSingleOrder,
  updateOrder,
  deleteOrder
} = require('../controllers/orderController');

// POST /api/orders - Create a new order
router.post('/', createOrder);

// GET /api/orders - Get all orders
router.get('/', getAllOrders);

// GET /api/orders/:id - Get single order
router.get('/:id', getSingleOrder);

// PUT /api/orders/:id - Update order
router.put('/:id', updateOrder);

// DELETE /api/orders/:id - Delete order
router.delete('/:id', deleteOrder);

module.exports = router;
