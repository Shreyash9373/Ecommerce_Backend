import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Vendor } from "../models/vendor.model.js";
import jwt from "jsonwebtoken";

const verifyJwtVendor = asyncHandler(async (req, res, next) => {
  // try {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "Unauthorised Request");
  }

  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  const user = await Vendor.findById(decodedToken?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "Invalid Access Token");
  }
  // console.log("user found");
  req.user = user;
  next();
  // } catch (error) {
  //   if (error.name === "JsonWebTokenError") {
  //     throw new ApiError(401, "Invalid Access Token");
  //   }
  //   if (error.name === "TokenExpiredError") {
  //     throw new ApiError(401, "Access Token Expired");
  //   }
  //   throw new ApiError(402, "Error at backend in AuthMiddleware");
  // }
});

export { verifyJwtVendor };
