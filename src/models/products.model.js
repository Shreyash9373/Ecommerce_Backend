import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
    },
    brand: {
      type: String,
    },

    // Dynamic attributes set by the vendor
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // Allows different data types (string, number, etc.)
    },

    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
    sold: {
      type: Number,
      default: 0,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    storeName: {
      type: String,
      required: true,
    },

    images: [
      {
        type: String,
        required: true,
      },
    ],
    video: {
      type: String,
    },

    weight: {
      type: Number,
    },
    dimensions: {
      height: { type: Number },
      width: { type: Number },
      depth: { type: Number },
    },
    shippingOptions: [
      {
        type: String,
      },
    ], // e.g., ["standard", "express"]

    averageRating: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "out-of-stock"],
      default: "pending",
    },
    tags: [{ type: String }],
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", ProductSchema);
