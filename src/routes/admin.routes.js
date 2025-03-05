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
  "/deleteAllSubCategories",
  verifyJwtAdmin,
  deleteAllSubCategories
);
router.put("/updateCategory/:id", verifyJwtAdmin, updateCategory);
router.get("/getAllCategories", verifyJwtAdmin, getAllCategories);
router.get("/getSingleCategory", verifyJwtAdmin, getSingleCategory);

//Product Routes
router.get("/getPendingProducts", verifyJwtAdmin, getPendingProducts);
router.put("/approveProduct/:productId", verifyJwtAdmin, approveProduct);
router.put("/rejectProduct/:productId", verifyJwtAdmin, rejectProduct);
router.get("/getAllProducts", verifyJwtAdmin, getAllProducts);
router.delete("/deleteProduct/:productId", verifyJwtAdmin, deleteProduct);

export default router;
