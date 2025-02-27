import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { adminModel } from "../models/admin.model.js";
import { cookieOptions } from "../constants.js";

const genAccessAndRefreshTokens = async (userId) => {
  try {
    console.log(userId);
    const user = await adminModel.findById(userId);
    console.log(user);
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

export { adminLoginController };
