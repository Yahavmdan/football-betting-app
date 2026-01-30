const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { uploadFeedback } = require('../middleware/upload');

// Optional auth middleware - attaches user if authenticated but doesn't require it
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (error) {
      // Token invalid, continue without user
    }
  }

  next();
};

// Admin check middleware
const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

// Submit feedback (rate limited: 5 per 3 hours)
router.post('/', optionalAuth, uploadFeedback.single('image'), async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Rate limiting: check how many messages in last 3 hours
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const maxMessages = 5;

    // Build query based on whether user is authenticated or using IP
    let rateLimitQuery;
    if (req.user) {
      rateLimitQuery = {
        user: req.user._id,
        createdAt: { $gte: threeHoursAgo }
      };
    } else {
      // For anonymous users, we can't effectively rate limit without IP tracking
      // So we'll just allow them (or you could block anonymous feedback entirely)
      rateLimitQuery = null;
    }

    if (rateLimitQuery) {
      const recentCount = await Feedback.countDocuments(rateLimitQuery);

      if (recentCount >= maxMessages) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded. You can send up to 5 messages every 3 hours.',
          remainingTime: Math.ceil((threeHoursAgo.getTime() + 3 * 60 * 60 * 1000 - Date.now()) / 60000)
        });
      }
    }

    const feedback = await Feedback.create({
      message: message.trim(),
      image: req.file ? req.file.path : null,
      user: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

// Get all feedback (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const feedbackList = await Feedback.find()
      .populate('user', 'username email profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: feedbackList
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback'
    });
  }
});

// Get user notifications (resolved feedback for current user)
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await Feedback.find({
      user: req.user._id,
      status: 'resolved',
      userNotified: false
    })
    .select('message adminResponse resolvedAt createdAt')
    .sort({ resolvedAt: -1 });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Dismiss a notification (mark as notified)
router.patch('/:id/dismiss', protect, async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        status: 'resolved'
      },
      { userNotified: true },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss notification'
    });
  }
});

// Update feedback status (admin only)
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminResponse } = req.body;

    if (!['new', 'read', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = { status };

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.adminResponse = adminResponse || null;
      updateData.userNotified = false;
    } else {
      updateData.resolvedAt = null;
      updateData.adminResponse = null;
      updateData.userNotified = false;
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback'
    });
  }
});

// Delete feedback (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback'
    });
  }
});

module.exports = router;
