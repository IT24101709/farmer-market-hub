const express = require('express');
const router = express.Router();
const {
  getSystemSummary,
  getAllFarmers,
  getAllUsers,
  toggleUserStatus,
  registerUserManually,
  resetUserPassword,
  toggleTwoFactorAuth,
  editFarmerProfile,
  deleteFarmer,
  suspendFarmer,
  reactivateFarmer,
  assignRegion,
  exportFarmers,
  getFarmerHistory,
  approveFarmerStock,
  getAdminStocks,
  adminToggleProductVisibility,
  adminRemoveProduct,
  adminBulkHideProducts,
  adminOverridePrice,
  applyGlobalVisibilityRules,
  adminUpdateStock,
  freezeFarmerStock,
  adminRemoveStock
} = require('../controllers/adminController');
const { getPendingFarmers } = require('../controllers/authController');
const { protect, adminRole } = require('../middleware/authMiddleware');
const { getAllOrdersAdmin } = require('../controllers/orderController');

// All routes here are protected and require admin role
router.use(protect);
router.use(adminRole);

router.get('/orders', getAllOrdersAdmin);
router.get('/summary', getSystemSummary);
router.get('/farmers', getAllFarmers); // keeping backward compatibility
router.get('/farmers/export', exportFarmers); // Make sure this comes BEFORE /farmers/:id
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.post('/register-user', registerUserManually);
router.post('/users/:id/reset-password', resetUserPassword);
router.patch('/users/:id/toggle-2fa', toggleTwoFactorAuth);

// Farmer Management specific endpoints
router.put('/farmers/:id', editFarmerProfile);
router.delete('/farmers/:id', deleteFarmer);
router.patch('/farmers/:id/suspend', suspendFarmer);
router.patch('/farmers/:id/reactivate', reactivateFarmer);
router.patch('/farmers/:id/region', assignRegion);
router.get('/farmers/:id/history', getFarmerHistory);

// Admin Product Management
router.get('/stocks', getAdminStocks);
router.patch('/products/bulk-hide', adminBulkHideProducts);
router.post('/products/apply-rules', applyGlobalVisibilityRules);
router.patch('/products/:id/visibility', adminToggleProductVisibility);
router.put('/stocks/:id', adminUpdateStock);
router.patch('/farmers/:id/freeze-stock', freezeFarmerStock);
router.put('/stocks/:id', adminUpdateStock);
router.patch('/stocks/:id/price', adminOverridePrice);
router.delete('/stocks/:id', adminRemoveStock);

// Stock Approvals
router.patch('/stocks/:id/approve', approveFarmerStock);
router.get('/pending-farmers', getPendingFarmers);  // Add missing route

module.exports = router;
