import express from "express";
import {
  adminLoginController,
  addCategory,
} from "../controllers/admin.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();
router.post("/login", adminLoginController);
router.post("/addCategory", upload.single("image"), addCategory);

export default router;
