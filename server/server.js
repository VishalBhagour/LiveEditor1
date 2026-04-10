import "dotenv/config"
import express from "express"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import connectDB from "./config/db.js"

import authRoutes from "./routes/auth.js"
import roomRoutes from "./routes/rooms.js"
import sessionRoutes from "./routes/sessions.js"
import executeRoutes from "./routes/execute.js"

import setupSocketHandlers from "./sockets/socketHandler.js"

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

connectDB()

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }))
app.use(express.json())

app.use("/api/auth", authRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/sessions", sessionRoutes)
app.use("/api/execute", executeRoutes)

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

setupSocketHandlers(io)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Socket.IO ready`)
})