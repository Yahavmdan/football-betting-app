const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, googleAuth, facebookAuth } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/facebook', facebookAuth);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
