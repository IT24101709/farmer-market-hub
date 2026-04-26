const express = require('express');
const router = express.Router();
const { getProducts, getProductById, getPublicProducts } = require('../controllers/marketController');
const { protect } = require('../middleware/authMiddleware');

// Public route for landing page
router.get('/public', getPublicProducts);

// Protected market routes (any role can browse)
router.get('/', protect, getProducts);
router.get('/:id', protect, getProductById);

module.exports = router;
