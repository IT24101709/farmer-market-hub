const express = require('express');
const router = express.Router();
const {
  getSystemSummary,
  getAllFarmers,
  toggleFarmerStatus
} = require('../controllers/adminController');
const { protect, adminRole } = require('../middleware/authMiddleware');

// All routes here are protected and require admin role
router.use(protect);
router.use(adminRole);

router.get('/summary', getSystemSummary);
router.get('/farmers', getAllFarmers);
router.patch('/farmers/:id/toggle-status', toggleFarmerStatus);

module.exports = router;
