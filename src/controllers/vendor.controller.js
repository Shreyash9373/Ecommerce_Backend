import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { cookieOptions } from "../constants.js";
import { Vendor } from "../models/vendor.model.js";
import { Order } from "../models/orders.model.js";

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

  let avatarUrl;
  let uploadedDocuments = [];
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

    // Upload Verification Documents (Multiple Files)
    if (req.files.verificationDocuments) {
      const documentFiles = Array.isArray(req.files.verificationDocuments)
        ? req.files.verificationDocuments
        : [req.files.verificationDocuments]; // Ensure it's always an array

      uploadedDocuments = await Promise.all(
        documentFiles.map(async (doc) => {
          const result = await uploadCloudinary(doc.path, {
            folder: "documents",
          });
          return result.secure_url;
        })
      );
    }
  }

  const vendor = await Vendor.create({
    email,
    password,
    avatar: avatarUrl,
    verificationDocuments: uploadedDocuments ? uploadedDocuments : null,
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

  // console.log("Req.body : ", "email: ", email, "password: ", password);

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

  const newVendor = await Vendor.findById(vendor._id).select(
    "-password -refreshToken"
  );

  // console.log(newVendor); // check for refreshToken in user

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
          vendor: newVendor,
          accesstoken,
          refreshtoken,
        },
        "Vendor logged-in successfully"
      )
    );
});

const logoutVendor = asyncHandler(async (req, res) => {
  // get User from cookies
  // clear cookies of user

  const vendorId = req.user._id;

  await Vendor.findByIdAndUpdate(
    vendorId,
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
    .json(new ApiResponse(200, {}, "Vendor Logout Successfull"));
});

const getCurrentVendor = asyncHandler(async (req, res) => {
  const vendor = req.user;

  if (vendor) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, vendor, "Current Vendor Fetched Successfully")
      );
  } else {
    throw new ApiError(400, "Failed to fetch Vendor");
  }
});

const updateVendorDetails = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  if (!vendorId) {
    throw new ApiError(400, "Failer to get vendorId");
  }

  try {
    const updateData = req.body;

    let avatarUrl;
    let uploadedDocuments = [];

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

      // Upload Verification Documents (Multiple Files)
      if (req.files.verificationDocuments) {
        const documentFiles = Array.isArray(req.files.verificationDocuments)
          ? req.files.verificationDocuments
          : [req.files.verificationDocuments]; // Ensure it's always an array

        uploadedDocuments = await Promise.all(
          documentFiles.map(async (doc) => {
            const result = await uploadCloudinary(doc.path, {
              folder: "documents",
            });
            return result.secure_url;
          })
        );
      }
    }

    updateData.avatar = avatarUrl;
    updateData.verificationDocuments = uploadedDocuments;

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedVendor) {
      throw new ApiError(404, "Vendor not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedVendor, "Vendor updated successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to update vendor details");
  }
});

const getVendorById = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  console.log("Vendor id", vendorId);
  //TODO: get product by id
  if (!isValidObjectId(vendorId)) {
    throw new ApiError(400, "Invalid Vendor id");
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { vendor }, "Vendor details fetched successfully")
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (!email || !password || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Password and Confirm Password do not match");
  }

  const vendor = await Vendor.findOne({ email });

  if (!vendor) {
    throw new ApiError(404, "Vendor does not exist");
  }

  // Set new password & save (Triggers pre-save hashing)
  vendor.password = password;
  await vendor.save();

  // Remove sensitive fields before sending response
  const sanitizedVendor = {
    _id: vendor._id,
    name: vendor.name,
    email: vendor.email,
    createdAt: vendor.createdAt,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, sanitizedVendor, "Password Changed Successfully")
    );
});

const earningOverview = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;

  const summary = await Order.aggregate([
    {
      $match: {
        vendorId: vendorId, // Automatically matches if vendorId is in the array
      },
    },
    {
      $group: {
        _id: null,
        totalSalesAmount: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
        uniqueBuyers: { $addToSet: "$buyerId" },
      },
    },
    {
      $project: {
        _id: 0,
        totalSalesAmount: 1,
        totalOrders: 1,
        customerCount: { $size: "$uniqueBuyers" },
      },
    },
  ]);

  const result = summary[0] || {
    totalSalesAmount: 0,
    totalOrders: 0,
    customerCount: 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Earnings overview fetched "));
});

// Dashboard Controllers

const getMonthlySales = asyncHandler(async (req, res) => {
  // Get total sales ( money ) of month

  const vendorId = req.user._id;
  const { month, year } = req.query;

  // JavaScript months are 0-indexed (Jan = 0, Dec = 11)

  //parse month and year
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  const startDate = new Date(yearNum, monthNum - 1, 1); // Start of month
  const endDate = new Date(yearNum, monthNum, 1); // Start of next month

  if (!isValidObjectId(vendorId)) {
    throw new ApiError(400, "Invalid Vendor id");
  }

  const dailySales = await Order.aggregate([
    {
      $match: {
        vendorId: vendorId,
        createdAt: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        totalSales: { $sum: "$totalAmount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const totalSalesAmount = dailySales.reduce(
    (acc, day) => acc + day.totalSales,
    0
  );

  const daysInMonth = new Date(year, month, 0).getDate();

  const labels = [];
  const data = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const monthName = startDate.toLocaleString("default", { month: "short" });
    labels.push(`${monthName} ${day}`);

    const match = dailySales.find((d) => d._id === day);
    data.push(match ? match.totalSales : 0);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalSalesAmount, labels, data },
        "Monthly Sales fetched successfully"
      )
    );
});

const getMonthlyUnitsSold = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { month, year } = req.query;

  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate = new Date(yearNum, monthNum, 1);

  if (!isValidObjectId(vendorId)) {
    throw new ApiError(400, "Invalid Vendor id");
  }

  const dailyUnits = await Order.aggregate([
    {
      $match: {
        vendorId: vendorId,
        createdAt: { $gte: startDate, $lt: endDate },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        totalUnitsSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totalUnitsSold = dailyUnits.reduce(
    (acc, day) => acc + day.totalUnitsSold,
    0
  );

  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const monthName = startDate.toLocaleString("default", { month: "short" });

  const labels = [];
  const data = [];

  for (let day = 1; day <= daysInMonth; day++) {
    labels.push(`${monthName} ${day}`);
    const match = dailyUnits.find((d) => d._id === day);
    data.push(match ? match.totalUnitsSold : 0);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalUnitsSold, labels, data },
        "Monthly units sold fetched successfully"
      )
    );
});

const getOrderStatus = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { month, year } = req.query;

  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  const startDate = new Date(yearNum, monthNum - 1, 1); // Start of month
  const endDate = new Date(yearNum, monthNum, 1); // Start of next month

  if (!isValidObjectId(vendorId)) {
    throw new ApiError(400, "Invalid Vendor id");
  }

  const orderStatus = await Order.aggregate([
    {
      $match: {
        vendorId: vendorId,
        createdAt: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$count" },
        statuses: {
          $push: {
            status: "$_id",
            count: "$count",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total: "$total",
        labels: "$statuses.status",
        data: "$statuses.count",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { orderStatus }, "Order Status fetched successfully")
    );
});

export {
  registerVendor,
  loginVendor,
  logoutVendor,
  getCurrentVendor,
  updateVendorDetails,
  getVendorById,
  resetPassword,
  earningOverview,

  //Dashboard Routes
  getMonthlySales,
  getMonthlyUnitsSold,
  getOrderStatus,
};
