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

export default router;
