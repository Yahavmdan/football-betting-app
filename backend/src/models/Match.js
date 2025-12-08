const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  externalApiId: {
    type: String,
    required: true,
    unique: true
  },
  homeTeam: {
    type: String,
    required: true
  },
  awayTeam: {
    type: String,
    required: true
  },
  matchDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'],
    default: 'SCHEDULED'
  },
  result: {
    homeScore: {
      type: Number,
      default: null
    },
    awayScore: {
      type: Number,
      default: null
    },
    outcome: {
      type: String,
      enum: ['1', 'X', '2', null],
      default: null
    }
  },
  competition: {
    type: String,
    required: true
  },
  season: {
    type: String
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Match', matchSchema);
