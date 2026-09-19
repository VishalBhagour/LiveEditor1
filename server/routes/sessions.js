// routes/sessions.js
const express = require("express");
const router = express.Router();
const { getSession, getHistory } = require("../controllers/sessionController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/:roomId", getSession);
router.get("/:roomId/history", getHistory);

module.exports = router;