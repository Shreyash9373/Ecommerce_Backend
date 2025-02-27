import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Regular expression for validating email format
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Regular expression for validating password:
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one digit
// - Minimum length: 6 characters
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email) => emailRegex.test(email),
      message: "Invalid email format",
    },
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"],
    validate: {
      validator: (password) => passwordRegex.test(password),
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, and one digit",
    },
  },
  refreshToken: {
    type: String,
    default: "",
  },
});

adminSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to validate password
adminSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate access token
adminSchema.methods.generateAccessTokens = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET || "defaultAccessTokenSecret",
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1h", // Default to 1 hour if not set
    }
  );
};

// Method to generate refresh token
adminSchema.methods.generateRefreshTokens = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET || "defaultRefreshTokenSecret",
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d", // Default to 7 days if not set
    }
  );
};

export const adminModel = mongoose.model("admincredential", adminSchema);
