// routes/rooms.js
const express = require("express");
const router = express.Router();
const {
  createRoom,
  joinRoom,
  getMyRooms,
  getRoomById,
  updateMemberRole,
  deleteRoom,
} = require("../controllers/roomController");
const { protect } = require("../middleware/auth");

router.use(protect); // All room routes require authentication

router.post("/create", createRoom);
router.post("/join", joinRoom);
router.get("/my-rooms", getMyRooms);
router.get("/:roomId", getRoomById);
router.patch("/:roomId/role", updateMemberRole);
router.delete("/:roomId", deleteRoom);

module.exports = router;
