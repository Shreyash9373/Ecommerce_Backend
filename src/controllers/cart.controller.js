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
      console.log("Cart saved successfully:", newCart);
      return res
        .status(201)
        .json(new ApiResponse(201, newCart, "Item added successfully"));
    } catch (error) {
      console.error("Error saving cart:", error);
      return next(new ApiError(500, "Failed to save cart"));
    }
  } catch (error) {
    console.error("Cart save error:", error);
    return next(
      new ApiError(400, "Error while adding item to cart: " + error.message)
    );
  }
});

export { addItem };
