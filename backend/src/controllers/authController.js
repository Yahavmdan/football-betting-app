const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  try {
    const { username, email, password, language } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      username,
      email,
      password,
      emailVerificationToken: otp,
      emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000)
    });

    try {
      await emailService.sendVerificationOTP(email, otp, language || 'en');
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        isEmailVerified: user.isEmailVerified,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, language } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is OAuth-only (no password set)
    if (!user.password) {
      const provider = user.googleId ? 'Google' : user.facebookId ? 'Facebook' : 'OAuth';
      return res.status(401).json({
        success: false,
        message: `This account uses ${provider} login. Please sign in with ${provider}.`
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isEmailVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.emailVerificationToken = otp;
      user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      try {
        await emailService.sendVerificationOTP(user.email, otp, language || user.settings?.language || 'en');
      } catch (err) {
        console.error('Failed to send verification email on login:', err);
      }

      return res.status(403).json({
        success: false,
        message: 'EMAIL_NOT_VERIFIED',
        email: user.email
      });
    }

    // Mark user as online immediately on login
    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        isEmailVerified: user.isEmailVerified,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('groups');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Mark user as offline by setting lastActive to null
    await User.findByIdAndUpdate(req.user._id, { lastActive: null });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists with this email (might have registered with email/password)
      user = await User.findOne({ email });

      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        if (!user.profilePicture && picture) {
          user.profilePicture = picture;
        }
        await user.save();
      } else {
        // Create new user with Google account
        // Generate a unique username from the name
        let username = name.replace(/\s+/g, '').toLowerCase();
        let usernameExists = await User.findOne({ username });
        let counter = 1;
        while (usernameExists) {
          username = `${name.replace(/\s+/g, '').toLowerCase()}${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        user = await User.create({
          username,
          email,
          googleId,
          profilePicture: picture || null,
          isEmailVerified: true
        });
      }
    }

    // Mark user as online
    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        isEmailVerified: user.isEmailVerified,
        token
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
};

exports.facebookAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Facebook access token is required'
      });
    }

    // Verify the Facebook token and get user info
    const fbResponse = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );

    const { id: facebookId, email, name, picture } = fbResponse.data;
    const profilePicture = picture?.data?.url || null;

    // Check if user exists with this Facebook ID
    let user = await User.findOne({ facebookId });

    if (!user) {
      // Check if user exists with this email (might have registered with email/password)
      if (email) {
        user = await User.findOne({ email });
      }

      if (user) {
        // Link Facebook account to existing user
        user.facebookId = facebookId;
        if (!user.profilePicture && profilePicture) {
          user.profilePicture = profilePicture;
        }
        await user.save();
      } else {
        // Create new user with Facebook account
        // Generate a unique username from the name
        let username = name.replace(/\s+/g, '').toLowerCase();
        let usernameExists = await User.findOne({ username });
        let counter = 1;
        while (usernameExists) {
          username = `${name.replace(/\s+/g, '').toLowerCase()}${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        user = await User.create({
          username,
          email: email || `fb_${facebookId}@placeholder.com`,
          facebookId,
          profilePicture,
          isEmailVerified: true
        });
      }
    }

    // Mark user as online
    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        isEmailVerified: user.isEmailVerified,
        token
      }
    });
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Facebook authentication failed'
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    const user = await User.findOne({
      email,
      emailVerificationToken: otp,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        isEmailVerified: true,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email, language } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationToken = otp;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await emailService.sendVerificationOTP(email, otp, language || user.settings?.language || 'en');
    } catch (err) {
      console.error('Failed to send verification email:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Don't allow reset for OAuth-only users
    if (!user.password && (user.googleId || user.facebookId)) {
      const provider = user.googleId ? 'Google' : 'Facebook';
      return res.status(400).json({
        success: false,
        message: `This account uses ${provider} login. Password reset is not available.`
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await emailService.sendPasswordResetEmail(email, resetToken);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
