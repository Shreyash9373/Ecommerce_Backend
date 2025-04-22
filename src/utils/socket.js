import { Server } from "socket.io";

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"], // frontend origin
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Admin connected", socket.id);

    socket.on("disconnect", () => {
      console.log("Admin disconnected", socket.id);
    });
  });

  return io;
};

export default setupSocket;
