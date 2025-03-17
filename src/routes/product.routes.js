import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import {
  addProduct,
  getAllVendorProducts,
  getProductById,
  deleteProductById,
  updateProductById,
  getAllApprovedProducts,
} from "../controllers/products.controller.js";
import { verifyJwtUser } from "../middlewares/user.middleware.js";
import verifyJwtVendorOrAdmin from "../middlewares/adminorvendor.middleware.js";

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
router.route("/getAll-Products").get(verifyJwtVendor, getAllVendorProducts);
router.route("/get-product/:productId").get(getProductById);

// Open route to get products for showing in main site
router.route("/get-approvedProducts").get(getAllApprovedProducts);

router
  .route("/delete-product/:productId")
  .delete(verifyJwtVendor, deleteProductById);

export default router;
