const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, adminRole } = require('../middleware/authMiddleware');

// Public
router.get('/', getCategories);

// Admin only
router.post('/', protect, adminRole, createCategory);
router.put('/:id', protect, adminRole, updateCategory);
router.delete('/:id', protect, adminRole, deleteCategory);

module.exports = router;
