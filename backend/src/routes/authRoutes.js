const express = require('express');
const router = express.Router();
const {
  register, login, getMe, logout, googleAuth, facebookAuth,
  verifyEmail, resendVerification, forgotPassword, resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/facebook', facebookAuth);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
