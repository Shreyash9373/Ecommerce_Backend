import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { adminModel } from "../models/admin.model.js";
import { category } from "../models/category.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cookieOptions } from "../constants.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { Product } from "../models/products.model.js";

//Token generation function
const genAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await adminModel.findById(userId);

    const accesstoken = user.generateAccessTokens();
    const refreshtoken = user.generateRefreshTokens();

    user.refreshToken = refreshtoken;
    await user.save({ validateBeforeSave: false });

    return { accesstoken, refreshtoken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Refresh and Access Tokens"
    );
  }
};

//Admin login controller
const adminLoginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const admin = await adminModel.findOne({ email });
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  // Validate password
  const isPasswordValid = await admin.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // Generate tokens
  const { accesstoken, refreshtoken } = await genAccessAndRefreshTokens(
    admin._id
  );
  // const accesstoken = await admin.generateAccessTokens();
  // const refreshtoken = await admin.generateRefreshTokens();

  // Set cookies with tokens
  const accessTokenOptions = cookieOptions("access");
  const refreshTokenOptions = cookieOptions("refresh");

  return res
    .status(200)
    .cookie("accessToken", accesstoken, accessTokenOptions)
    .cookie("refreshToken", refreshtoken, refreshTokenOptions)
    .json({
      success: true,
      admin: {
        _id: admin._id,
        email: admin.email,
      },
      accessToken: accesstoken,
      message: "Admin logged in successfully",
    });
});

// •Category controllers

const addCategory = asyncHandler(async (req, res) => {
  const { name, slug, parentCategory, description, image, status } = req.body;

  // Check if the category name or slug already exists
  const existingCategory = await category.findOne({ name });
  if (existingCategory) {
    return res
      .status(400)
      .json({ message: "Category with this name already exists" });
  }

  let imageUrl = "";
  if (req.file) {
    console.log(req.file.path);
    const uploadResponse = await uploadCloudinary(req.file.path, {
      folder: "categories",
    });
    if (!uploadResponse) {
      console.log(uploadResponse);
      return res.status(500).json({ message: "Image upload failed" });
    }
    imageUrl = uploadResponse.secure_url; // Get image URL from Cloudinary response
  }

  // Create a new category
  const newCategory = await category.create({
    name,
    slug: slug || "",
    parentCategory: parentCategory || null, // If parentCategory is provided, it's a subcategory
    description: description || "",
    image: imageUrl || "",
    status: status || "active",
  });

  // Save to database
  // await newCategory.save();

  // return res.status(201).json({ message: "Category added successfully", category: newCategory });
  return res
    .status(201)
    .json(new ApiResponse(201, newCategory, "Category Added Successfully"));
});

const deleteSubCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ApiError(400, "Category id is required");
  }
  const subcategory = await category.findById(id);
  if (!subcategory) {
    return res.status(404).json({ message: "Subcategory not found" });
  }

  // Ensure it's a subcategory
  if (!subcategory.parentCategory) {
    return res.status(400).json({ message: "This is not a subcategory" });
  }

  // Delete subcategory
  await category.findByIdAndDelete(id);
  return res
    .status(200)
    .json(new ApiResponse(200, subcategory, "Subcategory deleted"));
});

const deleteAllSubCategories = asyncHandler(async (req, res) => {
  const { parent_id } = req.params;
  const parentcat = await category.findById(parent_id);
  if (!parentcat) {
    throw new ApiError(404, "Parent category not found");
  }
  const deletedSubCategories = await category.deleteMany({
    parentCategory: parent_id,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedSubCategories, "All subcategories deleted")
    );
});
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Check if the category exists
  const Category = await category.findById(id);
  if (!Category) {
    throw new ApiError(404, "Category not found");
  }
  // If the category has subcategories, prevent deletion
  const subCategories = await Category.find({ parentCategory: id });
  if (subCategories.length > 0) {
    throw new ApiError(400, "Category has subcategories. Delete them first");
  }

  // Delete category
  const deletedCategory = await Category.findByIdAndDelete(id);

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedCategory, "Category deleted successfully")
    );
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, parentCategory, description, status } = req.body;
  let image = req.file?.path;
  const Category = await category.findById(id);
  if (!Category) {
    return res.status(404).json({ message: "Category not found" });
  }

  // Upload new image to Cloudinary if provided
  if (image) {
    // Delete old image from Cloudinary if it exists
    if (Category.image) {
      const publicId = Category.image.split("/").pop().split(".")[0]; // Extract public ID
      await cloudinary.v2.uploader.destroy(publicId); // Delete from Cloudinary
    }
    const uploadResponse = await uploadCloudinary(image);
    image = uploadResponse.secure_url;
  }
  // Category.name = name || Category.name;
  // Category.slug = slug || Category.slug;
  // Category.parentCategory = parentCategory || Category.parentCategory;
  // Category.description = description || Category.description;
  // Category.status = status || Category.status;
  // if (image) Category.image = image; // Update image if changed

  // Save updated category
  const updatedCategory = await category.findByIdAndUpdate(
    id,
    {
      name: name || Category.name,
      slug: slug || Category.slug,
      parentCategory: parentCategory || Category.parentCategory,
      description: description || Category.description,
      status: status || Category.status,
      image: image || Category.image,
    },
    { new: true } // Ensures you get the updated document in response
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedCategory, "Category updated successfully")
    );
});

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await category
    .find({})
    .populate("parentCategory", "name") // Populate only the name of the parent category
    .sort({ createdAt: -1 }); // Sort by newest categories first

  return res
    .status(200)
    .json(
      new ApiResponse(200, categories, "All categories fetched successfully")
    );
});

const getSingleCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params; // Extracting category ID from request params

  const Category = await category.findById(categoryId);

  if (!Category) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, Category, "Category fetched successfully"));
});

//Product controllers

const getPendingProducts = asyncHandler(async (req, res) => {
  const pendingProducts = await Product.find({ status: "pending" }).populate(
    "vendorId",
    "name"
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        pendingProducts,
        "Pending products fetched successfully"
      )
    );
});

const approveProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const upatedProduct = await Product.findByIdAndUpdate(
    productId,
    { status: "approved" },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, upatedProduct, "Product approved successfully"));
});

const rejectProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const upatedProduct = await Product.findByIdAndUpdate(
    productId,
    { status: "rejected" },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, upatedProduct, "Product rejected successfully"));
});

const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({})
    .populate("vendorId", "name email") // Populate vendor details (if applicable)
    .sort({ createdAt: -1 }); // Sort by latest created products

  if (!products.length) {
    throw new ApiError(404, "No products found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, products, "All products fetched successfully"));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const deletedProduct = await Product.findByIdAndDelete(productId);

  res
    .status(200)
    .json(new ApiResponse(200, deletedProduct, "Product deleted successfully"));
});
export {
  adminLoginController,
  addCategory,
  deleteSubCategory,
  deleteAllSubCategories,
  deleteCategory,
  updateCategory,
  getAllCategories,
  getSingleCategory,
  getPendingProducts,
  approveProduct,
  rejectProduct,
  getAllProducts,
  deleteProduct,
};
