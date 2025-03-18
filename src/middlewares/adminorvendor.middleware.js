import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Vendor } from "../models/vendor.model.js";
import { adminModel } from "../models/admin.model.js";

const verifyAdminorVendor = asyncHandler(async (req, res) => {
  //  try {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "Unauthorised Request");
  }

  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  const vendor = await Vendor.findById(decodedToken?._id).select(
    "-password -refreshToken"
  );

  if (!vendor) {
    const admin = await adminModel
      .findById(decodedToken?._id)
      .select("-password -refreshToken");
  }

  if (!vendor && !admin) {
    throw new ApiError(401, "Invalid Access Token");
  }

  req.user = user;
  next();
  // } catch (error) {
  //   if (error.name === "JsonWebTokenError") {
  //     throw new ApiError(401, "Invalid Access Token");
  //   }
  //   if (error.name === "TokenExpiredError") {
  //     throw new ApiError(401, "Access Token Expired");
  //   }
  //   throw new ApiError(402, "Error at backend in adminVendorMiddleware");
  // }
});

export default verifyAdminorVendor;
