import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { addProduct } from "../controllers/products.controller.js";

const router = Router();

router.route("/add-Product").post(
  upload.fields([
    {
      name: "images",
      maxCount: 8,
    },
  ]),
  verifyJwtVendor,
  addProduct
);

// secured routes
// router.route("/logout").post(verifyJwt, logoutUser);
// router.route("/getUser").get(verifyJwt, getCurrentUser);

export default router;
