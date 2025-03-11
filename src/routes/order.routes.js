import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { verifyJwtUser } from "../middlewares/user.middleware.js";
import {
  createOrder,
  getVendorOrders,
} from "../controllers/order.controller.js";

const router = Router();

router.route("/place-order").post(verifyJwtUser, createOrder);
router.route("/get-order").get(verifyJwtVendor, getVendorOrders);

export default router;
