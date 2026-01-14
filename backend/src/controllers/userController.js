const User = require('../models/User');
const Group = require('../models/Group');
const Bet = require('../models/Bet');
const FilterPreference = require('../models/FilterPreference');
const cloudinary = require('../config/cloudinary');

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
    const user = await User.findById(req.user._id).populate('groups', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
        createdAt: user.createdAt
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

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
    }

    // Get user with password for verification
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
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
