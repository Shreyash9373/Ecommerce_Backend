import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
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

//Importing routes
import adminRoutes from "./routes/admin.routes.js";

//Routes declaration
app.use("/api/v1/admin", adminRoutes); //http://localhost:4000/api/v1/admin

export { app };
