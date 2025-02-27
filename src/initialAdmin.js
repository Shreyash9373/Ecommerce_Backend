import dotenv from "dotenv";
dotenv.config({
  path: "../.env",
});
import mongoose from "mongoose";
import { loginModel } from "./models/login.model.js";
import connectDB from "./db/index.js";

export const initialAdmin = async () => {
  try {
    console.log(" Connecting to MongoDB...");
    await connectDB(); // Ensure this is awaited

    console.log(" Checking if admin user exists...");
    const existingAdmin = await loginModel.findOne({
      email: "admin@gmail.com",
    });

    if (existingAdmin) {
      console.log(" Admin user already exists. Skipping creation.");
      return;
    }

    console.log(" Creating admin user...");
    await loginModel.create({
      email: "admin@gmail.com",
      password: process.env.adminPass, // Assuming password hashing is handled in the model
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
