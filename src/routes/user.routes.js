import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtUser } from "../middlewares/user.middleware.js";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getUserAddress,
  updateUserDetails,
  updatePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  resetPassword,
 // getUserWithAddresses,
} from "../controllers/user.controller.js";

import {
  getUserPurchaseSummary,
  getUserOrderStatusInsights,
  getUserSpendingPatterns,
  getUserMonthlySpending
} from "../controllers/insights.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// secured routes
router.post("/logout", logoutUser);
router.route("/get-user").get(verifyJwtUser, getCurrentUser);

router.route("/get-address").get(verifyJwtUser, getUserAddress);


router.route("/update-password").patch(verifyJwtUser, updatePassword);

router.route("/update-user").put(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "verificationDocuments",
    },
  ]),
  verifyJwtUser,
  updateUserDetails
);
//address routes
router.route("/add-address").patch(verifyJwtUser, addAddress);
router.route("/update-address/:addressId").patch(verifyJwtUser, updateAddress);
router.route("/delete-address/:addressId").delete(verifyJwtUser, deleteAddress);
router.route("/set-default-address/:addressId").patch(verifyJwtUser, setDefaultAddress);
router.route("/reset-password").post(resetPassword);
// router.route("/get-user-addresses").get(verifyJwtUser, getUserWithAddresses);

router.route("/purchase-summary").get(verifyJwtUser, getUserPurchaseSummary);
router.route("/order-status-insights").get(verifyJwtUser, getUserOrderStatusInsights);
router.route("/spending-patterns").get(verifyJwtUser, getUserSpendingPatterns);
router.route("/monthly-spending").get(verifyJwtUser, getUserMonthlySpending);

export default router;
