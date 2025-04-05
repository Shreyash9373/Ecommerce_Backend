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
  getApprovedProducts,
  getRejectedProducts,
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
  getPendingVendors,
  getApprovedVendors,
  getRejectedVendors,
  logoutAdmin,
  resetPassword,
  getSearchVendor,
  sendOtp,
  verifyOtp,
  checkAuth,
} from "../controllers/admin.controller.js";
import { verifyJwtAdmin } from "../middlewares/admin.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

//Authentication Route
router.get("/checkAuth", checkAuth); //Check if accessToken is present or not

//Login route
router.post("/login", adminLoginController);
router.post("/logout", verifyJwtAdmin, logoutAdmin);

router.post("/reset-password", resetPassword);

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
router.get("/getAllCategories", getAllCategories);
router.get("/getSingleCategory", verifyJwtAdmin, getSingleCategory);

//Product Routes
router.get("/getPendingProducts", verifyJwtAdmin, getPendingProducts);
router.get("/getApprovedProducts", verifyJwtAdmin, getApprovedProducts);
router.get("/getRejectedProducts", verifyJwtAdmin, getRejectedProducts);
router.put("/approveProduct/:productId", verifyJwtAdmin, approveProduct);
router.put("/rejectProduct/:productId", verifyJwtAdmin, rejectProduct);
router.get("/getAllProducts", verifyJwtAdmin, getAllProducts);
router.delete("/deleteProduct/:productId", verifyJwtAdmin, deleteProduct);

//Vendor Routes
router.get("/getAllVendors", verifyJwtAdmin, getAllVendors);
router.get("/getPendingVendors", verifyJwtAdmin, getPendingVendors);
router.get("/getApprovedVendors", verifyJwtAdmin, getApprovedVendors);
router.get("/getRejectedVendors", verifyJwtAdmin, getRejectedVendors);

router.put("/approveVendor/:vendorId", verifyJwtAdmin, approveVendor);
router.put("/rejectVendor/:vendorId", verifyJwtAdmin, rejectVendor);
router.delete("/deleteVendor/:vendorId", verifyJwtAdmin, deleteVendor);
router.get("/getSearchVendor/", verifyJwtAdmin, getSearchVendor);

//User Routes
router.get("/getAllUsers", verifyJwtAdmin, getAllUsers);
router.get("/getUser/:userId", verifyJwtAdmin, getUser);

//Email Authentication Routes for forgot password
router.post("/sendOtp", sendOtp);
router.post("/verifyOtp", verifyOtp);

export default router;
