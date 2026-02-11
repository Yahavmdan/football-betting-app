const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() {
      // Password is required only if not using OAuth
      return !this.googleId && !this.facebookId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true  // Allows multiple null values
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true  // Allows multiple null values
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  profilePicture: {
    type: String,
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  settings: {
    language: {
      type: String,
      enum: ['en', 'he'],
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    autoBet: {
      type: Boolean,
      default: false
    },
    telegram: {
      chatId: {
        type: String,
        default: null
      },
      isLinked: {
        type: Boolean,
        default: false
      },
      linkedAt: {
        type: Date,
        default: null
      },
      reminderEnabled: {
        type: Boolean,
        default: true
      },
      reminderMinutes: {
        type: Number,
        enum: [5, 10, 15, 30, 60],
        default: 15
      }
    }
  },
  lastActive: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to check if user is online (active in last 5 minutes)
userSchema.virtual('isOnline').get(function() {
  if (!this.lastActive) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastActive > fiveMinutesAgo;
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
