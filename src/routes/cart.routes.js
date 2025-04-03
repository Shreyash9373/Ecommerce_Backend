import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtVendor } from "../middlewares/vendor.middleware.js";
import { verifyJwtUser } from "../middlewares/user.middleware.js";
import { addItem } from "../controllers/cart.controller.js";

const router = Router();

router.route("/add-Item").post(verifyJwtUser, addItem);

export default router;
