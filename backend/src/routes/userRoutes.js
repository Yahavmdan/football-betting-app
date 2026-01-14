const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  updateSettings,
  deleteAccount
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes are protected
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.post('/profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);
router.delete('/profile-picture', protect, deleteProfilePicture);
router.put('/settings', protect, updateSettings);
router.delete('/account', protect, deleteAccount);

module.exports = router;
