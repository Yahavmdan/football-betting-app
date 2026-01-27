const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  externalApiId: {
    type: String,
    unique: true,
    sparse: true
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
  relativePoints: [{
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    homeWin: {
      type: Number,
      default: 1
    },
    draw: {
      type: Number,
      default: 1
    },
    awayWin: {
      type: Number,
      default: 1
    },
    fromApi: {
      type: Boolean,
      default: false
    }
  }],
  // API-specific fields for automatic groups
  homeTeamId: Number,
  awayTeamId: Number,
  homeTeamLogo: String,
  awayTeamLogo: String,
  round: String,
  // Live match fields
  elapsed: Number,      // Minutes elapsed in the match
  extraTime: Number,    // Extra/stoppage time minutes
  statusShort: String,  // e.g., "1H", "HT", "2H"
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Match', matchSchema);
