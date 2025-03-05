import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import {
  addProduct,
  getAllProducts,
  getProductById,
  deleteProductById,
  updateProductById,
} from "../controllers/products.controller.js";

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

router.route("/update-product/:productId").put(
  upload.fields([
    {
      name: "images",
      maxCount: 8,
    },
  ]),
  verifyJwtVendor,
  updateProductById
);

// secured routes
router.route("/getAll-Products").get(verifyJwtVendor, getAllProducts);
router.route("/get-product/:productId").get(verifyJwtVendor, getProductById);
router
  .route("/delete-product/:productId")
  .delete(verifyJwtVendor, deleteProductById);
// router.route("/logout").post(verifyJwtVendor, logoutUser);
// router.route("/getUser").get(verifyJwtVendor, getCurrentUser);

export default router;
