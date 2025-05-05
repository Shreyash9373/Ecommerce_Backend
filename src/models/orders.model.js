import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
      },
    ],
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productSnapshot: {
          name: { type: String, required: true },
          price: { type: Number, required: true },
          vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
          description: { type: String },
          images: [String], // If product has images
          category: { type: String },
        },
        quantity: {
          type: Number,
          required: true,
        },
        version: { type: Number, default: 1 }, // Track if product has changed
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Completed",
      ],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["Credit Card", "UPI", "COD"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
      default: "Pending",
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", OrderSchema);
