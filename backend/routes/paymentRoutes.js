import { Router } from "express";
import {
  approveOrder,
  downloadAdminReport,
  getAdminRequests,
  getCustomerDashboardCards,
  getOverview,
  getPaymentById,
  getPaymentByOrderId,
  processPayment,
  rejectOrder
} from "../controllers/paymentController.js";

const router = Router();

router.post("/process", processPayment);
router.get("/overview", getOverview);
router.get("/customers/dashboard", getCustomerDashboardCards);
router.get("/admin/requests", getAdminRequests);
router.post("/admin/requests/:orderId/approve", approveOrder);
router.post("/admin/requests/:orderId/reject", rejectOrder);
router.get("/admin/report", downloadAdminReport);
router.get("/order/:orderId", getPaymentByOrderId);
router.get("/:paymentId", getPaymentById);

export default router;
