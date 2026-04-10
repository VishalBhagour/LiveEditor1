const jwt = require("jsonwebtoken");
const CodeSession = require("../models/CodeSession");
const Room = require("../models/Room");

const activeRooms = new Map();

const saveTimers = new Map();

const setupSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.user.id})`);

    socket.on("join-room", async ({ roomId, userName, userEmail }) => {
      try {
        const normalizedRoomId = roomId.toUpperCase();

        const room = await Room.findOne({ roomId: normalizedRoomId });
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const member = room.members.find(
          (m) => m.userId.toString() === socket.user.id
        );
        if (!member) {
          socket.emit("error", { message: "You are not a member of this room" });
          return;
        }

        socket.join(normalizedRoomId);
        socket.currentRoom = normalizedRoomId;
        socket.userRole = member.role;

        if (!activeRooms.has(normalizedRoomId)) {
          activeRooms.set(normalizedRoomId, new Map());
        }
        activeRooms.get(normalizedRoomId).set(socket.id, {
          userId: socket.user.id,
          name: userName || member.name,
          email: userEmail || member.email,
          role: member.role,
          socketId: socket.id,
        });

        const session = await CodeSession.findOne({ roomId: normalizedRoomId });

        socket.emit("sync-code", {
          code: session?.code || "",
          language: session?.language || "javascript",
        });

        const activeUsers = Array.from(
          activeRooms.get(normalizedRoomId).values()
        );

        io.to(normalizedRoomId).emit("user-joined", {
          userId: socket.user.id,
          name: userName || member.name,
          role: member.role,
          activeUsers,
        });

        console.log(`👤 ${userName} joined room ${normalizedRoomId} as ${member.role}`);
      } catch (error) {
        console.error("join-room error:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("code-change", async ({ roomId, code, language }) => {
      const normalizedRoomId = roomId.toUpperCase();

      if (socket.userRole === "viewer") {
        socket.emit("error", { message: "Viewers cannot edit code" });
        return;
      }

      socket.to(normalizedRoomId).emit("code-update", {
        code,
        language,
        sentBy: socket.user.id,
      });

      if (saveTimers.has(normalizedRoomId)) {
        clearTimeout(saveTimers.get(normalizedRoomId));
      }

      const timer = setTimeout(async () => {
        try {
          const userInfo = activeRooms.get(normalizedRoomId)?.get(socket.id);

          const session = await CodeSession.findOne({ roomId: normalizedRoomId });
          if (session) {
            session.addToHistory({
              userId: socket.user.id,
              userName: userInfo?.name || "Unknown",
              code,
            });
            session.code = code;
            session.language = language || session.language;
            session.lastUpdatedBy = socket.user.id;
            session.lastUpdated = new Date();
            await session.save();
          }

          saveTimers.delete(normalizedRoomId);
          console.log(`💾 Auto-saved code for room ${normalizedRoomId}`);
        } catch (err) {
          console.error("Auto-save error:", err);
        }
      }, 1000); 

      saveTimers.set(normalizedRoomId, timer);
    });

    socket.on("language-change", async ({ roomId, language }) => {
      const normalizedRoomId = roomId.toUpperCase();

      if (socket.userRole === "viewer") return;

      socket.to(normalizedRoomId).emit("language-update", { language });

      await CodeSession.findOneAndUpdate(
        { roomId: normalizedRoomId },
        { language },
        { new: true }
      );
    });

    socket.on("cursor-move", ({ roomId, position }) => {
      socket.to(roomId.toUpperCase()).emit("cursor-update", {
        userId: socket.user.id,
        position,
      });
    });

    socket.on("disconnect", () => {
      const roomId = socket.currentRoom;
      if (roomId && activeRooms.has(roomId)) {
        const roomUsers = activeRooms.get(roomId);
        const user = roomUsers.get(socket.id);

        roomUsers.delete(socket.id);

        if (roomUsers.size === 0) {
          activeRooms.delete(roomId);
        }

        const activeUsers = Array.from(roomUsers.values());

        io.to(roomId).emit("user-left", {
          userId: socket.user.id,
          name: user?.name,
          activeUsers,
        });

        console.log(`👋 ${user?.name || socket.id} left room ${roomId}`);
      }

      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocketHandlers;
