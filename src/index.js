import dotenv from "dotenv";
import http from "http";
dotenv.config({
  path: "./.env",
});
import connectDB from "./db/index.js";
import { app } from "./app.js";
import setupSocket from "./utils/socket.js";

app.get("/", (req, res) => {
  res.send("Api Working");
});
connectDB()
  .then(() => {
    const server = http.createServer(app); //Create HTTP server using express app
    const io = setupSocket(server); // 👈 Setup WebSocket server
    app.set("io", io); // 👈 Make io available in app
    server.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
