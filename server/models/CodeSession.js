// models/CodeSession.js — Persistent code storage per room
const mongoose = require("mongoose");

// Optional: store change history for activity replay
const ChangeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName: String,
  code: String,
  timestamp: { type: Date, default: Date.now },
});

const CodeSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    code: {
      type: String,
      default: "// Start coding here...\n",
    },
    language: {
      type: String,
      default: "javascript",
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    // Optional activity history (capped at last 50 changes)
    history: {
      type: [ChangeSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Keep history to last 50 entries
CodeSessionSchema.methods.addToHistory = function (change) {
  this.history.push(change);
  if (this.history.length > 50) {
    this.history = this.history.slice(-50);
  }
};

module.exports = mongoose.model("CodeSession", CodeSessionSchema);