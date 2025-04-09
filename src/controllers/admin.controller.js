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
import { Order } from "../models/orders.model.js";
import { User } from "../models/users.model.js";
import { sendEmail, sendOtpEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import axios from "axios";

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

//Admin authentication controller to check if accessToken is present or not
const checkAuth = asyncHandler(async (req, res) => {
  const accessToken = req.cookies.accessToken; // Access token from HttpOnly cookie
  if (accessToken) {
    return res.json({ isAuthenticated: true });
  }
  return res.json({ isAuthenticated: false });
});

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

//Admin Password Reset
const resetPassword = asyncHandler(async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (!email || !password || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Password and Confirm Password do not match");
  }

  const admin = await adminModel.findOne({ email });

  if (!admin) {
    throw new ApiError(404, "Admin does not exist");
  }

  // Set new password & save (Triggers pre-save hashing)
  admin.password = password;
  await admin.save();

  // Remove sensitive fields before sending response
  const sanitizedVendor = {
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    createdAt: admin.createdAt,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, sanitizedVendor, "Password Changed Successfully")
    );
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

const getSearchVendor = asyncHandler(async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query; // ✅ Add search, pagination

    const query = {};

    // If search is provided, filter vendors by name, email, or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // Case-insensitive search
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Implement Pagination
    const vendors = await Vendor.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalVendors = await Vendor.countDocuments(query);

    res.status(200).json({
      success: true,
      totalVendors,
      totalPages: Math.ceil(totalVendors / limit),
      vendors,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

//User controllers

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  if (!users.length) {
    throw new ApiError(404, "No users found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, users, "All users fetched successfully"));
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

const otpStorage = {};
const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return new ApiError(404, "Email is required");
  }

  const otp = Math.floor(1000 + Math.random() * 900000).toString();
  otpStorage[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };
  try {
    await sendOtpEmail(email, otp);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Otp send successfully"));
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to send otp"));
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!otpStorage[email]) {
    return res.status(400).json({ error: "OTP expired or invalid" });
  }

  const storedOtp = otpStorage[email].otp;
  const expiresAt = otpStorage[email].expiresAt;

  if (Date.now() > expiresAt) {
    delete otpStorage[email];
    return res.status(400).json({ error: "OTP expired" });
  }

  if (storedOtp !== otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  delete otpStorage[email];
  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  return res
    .status(200)
    .cookie("resetToken", token)
    .json({ success: true, token, message: "Otp verified successfully" });
});

//Chatbot controller
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import fs from "node:fs";
import mime from "mime-types";

const handleChatRequest = asyncHandler(async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const userQuery = req.body.query;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });
  const prompt = `You are a helpful assistant for an ecommerce admin dashboard. 
        Identify the user's intent from the following query based on these possible actions:
        - show pending products
        - show approved products
        - show rejected products
        - show pending vendors
        - show approved vendors
        - show rejected vendors
        - show out-of-stock products
        - create a new product
        - edit product with ID [product_id]
        - show recent orders
        - search for orders by customer [customer_name]
        - update inventory for product [product_sku]
        - show user statistics
        - help with [specific_feature]

         If the user's query is **ambiguous** (e.g., "show approved" or "show rejected") and it's not clear whether they are referring to products or vendors, respond with:
{
  "intent": "clarify",
  "message": "Do you want to see approved products or approved vendors?"
}

        If the intent matches one of these actions, respond with a JSON object in the format:
        { "intent": "[identified_intent]", "parameters": { ... }, "message": "[user-friendly message]" }

        If the intent is outside the scope of these actions, respond with:
        { "intent": "unknown", "message": "Sorry, I can only help with tasks related to the admin dashboard." }

        User query: "${userQuery}"`;
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 100,
    responseModalities: [],
    responseMimeType: "text/plain",
  };

  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  const result = await model.generateContent(prompt);
  console.log("Result", result.response);
  const responseText = result.response?.text();
  console.log("ResponseText", responseText);
  const cleanText = responseText
    .replace(/```json\s*/, "") // remove ```json (with optional whitespace)
    .replace(/```/, "") // remove closing ```
    .trim();
  console.log("Cleantext", cleanText);
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(cleanText);
    console.log("ParesedResponse", parsedResponse);
  } catch (error) {
    console.log("ParesedResponse", parsedResponse);

    console.error("Error parsing Gemini response:", error, responseText);
    parsedResponse = {
      intent: "error",
      message: "Sorry, I encountered an error processing your request.",
    };
  }
  // const chatResponse = await chatSession.sendMessage(userQuery);
  // TODO: Following code needs to be updated for client-side apps.
  const candidates = result.response.candidates;
  // for (
  //   let candidate_index = 0;
  //   candidate_index < candidates.length;
  //   candidate_index++
  // ) {
  //   for (
  //     let part_index = 0;
  //     part_index < candidates[candidate_index].content.parts.length;
  //     part_index++
  //   ) {
  //     const part = candidates[candidate_index].content.parts[part_index];
  //     if (part.inlineData) {
  //       try {
  //         const filename = `output_${candidate_index}_${part_index}.${mime.extension(part.inlineData.mimeType)}`;
  //         fs.writeFileSync(
  //           filename,
  //           Buffer.from(part.inlineData.data, "base64")
  //         );
  //         console.log(`Output written to: ${filename}`);
  //       } catch (err) {
  //         console.error(err);
  //       }
  //     }
  //   }
  // }
  // console.log(chatResponse.response.text());

  // return res.status(200).json({ response: result.response.text() });
  return res.status(200).json({ response: parsedResponse });
});

const getTopSellingProducts = asyncHandler(async (req, res) => {
  const { range } = req.query; // 'week' or 'month'

  let startDate;
  const today = new Date();

  if (range === "week") {
    startDate = new Date(today.setDate(today.getDate() - 7));
  } else if (range === "month") {
    startDate = new Date(today.setMonth(today.getMonth() - 1));
  } else {
    return res.status(400).json({ message: "Invalid range" });
  }

  const topProducts = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $in: ["Delivered", "Completed"] }, // only completed orders
      },
    },
    { $unwind: "$items" }, // deconstruct the array of items
    {
      $group: {
        _id: "$items.productId",
        totalSold: { $sum: "$items.quantity" },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $project: {
        _id: 0,
        productId: "$productInfo._id",
        name: "$productInfo.name",
        totalSold: 1,
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
  ]);

  res.status(200).json({ topProducts });
});

export {
  checkAuth,
  getTopSellingProducts,
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
  getSearchVendor,
  resetPassword,
  sendOtp,
  verifyOtp,
  handleChatRequest,
};
