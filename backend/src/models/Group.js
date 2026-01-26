const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [50, 'Group name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    points: {
      type: Number,
      default: 0
    },
    trashTalk: {
      message: {
        type: String,
        maxlength: [30, 'Trash talk cannot exceed 30 characters'],
        default: null
      },
      teamLogo: {
        type: String,
        default: null
      },
      bgColor: {
        type: String,
        default: null
      },
      updatedAt: {
        type: Date,
        default: null
      }
    }
  }],
  pendingMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  inviteCode: {
    type: String,
    unique: true,
    required: true
  },
  betType: {
    type: String,
    enum: ['classic', 'relative'],
    default: 'classic'
  },
  startingCredits: {
    type: Number,
    default: 100,
    min: 1
  },
  creditsGoal: {
    type: Number,
    default: 1000,
    min: 1
  },
  showBets: {
    type: Boolean,
    default: true
  },
  matchType: {
    type: String,
    enum: ['manual', 'automatic'],
    default: 'manual'
  },
  selectedLeague: {
    type: String,
    default: null
  },
  selectedSeason: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Group', groupSchema);
