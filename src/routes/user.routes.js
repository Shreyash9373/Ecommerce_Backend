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
 // getUserWithAddresses,
} from "../controllers/user.controller.js";

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
// router.route("/get-user-addresses").get(verifyJwtUser, getUserWithAddresses);

export default router;
