import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { cookieOptions } from "../constants.js";
import { User } from "../models/users.model.js";

const genAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accesstoken = vendor.generateAccessTokens();
    const refreshtoken = vendor.generateRefreshTokens();

    User.refreshToken = refreshtoken;
    await user.save({ validateBeforeSave: false });

    return { accesstoken, refreshtoken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Refresh and Access Tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if ([email, password, email, phone].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "User already exists with this email or username");
  }

  let avatarLocalPath;
  let avatar;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  if (avatarLocalPath) {
    avatar = await uploadCloudinary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(500, "Failed to upload avatar image to Cloudinary");
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    avatar,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, " Failed to create User");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, createdUser, "User created successful;y"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  const { accesstoken, refreshtoken } = await genAccessAndRefreshTokens(
    user._id
  );

  user.refreshToken = refreshtoken;

  const newUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const accessTokenOptions = cookieOptions("access");
  const refreshTokenOptions = cookieOptions("refresh");

  return res
    .status(200)
    .cookie("accessToken", accesstoken, accessTokenOptions)
    .cookie("refreshToken", refreshtoken, refreshTokenOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: newUser,
          accesstoken,
          refreshtoken,
        },
        "User logged-in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // get User from cookies
  // clear cookies of user

  const userId = req.user._id;

  await User.findByIdAndUpdate(
    userId,
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
    .json(new ApiResponse(200, {}, "User Logout Successfull"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user) {
    return res
      .status(200)
      .json(new ApiResponse(200, user, "Current Vendor Fetched Successfully"));
  } else {
    throw new ApiError(400, "Failed to fetch Vendor");
  }
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(400, "Failer to get User Id");
  }

  try {
    const updateData = req.body;

    let avatarUrl;

    if (req.files) {
      // Upload Avatar (Single Image)
      if (req.files.avatar) {
        const avatarLocalPath = Array.isArray(req.files.avatar)
          ? req.files.avatar[0].path
          : req.files.avatar.path;
        const avatarUpload = await uploadCloudinary(avatarLocalPath, {
          folder: "avatars",
        });
        avatarUrl = avatarUpload.secure_url;
      }
    }

    updateData.avatar = avatarUrl;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "User updated successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to update vendor details");
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserDetails,
};
