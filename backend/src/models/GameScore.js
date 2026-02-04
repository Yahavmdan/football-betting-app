const mongoose = require('mongoose');

const gameScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient leaderboard queries
gameScoreSchema.index({ score: -1 });
gameScoreSchema.index({ user: 1, score: -1 });

module.exports = mongoose.model('GameScore', gameScoreSchema);
