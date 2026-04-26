const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  getPendingFarmers,
  approveFarmer,
  rejectFarmer
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getMe);

// Admin only routes
router.get('/admin/pending-farmers', protect, getPendingFarmers);
router.post('/admin/approve-farmer/:farmerId', protect, approveFarmer);
router.post('/admin/reject-farmer/:farmerId', protect, rejectFarmer);

module.exports = router;
