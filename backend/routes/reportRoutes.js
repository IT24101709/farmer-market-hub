const express = require('express');
const router = express.Router();
const {
  getMonthlySalesReport,
  getActivityReport,
  setUserActiveStatus,
  exportReport
} = require('../controllers/reportController');
const { protect, adminRole } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminRole);

router.get('/monthly-sales', getMonthlySalesReport);
router.get('/activity', getActivityReport);
router.get('/export', exportReport);
router.patch('/users/:id/active-status', setUserActiveStatus);

module.exports = router;
