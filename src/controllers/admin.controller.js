import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { adminModel } from "../models/admin.model.js";
import { category } from "../models/category.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cookieOptions } from "../constants.js";

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

const addCategory = asyncHandler(async (req, res) => {
  const { name, slug, parentCategory, description, image, status } = req.body;

  // Check if the category name or slug already exists
  const existingCategory = await category.findOne({ name });
  if (existingCategory) {
    return res
      .status(400)
      .json({ message: "Category with this name already exists" });
  }

  // Create a new category
  const newCategory = await category.create({
    name,
    slug: slug || "",
    parentCategory: parentCategory || null, // If parentCategory is provided, it's a subcategory
    description: description || "",
    image: image || "",
    status: status || "active",
  });

  // Save to database
  // await newCategory.save();

  // return res.status(201).json({ message: "Category added successfully", category: newCategory });
  return res
    .status(201)
    .json(new ApiResponse(201, newCategory, "Category Added Successfully"));
});
export { adminLoginController, addCategory };
