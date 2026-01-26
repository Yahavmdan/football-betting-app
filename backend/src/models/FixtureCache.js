const mongoose = require('mongoose');

const fixtureCacheSchema = new mongoose.Schema({
  leagueId: {
    type: String,
    required: true,
    index: true
  },
  season: {
    type: Number,
    required: true
  },
  fixtures: {
    type: Array,
    default: []
  },
  cachedAt: {
    type: Date,
    default: Date.now,
    expires: 21600 // TTL: 6 hours in seconds
  }
});

// Compound index for efficient lookups
fixtureCacheSchema.index({ leagueId: 1, season: 1 }, { unique: true });

module.exports = mongoose.model('FixtureCache', fixtureCacheSchema);
