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
  getTelegramStatus
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

// Telegram routes
router.post('/telegram/generate-link-code', protect, generateTelegramLinkCode);
router.delete('/telegram/unlink', protect, unlinkTelegram);
router.put('/telegram/settings', protect, updateTelegramSettings);
router.get('/telegram/status', protect, getTelegramStatus);

module.exports = router;
