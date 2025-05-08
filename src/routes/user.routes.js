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
router.route("/logout").post(verifyJwtUser, logoutUser);
router.route("/get-user").get(verifyJwtUser, getCurrentUser);
router.route("/get-address").get(verifyJwtUser, getUserAddress);

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

export default router;
