const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  updateSettings,
  deleteAccount,
  generateTelegramLinkCode,
  unlinkTelegram,
  updateTelegramSettings,
  getTelegramStatus,
  updatePreferences
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadProfile } = require('../middleware/upload');

// All routes are protected
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.post('/profile-picture', protect, uploadProfile.single('profilePicture'), uploadProfilePicture);
router.delete('/profile-picture', protect, deleteProfilePicture);
router.put('/settings', protect, updateSettings);
router.delete('/account', protect, deleteAccount);

// Preferences routes
router.put('/preferences', protect, updatePreferences);

// Telegram routes
router.post('/telegram/generate-link-code', protect, generateTelegramLinkCode);
router.delete('/telegram/unlink', protect, unlinkTelegram);
router.put('/telegram/settings', protect, updateTelegramSettings);
router.get('/telegram/status', protect, getTelegramStatus);

module.exports = router;
