import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://192.168.151.65:5173",
  "http://147.93.30.210",
  "https://peakpuneit.com",
  "https://admin.peakpuneit.com",
  "https://vendor.peakpuneit.com",
  "https://api.peakpuneit.com",
  "https://adminecom.pakharedentalclinic.com",
  "https://vendorecom.pakharedentalclinic.com",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true); //!origin allows requests from non-browser clients like postman
      } else {
        callback(new Error("Origin not allowed by CORS"));
      }
    },
    credentials: true, //Allow cookies to be sent/received
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use((req, res, next) => {
  const io = req.app.get("io"); // get io from app
  req.io = io; // assign to req object
  next();
});

//Importing routes
import adminRoutes from "./routes/admin.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import productRoutes from "./routes/product.routes.js";
import userRoutes from "./routes/user.routes.js";
import orderRoutes from "./routes/order.routes.js";
import cartRoutes from "./routes/cart.routes.js";

//Routes declaration
app.use("/api/v1/admin", adminRoutes); //http://localhost:4000/api/v1/admin
app.use("/api/v1/vendor", vendorRoutes); // http://localhost:4000/api/v1/vendor  /register  /login  /logout /get-vendor
app.use("/api/v1/product", productRoutes); // http://localhost:4000/api/v1/product /add-Product   /update-product/:productId   /getAll-Products   /get-product/:productId    /delete-product/:productId
app.use("/api/v1/user", userRoutes); // http://localhost:4000/api/v1/user /register /login /logout /get-user /update-user
app.use("/api/v1/order", orderRoutes); // http://localhost:4000/api/v1/order
app.use("/api/v1/cart", cartRoutes); // http://localhost:4000/api/v1/cart   /add-Item

export { app };
