const express = require('express');
const router = express.Router();
const {
  createReview,
  getReviews,
  getReviewSummary,
  updateOwnReview,
  deleteOwnReview,
  adminRemoveReview
} = require('../controllers/reviewController');
const { protect, adminRole, customerRole } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getReviews);
router.get('/summary', getReviewSummary);
router.post('/', customerRole, createReview);
router.put('/:id', customerRole, updateOwnReview);
router.delete('/:id', customerRole, deleteOwnReview);
router.patch('/:id/remove', adminRole, adminRemoveReview);

module.exports = router;
