
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");


const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const sessionRoutes = require("./routes/sessions");


const setupSocketHandlers = require("./sockets/socketHandler");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});


connectDB();


app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/sessions", sessionRoutes);


app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});


setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Socket.IO ready`);
});
