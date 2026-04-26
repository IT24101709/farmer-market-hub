const express = require('express');
const router = express.Router();
const {
  createStock,
  getMyStocks,
  getStockById,
  updateStock,
  deleteStock,
  toggleVisibility,
  updateStatus,
  removeExpiredStock,
  bulkAddStocks,
  bulkUpdateStocks
} = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Route mapping
router.route('/')
  .post(protect, upload.single('image'), createStock);

router.route('/my')
  .get(protect, getMyStocks);

// Bulk operations (Must be before /:id)
router.route('/bulk/add')
  .post(protect, bulkAddStocks);

router.route('/bulk/update')
  .put(protect, bulkUpdateStocks);

router.route('/:id')
  .get(protect, getStockById)
  .put(protect, upload.single('image'), updateStock)
  .delete(protect, deleteStock);

router.route('/:id/visibility')
  .patch(protect, toggleVisibility);

router.route('/:id/status')
  .patch(protect, updateStatus);

router.route('/expired/all')
  .delete(protect, removeExpiredStock);

module.exports = router;
