const User = require('../models/User');
const Group = require('../models/Group');
const Bet = require('../models/Bet');
const FilterPreference = require('../models/FilterPreference');
const TelegramLinkCode = require('../models/TelegramLinkCode');
const cloudinary = require('../config/cloudinary');
const crypto = require('crypto');
const telegramService = require('../services/telegramService');

// Helper to extract Cloudinary public_id from URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}.{ext}
  const matches = url.match(/\/ba-betim\/profiles\/([^.]+)/);
  return matches ? `ba-betim/profiles/${matches[1]}` : null;
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password').populate('groups', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has a password (not an OAuth-only user)
    const hasPassword = !!user.password;

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        groups: user.groups,
        settings: user.settings,
        createdAt: user.createdAt,
        hasPassword
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update profile (username, email)
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if username is taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
      user.username = username;
    }

    // Check if email is taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
      user.email = email;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old profile picture from Cloudinary if exists
    if (user.profilePicture) {
      const publicId = getPublicIdFromUrl(user.profilePicture);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Failed to delete old profile picture from Cloudinary:', err);
        }
      }
    }

    // Save new profile picture URL (Cloudinary URL)
    const profilePictureUrl = req.file.path;
    user.profilePicture = profilePictureUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: profilePictureUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete profile picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete profile picture from Cloudinary if exists
    if (user.profilePicture) {
      const publicId = getPublicIdFromUrl(user.profilePicture);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Failed to delete profile picture from Cloudinary:', err);
        }
      }
    }

    user.profilePicture = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    const { language, theme, autoBet } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update settings
    if (language !== undefined) {
      user.settings.language = language;
    }
    if (theme !== undefined) {
      user.settings.theme = theme;
    }
    if (autoBet !== undefined) {
      user.settings.autoBet = autoBet;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: user.settings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete account (user can only delete their own account)
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    // Get user with password for verification
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is an OAuth user (no password set)
    const isOAuthUser = !user.password && (user.googleId || user.facebookId);

    if (!isOAuthUser) {
      // Regular user - require password verification
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to delete account'
        });
      }

      // SECURITY: Verify password to ensure it's the actual user
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect password'
        });
      }
    }
    // OAuth users don't need password verification - they're already authenticated via JWT

    // Delete profile picture from Cloudinary if exists
    if (user.profilePicture) {
      const publicId = getPublicIdFromUrl(user.profilePicture);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Failed to delete profile picture from Cloudinary:', err);
        }
      }
    }

    // Remove user from all groups they're a member of
    await Group.updateMany(
      { 'members.user': userId },
      { $pull: { members: { user: userId } } }
    );

    // Remove user from pending members in all groups
    await Group.updateMany(
      { 'pendingMembers.user': userId },
      { $pull: { pendingMembers: { user: userId } } }
    );

    // Delete all bets by this user
    await Bet.deleteMany({ user: userId });

    // Delete all filter preferences for this user
    await FilterPreference.deleteMany({ user: userId });

    // Handle groups where user is the creator
    // Option 1: Delete groups they created (or transfer ownership)
    // For now, we'll delete groups they created
    const createdGroups = await Group.find({ creator: userId });
    for (const group of createdGroups) {
      // Remove group from all members' groups array
      const memberIds = group.members.map(m => m.user);
      await User.updateMany(
        { _id: { $in: memberIds } },
        { $pull: { groups: group._id } }
      );

      // Delete all bets for this group
      await Bet.deleteMany({ group: group._id });

      // Delete filter preferences for this group
      await FilterPreference.deleteMany({ group: group._id });

      // Delete the group
      await Group.findByIdAndDelete(group._id);
    }

    // Finally, delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Generate Telegram link code
exports.generateTelegramLinkCode = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user already has Telegram linked
    const user = await User.findById(userId);
    if (user.settings?.telegram?.isLinked) {
      return res.status(400).json({
        success: false,
        message: 'Telegram is already linked. Please unlink first to generate a new code.'
      });
    }

    // Delete any existing codes for this user
    await TelegramLinkCode.deleteMany({ user: userId });

    // Generate a random 8-character code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Code expires in 10 minutes (configurable via env)
    const expiryMinutes = parseInt(process.env.TELEGRAM_LINK_CODE_EXPIRY_MINUTES) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save the link code
    await TelegramLinkCode.create({
      user: userId,
      code,
      expiresAt
    });

    res.status(200).json({
      success: true,
      data: {
        code,
        expiresAt,
        botUsername: process.env.TELEGRAM_BOT_USERNAME || 'YourBotName'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Unlink Telegram account
exports.unlinkTelegram = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.settings?.telegram?.isLinked) {
      return res.status(400).json({
        success: false,
        message: 'Telegram is not linked'
      });
    }

    // Send notification to user via Telegram before unlinking
    if (user.settings.telegram.chatId) {
      await telegramService.sendMessage(
        user.settings.telegram.chatId,
        'Your Telegram account has been unlinked from Football Betting. You will no longer receive reminders.'
      );
    }

    // Clear Telegram settings
    user.settings.telegram = {
      chatId: null,
      isLinked: false,
      linkedAt: null,
      reminderEnabled: true,
      reminderMinutes: 15
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Telegram unlinked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update Telegram reminder settings
exports.updateTelegramSettings = async (req, res) => {
  try {
    const { reminderEnabled, reminderMinutes } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user.settings?.telegram?.isLinked) {
      return res.status(400).json({
        success: false,
        message: 'Telegram is not linked'
      });
    }

    // Validate reminderMinutes if provided
    if (reminderMinutes !== undefined) {
      const validMinutes = [5, 10, 15, 30, 60];
      if (!validMinutes.includes(reminderMinutes)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reminder timing. Valid options: 5, 10, 15, 30, 60 minutes'
        });
      }
      user.settings.telegram.reminderMinutes = reminderMinutes;
    }

    if (reminderEnabled !== undefined) {
      user.settings.telegram.reminderEnabled = reminderEnabled;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Telegram settings updated',
      data: {
        telegram: user.settings.telegram
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Telegram status
exports.getTelegramStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      data: {
        telegram: user.settings?.telegram || {
          isLinked: false,
          reminderEnabled: true,
          reminderMinutes: 15
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update user preferences (favorite leagues, tournaments, teams)
exports.updatePreferences = async (req, res) => {
  try {
    const { favoriteLeagues, favoriteTournaments, favoriteTeams } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update preferences
    if (favoriteLeagues !== undefined) {
      user.settings.favoriteLeagues = favoriteLeagues;
    }
    if (favoriteTournaments !== undefined) {
      user.settings.favoriteTournaments = favoriteTournaments;
    }
    if (favoriteTeams !== undefined) {
      user.settings.favoriteTeams = favoriteTeams;
    }

    // Mark preferences as configured if any preference is set
    const hasPreferences =
      (user.settings.favoriteLeagues && user.settings.favoriteLeagues.length > 0) ||
      (user.settings.favoriteTournaments && user.settings.favoriteTournaments.length > 0) ||
      (user.settings.favoriteTeams && user.settings.favoriteTeams.length > 0);

    if (hasPreferences) {
      user.settings.preferencesConfigured = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        favoriteLeagues: user.settings.favoriteLeagues,
        favoriteTournaments: user.settings.favoriteTournaments,
        favoriteTeams: user.settings.favoriteTeams,
        preferencesConfigured: user.settings.preferencesConfigured
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Dismiss preferences reminder (sets preferencesConfigured to true)
exports.dismissPreferencesReminder = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.settings.preferencesConfigured = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferences reminder dismissed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
