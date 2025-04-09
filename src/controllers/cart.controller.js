import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { Vendor } from "../models/vendor.model.js";
import { Order } from "../models/orders.model.js";
import { Product } from "../models/products.model.js";
import { User } from "../models/users.model.js";
import { Cart } from "../models/cart.models.js";

const addItem = asyncHandler(async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    // console.log(": ", productId, quantity, userId);

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0 });
    }

    const itemIndex = cart.items.findIndex((item) =>
      item.productId.equals(productId)
    );

    // Ensure quantity is parsed as a number
    const parsedQuantity = Number(quantity); // Converts "1" -> 1, "5" -> 5

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      throw new ApiError(400, "Invalid quantity value"); // Prevent invalid values
    }

    if (itemIndex > -1) {
      // Convert existing quantity to number and update it
      cart.items[itemIndex].quantity =
        Number(cart.items[itemIndex].quantity) + parsedQuantity;
    } else {
      cart.items.push({
        productId,
        quantity: parsedQuantity, // Always store as a number,
        productSnapshot: {
          name: product.name,
          price: product.price,
          vendorId: product.vendorId || null,
          description: product.description || "",
          images: product.images || [],
          category: product.category || "",
        },
        version: 1, // Default version
      });
    }

    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.productSnapshot.price,
      0
    );

    // console.log("Cart:: ", cart);

    try {
      const newCart = await cart.save();
      // console.log("Cart saved successfully:", newCart);
      return res
        .status(201)
        .json(new ApiResponse(201, newCart, "Item added successfully"));
    } catch (error) {
      // console.error("Error saving cart:", error);
      return next(new ApiError(500, "Failed to save cart"));
    }
  } catch (error) {
    console.error("Cart save error:", error);
    return next(
      new ApiError(400, "Error while adding item to cart: " + error.message)
    );
  }
});

const getCart = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, { items: [], totalPrice: 0 }, "Cart is empty")
        );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart fetched successfully"));
  } catch (error) {
    console.error("Error fetching cart:", error);
    return next(new ApiError(500, "Failed to get cart"));
  }
});

const updateCartItem = asyncHandler(async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return next(new ApiError(400, "Invalid quantity value"));
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return next(new ApiError(404, "Cart not found"));
    }

    const itemIndex = cart.items.findIndex((item) =>
      item.productId.equals(productId)
    );
    if (itemIndex === -1) {
      return next(new ApiError(404, "Product not found in cart"));
    }

    cart.items[itemIndex].quantity = parsedQuantity;

    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.productSnapshot.price,
      0
    );

    await cart.save();
    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart updated successfully"));
  } catch (error) {
    console.error("Error updating cart:", error);
    return next(new ApiError(500, "Failed to update cart"));
  }
});

const removeItem = asyncHandler(async (req, res, next) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return next(new ApiError(404, "Cart not found"));
    }

    cart.items = cart.items.filter((item) => !item.productId.equals(productId));

    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.productSnapshot.price,
      0
    );

    await cart.save();
    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Item removed from cart"));
  } catch (error) {
    console.error("Error removing item:", error);
    return next(new ApiError(500, "Failed to remove item from cart"));
  }
});

const clearCart = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return next(new ApiError(404, "Cart not found"));
    }

    cart.items = [];
    cart.totalPrice = 0;

    await cart.save();
    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart cleared successfully"));
  } catch (error) {
    console.error("Error clearing cart:", error);
    return next(new ApiError(500, "Failed to clear cart"));
  }
});

export { addItem, getCart, updateCartItem, removeItem, clearCart };
