const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    const user = await User.create({
      username,
      email,
      password
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
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
    const { email, password } = req.body;

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
          profilePicture: picture || null
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
          profilePicture
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
