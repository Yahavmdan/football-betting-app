const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  prediction: {
    outcome: {
      type: String,
      enum: ['1', 'X', '2'],
      required: true
    },
    homeScore: {
      type: Number,
      required: true,
      min: 0
    },
    awayScore: {
      type: Number,
      required: true,
      min: 0
    }
  },
  points: {
    type: Number,
    default: null
  },
  calculated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

betSchema.index({ user: 1, match: 1, group: 1 }, { unique: true });

module.exports = mongoose.model('Bet', betSchema);
