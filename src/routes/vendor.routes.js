import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
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
// router.route("/logout").post(verifyJwtVendor, logoutUser);
// router.route("/getUser").get(verifyJwtVendor, getCurrentUser);

export default router;
