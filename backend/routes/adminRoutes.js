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
  adminRemoveStock,
  getAdminOrders,
  updateOrderStatus,
  getDeliveryAgents,
  assignDeliveryAgent,
  getPendingShipments
} = require('../controllers/adminController');
const { getPendingFarmers } = require('../controllers/authController');
const { protect, adminRole } = require('../middleware/authMiddleware');
const { getAllOrdersAdmin, getPendingShipments: getPendingShipmentsFromOrder } = require('../controllers/orderController');

// All routes here are protected and require admin role
router.use(protect);
router.use(adminRole);

// Dashboard & Analytics
router.get('/summary', getSystemSummary);

// Order Management
router.get('/orders', getAdminOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/assign-agent', assignDeliveryAgent);
router.get('/shipments/pending', getPendingShipments);

// User & Farmer Management
router.get('/farmers', getAllFarmers); // keeping backward compatibility
router.get('/farmers/export', exportFarmers);
router.get('/farmers/:id/history', getFarmerHistory);
router.get('/users', getAllUsers);
router.get('/delivery-agents', getDeliveryAgents);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.post('/register-user', registerUserManually);
router.post('/users/:id/reset-password', resetUserPassword);
router.patch('/users/:id/toggle-2fa', toggleTwoFactorAuth);

// Farmer Management specific endpoints - MUST come BEFORE /farmers/:id
router.delete('/farmers/:id', deleteFarmer);
router.patch('/farmers/:id/suspend', suspendFarmer);
router.patch('/farmers/:id/reactivate', reactivateFarmer);
router.patch('/farmers/:id/region', assignRegion);
router.put('/farmers/:id', editFarmerProfile);
router.patch('/farmers/:id/freeze-stock', freezeFarmerStock);

// Admin Product/Stock Management
router.get('/stocks', getAdminStocks);
router.patch('/stocks/:id/visibility', adminToggleProductVisibility);
router.put('/stocks/:id', adminUpdateStock);
router.patch('/stocks/:id/price', adminOverridePrice);
router.delete('/stocks/:id', adminRemoveProduct);
router.patch('/stocks/:id/approve', approveFarmerStock);
router.patch('/products/bulk-hide', adminBulkHideProducts);
router.post('/products/apply-rules', applyGlobalVisibilityRules);

// Pending Approvals
router.get('/pending-farmers', getPendingFarmers);

module.exports = router;
