import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  registerVendor,
  loginVendor,
} from "../controllers/vendor.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  registerVendor
);

router.route("/login").post(loginVendor);

// secured routes
// router.route("/logout").post(verifyJwt, logoutUser);
// router.route("/getUser").get(verifyJwt, getCurrentUser);

export default router;
