const mongoose = require('mongoose');

const filterPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  filters: {
    showFinished: { type: Boolean, default: false },
    showNotStarted: { type: Boolean, default: false },
    showOngoing: { type: Boolean, default: false },
    dateFrom: { type: String, default: '' },
    dateTo: { type: String, default: '' },
    selectedMembers: [{ type: String }],
    selectedTeams: [{ type: String }],
    homeScore: { type: Number, default: null },
    awayScore: { type: Number, default: null }
  },
  saveEnabled: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique user-group combination
filterPreferenceSchema.index({ user: 1, group: 1 }, { unique: true });

module.exports = mongoose.model('FilterPreference', filterPreferenceSchema);
