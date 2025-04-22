import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { Vendor } from "../models/vendor.model.js";
import { Order } from "../models/orders.model.js";
import { Product } from "../models/products.model.js";
import { User } from "../models/users.model.js";
import { sendLowStockEmail } from "../utils/sendEmail.js";

const createOrder = asyncHandler(async (req, res) => {
  try {
    const buyerId = req.user._id;
    const { cartItems, paymentMethod, shippingAddress } = req.body;

    if (!cartItems || cartItems.length === 0) {
      throw new ApiError(404, "Cart is empty");
    }

    let totalAmount = 0;
    let vendorIds = new Set();
    let orderItems = [];

    for (const { productId, quantity } of cartItems) {
      const product = await Product.findById(productId).lean();
      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      // ✅ Check if enough stock
      if (product.stock < quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      // ✅ Deduct stock
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: -quantity },
      });

      if (product.stock - quantity < 5) {
        const product = await Product.findById(productId);
        if (product && product.stock < 5) {
          const vendor = await Vendor.findById(product.vendorId);
          if (vendor && vendor.email) {
            // Send email
            await sendLowStockEmail(vendor.email, product.name, product.stock);
            await Notification.create({
              message: `Low stock alert: "${product.name}" has only ${product.stock} items left. Email sent to ${vendor.email}`,
              type: "stock",
            });
            if (req.io) {
              req.io.emit("newNotification", {
                message: `Low stock alert: "${product.name}" has only ${product.stock} items left.`,
                type: "stock",
                createdAt: new Date(),
              });
            }
          }
        }
      }

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

const getVendorOrders = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  //TODO: get product by id
  if (!isValidObjectId(vendorId)) {
    throw new ApiError(400, "Invalid Vendor id");
  }

  const orders = await Order.find({ vendorId: vendorId });
  if (!orders) {
    throw new ApiError(404, "Vendor not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { orders }, "Vendor details fetched successfully")
    );
});

const getOrderByStatus = asyncHandler(async (req, res) => {
  const { status } = req.query;

  // Use find() to get all products with the given status
  const orders = await Order.find({ status });

  if (!orders) {
    throw new ApiError(404, "No orders found with this status");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { orders }, "Orders fetched successfully"));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id, status } = req.body;

  if (!id || !status) {
    throw new ApiError(400, "Order ID and status are required");
  }
  const order = await Order.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated"));
});

export { createOrder, getVendorOrders, getOrderByStatus, updateOrderStatus };
