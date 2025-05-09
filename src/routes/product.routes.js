import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addProduct,
  getAllVendorProducts,
  getProductById,
  deleteProductById,
  updateProductById,
  getAllApprovedProducts,
  searchProducts,
  getCategories,
  getSubCategories,
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

router.route("/search-products").get(searchProducts);

// Open route to get products for showing in main site
router.route("/get-approvedProducts").get(getAllApprovedProducts);

router
  .route("/delete-product/:productId")
  .delete(verifyJwtVendor, deleteProductById);

router.route("/categories").get(getCategories);
router.route("/subcategories").get(getSubCategories);

export default router;
