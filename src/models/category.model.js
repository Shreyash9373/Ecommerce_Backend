import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      // default: "67caca5fd5f5049461868e27", // NULL means it's a main category
      default: null,
    },
    description: {
      type: String,
    },
    image: {
      type: String, // Store image URL or file path
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const category = mongoose.model("Category", categorySchema);
