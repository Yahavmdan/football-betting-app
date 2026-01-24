const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// File filter - only allow images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure Cloudinary storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ba-betim/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }
    ],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `profile-${req.user._id}-${uniqueSuffix}`;
    }
  }
});

// Configure Cloudinary storage for feedback images
const feedbackStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ba-betim/feedback',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }
    ],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const userId = req.user ? req.user._id : 'anonymous';
      return `feedback-${userId}-${uniqueSuffix}`;
    }
  }
});

// Profile picture upload
const uploadProfile = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
});

// Feedback image upload
const uploadFeedback = multer({
  storage: feedbackStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
});

module.exports = {
  uploadProfile,
  uploadFeedback
};
