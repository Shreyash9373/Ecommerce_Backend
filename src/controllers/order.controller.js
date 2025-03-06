import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { Vendor } from "../models/vendor.model.js";
import { Order } from "../models/orders.model.js";
import { Product } from "../models/products.model.js";
import { User } from "../models/users.model.js";

const createOrder = asyncHandler(async (req, res) => {
  try {
    const buyerId = req.user._id;
    const { cartItems, paymentMethod, shippingAddress } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let totalAmount = 0;
    let vendorIds = new Set();
    let orderItems = [];

    for (const { productId, quantity } of cartItems) {
      const product = await Product.findById(productId).lean();
      if (!product)
        return res
          .status(404)
          .json({ message: `Product not found: ${productId}` });

      // Store full product details in order
      orderItems.push({
        productId: product._id,
        productSnapshot: {
          name: product.name,
          price: product.price,
          vendorId: product.vendorId,
          description: product.description,
          images: product.images || [],
          category: product.category,
        },
        quantity,
        version: 1,
      });

      totalAmount += product.price * quantity;
      vendorIds.add(product.vendorId.toString());
    }
    const paymentStatus =
      paymentMethod == "Cash on Delivery" ? "Pending" : "Paid";

    const newOrder = await Order.create({
      buyerId,
      vendorId: [...vendorIds],
      items: orderItems,
      totalAmount,
      status: "Processing",
      paymentMethod,
      shippingAddress,
      paymentStatus,
    });

    if (!newOrder) {
      throw new ApiError(500, " Failed to Place Order");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, newOrder, "Order Places Successfully"));
  } catch (error) {
    next(new ApiError(400, "Error while placing order"));
  }
});

export { createOrder };
