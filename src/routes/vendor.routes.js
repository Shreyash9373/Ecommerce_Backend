import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { verifyJwtAdmin } from "../middlewares/admin.middleware.js";
import {
  registerVendor,
  loginVendor,
  logoutVendor,
  getCurrentVendor,
  updateVendorDetails,
  getVendorById,
  resetPassword,
  earningOverview,
  getMonthlySales,
  getMonthlyUnitsSold,
  getOrderStatus,
  vendorInsights,
  getCustomerOrderTrends,
  getBestProducts,
} from "../controllers/vendor.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "verificationDocuments",
    },
  ]),
  registerVendor
);

router.route("/login").post(loginVendor);

// secured routes
router.route("/logout").post(verifyJwtVendor, logoutVendor);
router.route("/get-vendor").get(verifyJwtVendor, getCurrentVendor);
router.route("/get-vendorById/:vendorId").get(verifyJwtAdmin, getVendorById);

router.route("/reset-password").post(resetPassword);

router.route("/update-vendor").put(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "verificationDocuments",
    },
  ]),
  verifyJwtVendor,
  updateVendorDetails
);

router.route("/earning-overview").get(verifyJwtVendor, earningOverview);

// Dashboard Routes

router.route("/month-sales").get(verifyJwtVendor, getMonthlySales);

router.route("/month-units").get(verifyJwtVendor, getMonthlyUnitsSold);

router.route("/order-status").get(verifyJwtVendor, getOrderStatus);

router.route("/vendor-insights").get(verifyJwtVendor, vendorInsights);

router.route("/order-customers").get(verifyJwtVendor, getCustomerOrderTrends);

router.route("/best-products").get(verifyJwtVendor, getBestProducts);

export default router;
