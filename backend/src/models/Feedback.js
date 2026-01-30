const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  image: {
    type: String,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['new', 'read', 'resolved'],
    default: 'new'
  },
  adminResponse: {
    type: String,
    default: null,
    trim: true,
    maxlength: [1000, 'Response cannot exceed 1000 characters']
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  userNotified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
