//user.contrroller
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

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accesstoken, options)
    .cookie("refreshToken", refreshtoken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: accesstoken,  // Changed to camelCase for consistency
          refreshToken: refreshtoken, // Changed to camelCase for consistency
        },
        "User logged-in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    await User.findByIdAndUpdate(
      userId,
      { $unset: { refreshToken: 1 } },
      { new: true }
    );

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User Logout Successfull"));
      
  } catch (error) {
    console.error("Logout error:", error);
    throw new ApiError(500, "Logout failed. Please try again.");
  }
}); 

const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    const includeAddresses = req.query.includeAddresses === 'true';
    
    const query = User.findById(req.user._id).select('-password -refreshToken');
    
    if (includeAddresses) {
      query.select('+addresses'); // Explicitly include addresses
    }

    const user = await query;
    
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Convert to plain JavaScript object
    const userObj = user.toObject();
    
    // Ensure addresses exists as an array
    if (includeAddresses && !userObj.addresses) {
      userObj.addresses = [];
    }

    return res.status(200).json({
      success: true,
      user: userObj,
      message: "User data fetched successfully"
    });
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to fetch user");
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


const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});


// Add new address
const addAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const newAddress = req.body;

  try {
    // If setting as default, first unset any existing default
    if (newAddress.isDefault) {
      await User.updateOne(
        { _id: userId, "addresses.isDefault": true },
        { $set: { "addresses.$.isDefault": false } }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { addresses: newAddress } },
      { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { user: updatedUser }, "Address added successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to add address");
  }
});

// Update existing address
const updateAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const addressId = req.params.addressId;
  const updatedData = req.body;

  try {
    // If setting as default, first unset any existing default
    if (updatedData.isDefault) {
      await User.updateOne(
        { _id: userId, "addresses.isDefault": true },
        { $set: { "addresses.$.isDefault": false } }
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, "addresses._id": addressId },
      { $set: { "addresses.$": updatedData } },
      { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      throw new ApiError(404, "Address not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser.addresses, "Address updated successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to update address");
  }
});

// Delete address
const deleteAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const addressId = req.params.addressId;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser.addresses, "Address deleted successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to delete address");
  }
});

// Set default address
const setDefaultAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const addressId = req.params.addressId;

  try {
    // First unset any existing default
    await User.updateOne(
      { _id: userId, "addresses.isDefault": true },
      { $set: { "addresses.$.isDefault": false } }
    );

    // Then set the new default
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, "addresses._id": addressId },
      { $set: { "addresses.$.isDefault": true } },
      { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      throw new ApiError(404, "Address not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser.addresses, "Default address set successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to set default address");
  }
});

// const getUserWithAddresses = asyncHandler(async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('-password -refreshToken');
    
//     if (!user) {
//       throw new ApiError(404, "User not found");
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(200, { user }, "User with addresses fetched successfully"));
//   } catch (error) {
//     throw new ApiError(500, error.message || "Failed to fetch user with addresses");
//   }
// });

// Add to the exports
export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserDetails,
  updatePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
 // getUserWithAddresses,
};
// Add to the exports


