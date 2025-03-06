import express from "express";
import {
  adminLoginController,
  addCategory,
  deleteSubCategory,
  deleteAllSubCategories,
  deleteCategory,
  updateCategory,
  getAllCategories,
  getSingleCategory,
  getPendingProducts,
  approveProduct,
  rejectProduct,
  getAllProducts,
  deleteProduct,
  getAllVendors,
  approveVendor,
  rejectVendor,
  deleteVendor,
  getAllUsers,
  getUser,
} from "../controllers/admin.controller.js";
import { verifyJwtAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();
//Login route
router.post("/login", adminLoginController);

//Category Routes
router.post(
  "/addCategory",
  verifyJwtAdmin,
  upload.single("image"),
  addCategory
);
router.delete("/deleteCategory/:id", verifyJwtAdmin, deleteCategory);
router.delete("/deleteSubCategory/:id", verifyJwtAdmin, deleteSubCategory);
router.delete(
  "/deleteAllSubCategories/:id",
  verifyJwtAdmin,
  deleteAllSubCategories
);
router.put(
  "/updateCategory/:id",
  verifyJwtAdmin,
  upload.single("image"),
  updateCategory
);
router.get("/getAllCategories", verifyJwtAdmin, getAllCategories);
router.get("/getSingleCategory", verifyJwtAdmin, getSingleCategory);

//Product Routes
router.get("/getPendingProducts", verifyJwtAdmin, getPendingProducts);
router.put("/approveProduct/:productId", verifyJwtAdmin, approveProduct);
router.put("/rejectProduct/:productId", verifyJwtAdmin, rejectProduct);
router.get("/getAllProducts", verifyJwtAdmin, getAllProducts);
router.delete("/deleteProduct/:productId", verifyJwtAdmin, deleteProduct);

//Vendor Routes
router.get("/getAllVendors", verifyJwtAdmin, getAllVendors);
router.put("/approveVendor/:vendorId", verifyJwtAdmin, approveVendor);
router.put("/rejectVendor/:vendorId", verifyJwtAdmin, rejectVendor);
router.delete("/deleteVendor/:vendorId", verifyJwtAdmin, deleteVendor);

//User Routes
router.get("/getAllUsers", verifyJwtAdmin, getAllUsers);
router.get("/getUser/:userId", verifyJwtAdmin, getUser);

export default router;
