import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { verifyJwtUser } from "../middlewares/vendor.middleware.js";
import { createOrder } from "../controllers/order.controller.js";

const router = Router();

router.route("/place-order").post(verifyJwtUser, createOrder);

export default router;
