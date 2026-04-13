// controllers/roomController.js — CRUD for rooms
const { v4: uuidv4 } = require("uuid");
const Room = require("../models/Room");
const CodeSession = require("../models/CodeSession");

// @route POST /api/rooms/create
const createRoom = async (req, res) => {
  try {
    const { name, description, language, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Room name is required." });
    }

    const roomId = uuidv4().slice(0, 8).toUpperCase(); // Short, readable ID

    // Create room with creator as owner
    const room = await Room.create({
      roomId,
      name,
      description: description || "",
      language: language || "javascript",
      isPrivate: isPrivate || false,
      createdBy: req.user._id,
      members: [
        {
          userId: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: "owner",
        },
      ],
    });

    // Create a blank code session for the room
    await CodeSession.create({
      roomId,
      code: getStarterCode(language || "javascript"),
      language: language || "javascript",
      lastUpdatedBy: req.user._id,
    });

    res.status(201).json({ room });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ message: "Server error creating room." });
  }
};

// @route POST /api/rooms/join
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required." });
    }

    const room = await Room.findOne({ roomId: roomId.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    if (!room.isActive) {
      return res.status(403).json({ message: "Room is no longer active." });
    }

    // Check if user is already a member
    const isMember = room.members.some(
      (m) => m.userId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      // Add user as editor by default
      room.members.push({
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: "editor",
      });
      await room.save();
    }

    // Fetch current code session
    const session = await CodeSession.findOne({ roomId: room.roomId });

    res.json({ room, session });
  } catch (error) {
    console.error("Join room error:", error);
    res.status(500).json({ message: "Server error joining room." });
  }
};

// @route GET /api/rooms/my-rooms — Rooms the user created or joined
const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      "members.userId": req.user._id,
      isActive: true,
    })
      .sort({ updatedAt: -1 })
      .populate("createdBy", "name email");

    res.json({ rooms });
  } catch (error) {
    console.error("Get rooms error:", error);
    res.status(500).json({ message: "Server error fetching rooms." });
  }
};

// @route GET /api/rooms/:roomId
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() }).populate(
      "createdBy",
      "name email"
    );

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    // Check if user is a member
    const isMember = room.members.some(
      (m) => m.userId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this room." });
    }

    const session = await CodeSession.findOne({ roomId: room.roomId });

    res.json({ room, session });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({ message: "Server error fetching room." });
  }
};

// @route PATCH /api/rooms/:roomId/role — Change member role
const updateMemberRole = async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;

    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found." });

    // Only owner can change roles
    const requester = room.members.find(
      (m) => m.userId.toString() === req.user._id.toString()
    );
    if (!requester || requester.role !== "owner") {
      return res.status(403).json({ message: "Only the room owner can change roles." });
    }

    const target = room.members.find((m) => m.userId.toString() === targetUserId);
    if (!target) return res.status(404).json({ message: "Member not found." });

    target.role = newRole;
    await room.save();

    res.json({ message: "Role updated.", room });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ message: "Server error updating role." });
  }
};

// @route DELETE /api/rooms/:roomId
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found." });

    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the creator can delete this room." });
    }

    room.isActive = false;
    await room.save();

    res.json({ message: "Room deleted." });
  } catch (error) {
    console.error("Delete room error:", error);
    res.status(500).json({ message: "Server error deleting room." });
  }
};

// Helper: Return starter code based on language
const getStarterCode = (language) => {
  const starters = {
    javascript: `// Welcome to the collaborative editor!\n// Start coding in JavaScript...\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("World"));\n`,
    python: `# Welcome to the collaborative editor!\n# Start coding in Python...\n\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n`,
    typescript: `// Welcome to the collaborative editor!\n// Start coding in TypeScript...\n\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("World"));\n`,
    java: `// Welcome to the collaborative editor!\n// Start coding in Java...\n\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}\n`,
    cpp: `// Welcome to the collaborative editor!\n// Start coding in C++...\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello, World!" << endl;\n  return 0;\n}\n`,
    html: `<!-- Welcome to the collaborative editor! -->\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n`,
  };
  return starters[language] || starters.javascript;
};

module.exports = { createRoom, joinRoom, getMyRooms, getRoomById, updateMemberRole, deleteRoom };