import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Order } from "../models/orders.model.js";
import mongoose from "mongoose";

const getUserPurchaseSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Get data for last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const summary = await Order.aggregate([
    {
      $match: {
        buyerId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" }
        },
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        averageOrderValue: { $avg: "$totalAmount" }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1
      }
    },
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        year: "$_id.year",
        totalOrders: 1,
        totalAmount: 1,
        averageOrderValue: { $round: ["$averageOrderValue", 2] }
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, summary, "Purchase summary fetched successfully"));
});

const getUserOrderStatusInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const statusCounts = await Order.aggregate([
    {
      $match: {
        buyerId: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        status: "$_id",
        count: 1,
        _id: 0
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, statusCounts, "Order status insights fetched successfully"));
});

const getUserSpendingPatterns = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const patterns = await Order.aggregate([
    {
      $match: {
        buyerId: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        totalSpent: { $sum: "$totalAmount" }
      }
    },
    {
      $sort: { "_id": 1 }
    },
    {
      $project: {
        date: "$_id",
        totalSpent: 1,
        _id: 0
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, patterns, "Spending patterns fetched successfully"));
});

const getUserMonthlySpending = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { year } = req.query || new Date().getFullYear();

  const monthlyData = await Order.aggregate([
    {
      $match: {
        buyerId: new mongoose.Types.ObjectId(userId),
        $expr: {
          $eq: [{ $year: "$createdAt" }, parseInt(year)]
        }
      }
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        totalSpent: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 }
      }
    },
    {
      $sort: { "_id": 1 }
    },
    {
      $project: {
        month: "$_id",
        totalSpent: 1,
        orderCount: 1,
        _id: 0
      }
    }
  ]);

  // Fill in missing months with zero values
  const completeData = Array.from({ length: 12 }, (_, i) => {
    const monthData = monthlyData.find(item => item.month === i + 1);
    return monthData || {
      month: i + 1,
      totalSpent: 0,
      orderCount: 0
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, completeData, "Monthly spending data fetched successfully"));
});

export {
  getUserPurchaseSummary,
  getUserOrderStatusInsights,
  getUserSpendingPatterns,
  getUserMonthlySpending
};