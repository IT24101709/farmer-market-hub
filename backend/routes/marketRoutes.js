const express = require('express');
const router = express.Router();
const { getProducts, getProductById } = require('../controllers/marketController');
const { protect } = require('../middleware/authMiddleware');

// All market routes require auth (any role can browse)
router.get('/', protect, getProducts);
router.get('/:id', protect, getProductById);

module.exports = router;
