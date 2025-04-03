import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { verifyJwtUser } from "../middlewares/user.middleware.js";
import {
  addItem,
  getCart,
  updateCartItem,
  removeItem,
} from "../controllers/cart.controller.js";

const router = Router();

router.route("/add-Item").post(verifyJwtUser, addItem);

router.route("/get-Cart").get(verifyJwtUser, getCart);

router.route("/update-itemQuantity").put(verifyJwtUser, updateCartItem);

router.route("/remove-Item").delete(verifyJwtUser, removeItem);

export default router;
