import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },

    storeName: {
      type: String,
      required: true,
      unique: true,
    },
    storeDescription: {
      type: String,
    },
    businessType: {
      type: String,
      enum: ["individual", "company"],
      required: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },

    verificationDocuments: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "pending",
    },

    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    totalOrders: { type: Number, default: 0 },
    pendingOrders: { type: Number, default: 0 },

    balance: { type: Number, default: 0 },
    withdrawableBalance: { type: Number, default: 0 },
    paymentMethods: {
      stripe: { type: String },
      paypal: { type: String },
      bankAccount: {
        accountName: String,
        accountNumber: String,
        bankName: String,
        ifscCode: String,
      },
    },

    totalSales: { type: Number, default: 0 },
    monthlySales: { type: Map, of: Number },
    customerCount: { type: Number, default: 0 },

    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Vendor", VendorSchema);
