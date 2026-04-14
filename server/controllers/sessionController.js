// controllers/sessionController.js — Code session management
const CodeSession = require("../models/CodeSession");
const Room = require("../models/Room");

// @route GET /api/sessions/:roomId — Fetch current code for a room
const getSession = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Verify user is a member of this room
    const room = await Room.findOne({ roomId: roomId.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found." });

    const isMember = room.members.some(
      (m) => m.userId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Access denied." });
    }

    const session = await CodeSession.findOne({ roomId: roomId.toUpperCase() });
    if (!session) return res.status(404).json({ message: "Session not found." });

    res.json({ session });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ message: "Server error fetching session." });
  }
};

// @route GET /api/sessions/:roomId/history — Fetch change history
const getHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const session = await CodeSession.findOne({ roomId: roomId.toUpperCase() });
    if (!session) return res.status(404).json({ message: "Session not found." });

    res.json({ history: session.history });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ message: "Server error fetching history." });
  }
};

module.exports = { getSession, getHistory };