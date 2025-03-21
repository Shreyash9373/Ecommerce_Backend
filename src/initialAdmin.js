import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});
import mongoose from "mongoose";
import { adminModel } from "./models/admin.model.js";
import connectDB from "./db/index.js";

export const initialAdmin = async () => {
  try {
    console.log(" Connecting to MongoDB...");
    console.log(process.env.MONGODB_URI);
    await connectDB(); // Ensure this is awaited

    console.log(" Checking if admin user exists...");
    const existingAdmin = await adminModel.findOne({
      email: "admin@gmail.com",
    });

    if (existingAdmin) {
      console.log(" Admin user already exists. Skipping creation.");
      return;
    }

    console.log(" Creating admin user...");
    await adminModel.create({
      email: "shreyashraut8@gmail.com",
      password: process.env.adminPass, // Assuming password hashing is handled in the model
      user: "Admin",
      phone: 9373180080,
      avatar:
        "https://cdn.pixabay.com/photo/2020/07/01/12/58/icon-5359553_1280.png",
      lastLogin: new Date(),
    });

    console.log(" Admin user created successfully.");
  } catch (error) {
    console.error(" Error creating initial admin:", error);
  } finally {
    console.log(" Closing MongoDB connection...");
    mongoose.connection.close();
  }
};

initialAdmin();
