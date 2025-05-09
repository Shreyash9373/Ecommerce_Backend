import QRCode from "qrcode";
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
      // await Product.findByIdAndUpdate(productId, {
      //   $inc: { stock: -quantity },
      // });

      // if (product.stock - quantity < 5) {
      //   const product = await Product.findById(productId);
      //   if (product && product.stock < 5) {
      //     const vendor = await Vendor.findById(product.vendorId);
      //     if (vendor && vendor.email) {
      //       // Send email
      //       await sendLowStockEmail(vendor.email, product.name, product.stock);
      //     }
      //   }
      // }

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
    const paymentStatus = paymentMethod == "COD" ? "Pending" : "Processing";

    const newOrder = await Order.create({
      buyerId,
      vendorId: [...vendorIds],
      items: orderItems,
      totalAmount,
      status: "Processing",
      paymentMethod,
      shippingAddress,
      paymentStatus: paymentStatus,
    });

    if (!newOrder) {
      throw new ApiError(500, " Failed to Place Order");
    }

    // ✅ QR Code Generation (only if UPI payment method selected)
    let qrImage = null;
    if (paymentMethod === "UPI") {
      const vendorIdArray = Array.from(vendorIds); // FIXED
      const vendor = await Vendor.findById(vendorIdArray[0]);

      if (!vendor) {
        throw new ApiError(404, `Vendor not found: ${vendorIdArray[0]}`);
      }

      const upiID = vendor.paymentMethods?.UPI;
      const upiNote = `Order #${newOrder._id}`;
      const upiLink = `upi://pay?pa=${upiID}&pn=Shop&tn=${upiNote}&am=${totalAmount}&cu=INR`;

      qrImage = await QRCode.toDataURL(upiLink);

      // console.log("Vendor details: ", upiID, qrImage);
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, { newOrder, qrImage }, "Order Places Successfully")
      );
  } catch (error) {
    console.log("error ", error);
    res.status(500).json({
      success: false,

      message: `Failed to fetch best products. ${error}`,
    });
  }
});

const submitPayment = asyncHandler(async (req, res) => {
  try {
    const buyerId = req.user._id;
    let { orderId, payment, transactionId } = req.body;

    if (!payment || !orderId) {
      throw new ApiError(400, "Payment amount is empty || Order Id is missing");
    }

    if (!transactionId) {
      transactionId = orderId;
    }

    let paymentproofUrl;
    if (req.files?.paymentProof) {
      const paymentProofLocalPath = Array.isArray(req.files.paymentProof)
        ? req.files.paymentProof[0].path
        : req.files.paymentProof.path;

      if (!paymentProofLocalPath) {
        throw new ApiError(400, "Invalid payment proof file");
      }

      const paymentProofUpload = await uploadCloudinary(paymentProofLocalPath, {
        folder: "Payments",
      });

      paymentproofUrl = paymentProofUpload?.secure_url;
    }

    if (!paymentproofUrl) {
      throw new ApiError(500, "Failed to upload payment proof");
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        "paymentProof.paymentScreenshot": paymentproofUrl,
        "paymentProof.transactionId": transactionId,
      },
      { new: true }
    );

    console.log("Order with payment : ", order);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    // ✅ Loop over items and update stock
    for (const item of order.items) {
      const { productId, quantity } = item;

      // Deduct stock
      const product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: -quantity } },
        { new: true }
      );

      // ✅ If stock falls below threshold, send email
      if (product && product.stock < 5) {
        const vendor = await Vendor.findById(product.vendorId);
        if (vendor && vendor.email) {
          await sendLowStockEmail(vendor.email, product.name, product.stock);
        }
      }
    }

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { order, paymentproofUrl },
          "Payment proof saved and Stock updated Successfully"
        )
      );
  } catch (error) {
    console.error("Error in submitPayment:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while processing the payment.",
    });
  }
});

const getUserOrders = asyncHandler(async (req, res) => {
  const buyerId = req.user._id;

  if (!isValidObjectId(buyerId)) {
    throw new ApiError(400, "Invalid User id");
  }

  const orders = await Order.find({ buyerId })
    .sort({ createdAt: -1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, { orders }, "Orders fetched successfully"));
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

const getVendorOrderByStatus = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { status } = req.query;

  // Use find() to get all products with the given status
  const orders = await Order.find({ status: status, vendorId: vendorId });

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

export {
  createOrder,
  submitPayment,
  getVendorOrders,
  getVendorOrderByStatus,
  getOrderByStatus,
  updateOrderStatus,
  getUserOrders,
};
