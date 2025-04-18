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

    console.log("Data received: ", req.body);

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new ApiError(400, "vendor not found");
    }

    // console.log("vendor: ", vendor._id);

    // Parse attributes, dimensions, and tags if they're received as strings
    const parsedAttributes =
      typeof attributes === "string" ? JSON.parse(attributes) : attributes;
    const parsedDimensions =
      typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions;
    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;

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

    if (product) {
      const addProductinVendor = await Vendor.findByIdAndUpdate(
        vendor._id,
        { $push: { products: product._id } },
        { new: true }
      );
    }

    if (!product) {
      throw new ApiError(500, "Failed to add product");
    }

    if (!addProductinVendor) {
      throw new ApiError(500, "Failed to add product in Vendor");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, product, "Product added successfully"));
  } catch (error) {
    console.log("error: ", error);
    throw new ApiError(400, error, "Error while adding Product");
  }
});

const getAllVendorProducts = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  try {
    const products = await Product.find({ vendorId }); // Query products by vendorId
    if (!products) {
      throw new ApiError(400, "Failed to fetch Products");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, products, "Products fetched successfully!"));
  } catch (error) {
    throw new ApiError(500, error.message + "Error while fetching products");
  }
});

const getAllApprovedProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({ status: "approved" }); // Query products by vendorId
    if (!products) {
      throw new ApiError(400, "Failed to fetch Products");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, products, "Products fetched successfully!"));
  } catch (error) {
    throw new ApiError(500, error.message + "Error while fetching products");
  }
});

const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  //TODO: get product by id
  if (!isValidObjectId(productId)) {
    throw new ApiError(400, "Invalid Product id");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { product }, "Product fetched successfully"));
});

const deleteProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  //TODO: get product by id
  if (!isValidObjectId(productId)) {
    throw new ApiError(400, "Invalid Product id");
  }

  const product = await Product.findByIdAndDelete(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { product }, "Product deleted successfully"));
});

const updateProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    console.log("Error in updateProductById :: cannot find productId");
    throw new ApiError(400, "Failer to get productId");
  }

  try {
    const updateData = req.body;

    let parsedAttributes;
    let parsedDimensions;
    let parsedTags;
    // Parse attributes safely
    if (updateData.attributes) {
      parsedAttributes =
        typeof updateData.attributes === "string"
          ? JSON.parse(updateData.attributes)
          : updateData.attributes;
    }

    // Parse dimensions safely
    if (updateData.dimensions) {
      parsedDimensions =
        typeof updateData.dimensions === "string"
          ? JSON.parse(updateData.dimensions)
          : updateData.dimensions;
    }

    // Parse tags safely
    if (updateData.tags) {
      parsedTags =
        typeof updateData.tags === "string"
          ? JSON.parse(updateData.tags)
          : updateData.tags;
    }

    if (parsedAttributes) {
      updateData.attributes = parsedAttributes;
    }

    if (parsedDimensions) {
      updateData.dimensions = parsedDimensions;
    }

    if (parsedTags) {
      updateData.tags = parsedTags;
    }

    // console.log("Req.body : ", updateData);

    let uploadedImages = [];

    if (req.files) {
      // Upload product images (Multiple Files)
      if (req.files.images) {
        const imagesFiles = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images]; // Ensure it's always an array

        uploadedImages = await Promise.all(
          imagesFiles.map(async (img) => {
            const result = await uploadCloudinary(img.path, {
              folder: "products",
            });
            return result.secure_url;
          })
        );
      }
      updateData.images = uploadedImages;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      console.log(
        "Error in updateProductById :: updatedProduct return error",
        updatedProduct
      );

      throw new ApiError(404, "Product not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedProduct, "Product updated successfully")
      );
  } catch (error) {
    console.log("Error in updateProductById :: error ", error);
    throw new ApiError(500, error.message || "Failed to update product");
  }
});

const searchProducts = asyncHandler(async (req, res) => {
  let {
    search,
    category,
    minPrice,
    maxPrice,
    sortBy,
    limit = 10,
    page = 1,
  } = req.query;
  const query = {};

  // Search by name OR category (case-insensitive)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
      { subCategory: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by price range
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Sorting options
  let sortOptions = {};
  if (sortBy === "priceAsc") sortOptions.price = 1;
  if (sortBy === "priceDesc") sortOptions.price = -1;
  if (sortBy === "newest") sortOptions.createdAt = -1;

  limit = parseInt(limit);
  page = parseInt(page);
  const skip = (page - 1) * limit;

  // Fetch products
  const products = await Product.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  // Get total product count
  const totalProducts = await Product.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalProducts,
        page,
        totalPages: Math.ceil(totalProducts / limit),
        products,
      },
      "Products fetched successfully"
    )
  );
});

export {
  addProduct,
  getAllVendorProducts,
  getProductById,
  deleteProductById,
  updateProductById,
  getAllApprovedProducts,
  searchProducts,
};
