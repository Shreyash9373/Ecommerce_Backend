import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { verifyJwtUser } from "../middlewares/user.middleware.js";
import {
  createOrder,
  submitPayment,
  getVendorOrders,
  getVendorOrderByStatus,
  getOrderByStatus,
  updateOrderStatus,
  getUserOrders,
} from "../controllers/order.controller.js";

const router = Router();

router.route("/place-order").post(verifyJwtUser, createOrder);

//Get payment ss
router.route("/submit-payment").post(
  upload.fields([
    {
      name: "paymentProof",
      maxCount: 1,
    },
  ]),
  verifyJwtUser,
  submitPayment
);

router.route("/get-order").get(verifyJwtVendor, getVendorOrders);
router.route("/order-status").get(verifyJwtVendor, getVendorOrderByStatus);
router.route("/get-OrderStatus").get(getOrderByStatus);
router.route("/update-OrderStatus").put(verifyJwtVendor, updateOrderStatus);

router.route("/user-orders").get(verifyJwtUser, getUserOrders);

export default router;
