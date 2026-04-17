const express = require('express');
const router = express.Router();
const {
  createStock,
  getMyStocks,
  getStockById,
  updateStock,
  deleteStock
} = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Route mapping
router.route('/')
  .post(protect, upload.single('image'), createStock);

router.route('/my')
  .get(protect, getMyStocks);

router.route('/:id')
  .get(protect, getStockById)
  .put(protect, upload.single('image'), updateStock)
  .delete(protect, deleteStock);

module.exports = router;
