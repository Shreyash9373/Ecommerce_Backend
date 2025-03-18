import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { adminModel } from "../models/admin.model.js";
import { category } from "../models/category.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cookieOptions } from "../constants.js";
import { uploadCloudinary, deleteInCloudinary } from "../utils/cloudinary.js";
import { Product } from "../models/products.model.js";
import { v2 as cloudinary } from "cloudinary";
import { Vendor } from "../models/vendor.model.js";
import { User } from "../models/users.model.js";
import sendEmail from "../utils/sendEmail.js";

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

//logout Admin
const logoutAdmin = asyncHandler(async (req, res) => {
  const adminId = req.user._id;

  await adminModel.findByIdAndUpdate(
    adminId,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  // Set cookies with tokens
  const accessTokenOptions = cookieOptions("access");
  const refreshTokenOptions = cookieOptions("refresh");

  return res
    .status(200)
    .clearCookie("accessToken", accessTokenOptions)
    .clearCookie("refreshToken", refreshTokenOptions)
    .json(new ApiResponse(200, {}, "Admin Logout Successfull"));
});

// •Category controllers

const addCategory = asyncHandler(async (req, res) => {
  const { name, slug, parentCategory, description, status } = req.body;
  console.log("Req.body: ", req.body);
  if (parentCategory == null) {
    parentCategory = "";
  }
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
  const { id } = req.params;
  const parentcat = await category.findById(id);
  if (!parentcat) {
    throw new ApiError(404, "Parent category not found");
  }
  const deletedSubCategories = await category.deleteMany({
    parentCategory: id,
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
  const subCategories = await category.find({ parentCategory: id });
  if (subCategories.length > 0) {
    throw new ApiError(400, "Category has subcategories. Delete them first");
  }

  // Delete category
  const deletedCategory = await category.findByIdAndDelete(id);

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedCategory, "Category deleted successfully")
    );
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  console.log("Updated Data", updatedData);
  let image = req.file?.path;
  if (
    updatedData.parentCategory == "null" ||
    updatedData.parentCategory == ""
  ) {
    updatedData.parentCategory = null;
  }
  const Category = await category.findById(id);
  if (!Category) {
    return res.status(404).json({ message: "Category not found" });
  }
  if (updatedData.slug) {
    const existingCategory = await category.findOne({ slug: updatedData.slug });
    if (existingCategory && existingCategory._id.toString() !== id) {
      return res
        .status(400)
        .json({ message: "Slug already exists. Choose a different slug." });
    }
  }

  // Upload new image to Cloudinary if provided
  if (image) {
    console.log("Image path: ", image);
    // Delete old image from Cloudinary if it exists
    if (Category.image) {
      console.log("Old image: ", Category.image);
      const publicId = Category.image.split("/").pop().split(".")[0]; // Extract public ID
      console.log("Public ID: ", publicId);
      //await cloudinary.v2.uploader.destroy(publicId); // Delete from Cloudinary
      const deletedResponse = await deleteInCloudinary(Category.image);
      console.log("deletedres", deletedResponse);
    }
    const uploadResponse = await uploadCloudinary(image);
    image = uploadResponse.secure_url;
  }

  // Save updated category
  updatedData.image = image;
  const updatedCategory = await category.findByIdAndUpdate(
    id,
    { $set: updatedData },
    { new: true, runValidators: false } // Ensures you get the updated document in response
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

const getPendingVendors = asyncHandler(async (req, res) => {
  try {
    const pendingVendors = await Vendor.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      count: pendingVendors.length,
      data: pendingVendors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

const getApprovedVendors = asyncHandler(async (req, res) => {
  try {
    const approvedVendors = await Vendor.find({ status: "approved" }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      count: approvedVendors.length,
      data: approvedVendors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

const getRejectedVendors = asyncHandler(async (req, res) => {
  try {
    const rejectedVendors = await Vendor.find({ status: "rejected" }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      count: rejectedVendors.length,
      data: rejectedVendors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
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
const getApprovedProducts = asyncHandler(async (req, res) => {
  const approvedProducts = await Product.find({ status: "approved" }).populate(
    "vendorId",
    "name"
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        approvedProducts,
        "Approved products fetched successfully"
      )
    );
});
const getRejectedProducts = asyncHandler(async (req, res) => {
  const rejectedProducts = await Product.find({ status: "rejected" }).populate(
    "vendorId",
    "name"
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        rejectedProducts,
        "Rejected products fetched successfully"
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

//Vendor Controllers
const getAllVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find({}).sort({ createdAt: -1 });
  if (!vendors.length) {
    throw new ApiError(404, "No vendors found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, vendors, "All vendors fetched successfully"));
});

const approveVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  const vendor = await Vendor.findById(vendorId);
  if (vendor.status === "approved") {
    return res
      .status(404)
      .json(new ApiResponse(404, vendor, "Vendor is already approved"));
  }
  const upatedVendor = await Vendor.findByIdAndUpdate(
    vendorId,
    { status: "approved" },
    { new: true }
  );

  const loginLink = `${process.env.FRONTEND_URL}/login`;
  const message = `Congratulations ${upatedVendor.name},\n\nYour vendor account has been approved. You can now login to your vendor dashboard using the link below:\n\n${loginLink}\n\nBest regards,\nEcommerce Team`;

  await sendEmail(upatedVendor.email, "Vendor Account Approved", message);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        upatedVendor,
        "Vendor approved successfully and mail sent"
      )
    );
});
const rejectVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const vendor = await Vendor.findById(vendorId);
  if (vendor.status === "rejected") {
    return res
      .status(404)
      .json(new ApiResponse(404, vendor, "Vendor is already rejected"));
  }

  const upatedVendor = await Vendor.findByIdAndUpdate(
    vendorId,
    { status: "rejected" },
    { new: true }
  );

  const message = `Sorry, ${upatedVendor.name},\n\nYour vendor account has been rejected. Please register again.\n\nBest regards,\nEcommerce Team`;

  await sendEmail(upatedVendor.email, "Vendor Account Rejected", message);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        upatedVendor,
        "Vendor rejected successfully and email sent"
      )
    );
});

const deleteVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  const deletedVendor = await Vendor.findByIdAndDelete(vendorId);

  res
    .status(200)
    .json(new ApiResponse(200, deletedVendor, "Vendor deleted successfully"));
});

//User controllers

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  if (!users.length) {
    throw new ApiError(404, "No users found");
  }
  return res
    .status(200)
    .json(newApiResponse(200, users, "All users fetched successfully"));
});

const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

export {
  adminLoginController,
  logoutAdmin,
  addCategory,
  deleteSubCategory,
  deleteAllSubCategories,
  deleteCategory,
  updateCategory,
  getAllCategories,
  getSingleCategory,
  getPendingProducts,
  getApprovedProducts,
  getRejectedProducts,
  approveProduct,
  rejectProduct,
  getAllProducts,
  deleteProduct,
  getAllVendors,
  approveVendor,
  rejectVendor,
  deleteVendor,
  getAllUsers,
  getUser,
  getPendingVendors,
  getRejectedVendors,
  getApprovedVendors,
};
