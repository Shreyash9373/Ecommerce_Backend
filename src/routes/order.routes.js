import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { verifyJwtUser } from "../middlewares/user.middleware.js";
import {
  createOrder,
  getVendorOrders,
  getVendorOrderByStatus,
  getOrderByStatus,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const router = Router();

router.route("/place-order").post(verifyJwtUser, createOrder);
router.route("/get-order").get(verifyJwtVendor, getVendorOrders);
router.route("/order-status").get(verifyJwtVendor, getVendorOrderByStatus);
router.route("/get-OrderStatus").get(getOrderByStatus);
router.route("/update-OrderStatus").put(verifyJwtVendor, updateOrderStatus);

export default router;
