import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { cookieOptions } from "../constants.js";
import { Vendor } from "../models/vendor.model.js";

const genAccessAndRefreshTokens = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    const accesstoken = vendor.generateAccessTokens();
    const refreshtoken = vendor.generateRefreshTokens();

    vendor.refreshToken = refreshtoken;
    await vendor.save({ validateBeforeSave: false });

    return { accesstoken, refreshtoken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Refresh and Access Tokens"
    );
  }
};

const registerVendor = asyncHandler(async (req, res) => {
  const { email, password, name, phone, storeName, businessType } = req.body;

  //   console.log(
  //     "Req.body: ",
  //     "email : ",
  //     email,
  //     "password : ",
  //     password,
  //     "name : ",
  //     name,
  //     "phone : ",
  //     phone,
  //     "storeName : ",
  //     storeName,
  //     "businessType : ",
  //     businessType
  //   );

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  if ([email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existingVendor = await Vendor.findOne({ email });

  if (existingVendor) {
    throw new ApiError(
      409,
      "Vendor already exists with this email or username"
    );
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

  const vendor = await Vendor.create({
    email,
    password,
    avatar: avatar?.url,
    name,
    phone,
    storeName,
    businessType,
  });

  const createdVendor = await Vendor.findById(vendor._id).select(
    "-password -refreshToken"
  );

  if (!createdVendor) {
    throw new ApiError(500, "Failed to create vendor");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdVendor, "Vendor created successfully"));
});

const loginVendor = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log("Req.body : ", "email: ", email, "password: ", password);

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const vendor = await Vendor.findOne({ email });

  if (!vendor) {
    throw new ApiError(404, "Vendor does not exist");
  }

  const isPasswordValid = await vendor.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Vendor Credentials");
  }

  const { accesstoken, refreshtoken } = await genAccessAndRefreshTokens(
    vendor._id
  );

  vendor.refreshToken = refreshtoken;

  console.log(vendor); // check for refreshToken in user

  // Set cookies with tokens
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
          vendor: vendor,
          accesstoken,
          refreshtoken,
        },
        "Vendor logged-in successfully"
      )
    );
});

export { registerVendor, loginVendor };
