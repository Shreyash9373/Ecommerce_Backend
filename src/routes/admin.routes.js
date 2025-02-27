import express from "express";
import { adminLoginController } from "../controllers/admin.controller.js";

const router = express.Router();
router.post("/login", adminLoginController);

export default router;
