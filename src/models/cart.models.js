import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    totalPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Cart = mongoose.model("Cart", cartSchema);
