import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { Vendor } from "../models/vendor.model.js";
import { Product } from "../models/products.model.js";

const addProduct = asyncHandler(async (req, res) => {
  try {
    const vendorId = req.user._id; // Extracted from auth middleware
    const {
      name,
      description,
      category,
      subCategory,
      brand,
      attributes,
      price,
      discount,
      stock,
      weight,
      dimensions,
      tags,
    } = req.body;

    // console.log("Data received: ", req.body);

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new ApiError(400, "vendor not found");
    }

    // console.log("vendor: ", vendor._id);

    if (
      [name, description, category, attributes, price, discount, stock].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(400, "All fields are required");
    }

    // Ensure attributes, dimensions, and tags are properly parsed
    let parsedAttributes, parsedDimensions, parsedTags;
    try {
      parsedAttributes = attributes ? JSON.parse(attributes) : null;
      parsedDimensions = dimensions ? JSON.parse(dimensions) : null;
      parsedTags = tags ? JSON.parse(tags) : [];
    } catch (parseError) {
      throw new ApiError(
        400,
        "Invalid JSON format in attributes/dimensions/tags"
      );
    }

    // console.log("Parsed attributes: ", parsedAttributes);
    // console.log("Parsed dimensions: ", parsedDimensions);
    // console.log("Parsed tags: ", parsedTags);

    // Calculate final price (price after discount)
    const finalPrice = discount
      ? (price - (price * discount) / 100).toFixed(2) // Two decimal places
      : price;

    console.log(
      `Original Price: ${price}, Discount: ${discount}%, Final Price: ${finalPrice}`
    );

    // Check if files exist
    let uploadedImages = [];
    if (req.files && req.files.images) {
      const imageFiles = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images]; // Ensure it's always an array

      console.log("Images array: ", req.files.images);
      // Upload all images to Cloudinary in parallel
      uploadedImages = await Promise.all(
        imageFiles.map(async (image) => {
          const result = await uploadCloudinary(image.path, {
            folder: "products",
          });
          return result.secure_url;
        })
      );
    }
    // console.log("Images uploaded: ", uploadedImages);

    // Create product
    const product = await Product.create({
      name,
      description,
      category,
      subCategory: subCategory || null,
      brand: brand || null,
      attributes: parsedAttributes,
      price,
      discount: discount || 0,
      finalPrice,
      stock,
      storeName: vendor.storeName,
      vendorId: vendor._id,
      images: uploadedImages,
      weight: weight || 0,
      dimensions: parsedDimensions,
      tags: parsedTags,
    });

    if (!product) {
      throw new ApiError(500, "Failed to add product");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, product, "Product added successfully"));
  } catch (error) {
    console.log("error: ", error);
    throw new ApiError(400, "Error while adding Product");
  }
});

export { addProduct };
