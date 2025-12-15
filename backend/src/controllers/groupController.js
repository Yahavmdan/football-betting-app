const Group = require('../models/Group');
const User = require('../models/User');
const FilterPreference = require('../models/FilterPreference');
const generateInviteCode = require('../utils/generateInviteCode');

exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    let inviteCode;
    let isUnique = false;

    while (!isUnique) {
      inviteCode = generateInviteCode();
      const existingGroup = await Group.findOne({ inviteCode });
      if (!existingGroup) {
        isUnique = true;
      }
    }

    const group = await Group.create({
      name,
      description,
      creator: req.user._id,
      inviteCode,
      members: [{
        user: req.user._id,
        points: 0
      }]
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { groups: group._id }
    });

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const group = await Group.findOne({ inviteCode });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found with this invite code'
      });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    group.members.push({
      user: req.user._id,
      points: 0
    });

    await group.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { groups: group._id }
    });

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id
    }).populate('members.user', 'username email');

    res.status(200).json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'username email')
      .populate('creator', 'username email');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    // Allow access if user is member OR is admin
    if (!isMember && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'username email');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    // Allow access if user is member OR is admin
    if (!isMember && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    const sortedMembers = group.members.sort((a, b) => b.points - a.points);

    res.status(200).json({
      success: true,
      data: sortedMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Edit group (admin only)
exports.editGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const groupId = req.params.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is the group creator OR is admin
    const isCreator = group.creator.toString() === req.user._id.toString();
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can edit the group'
      });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete group (admin only)
exports.deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is the group creator OR is admin
    const isCreator = group.creator.toString() === req.user._id.toString();
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can delete the group'
      });
    }

    // Remove group from all members' groups array
    const memberIds = group.members.map(m => m.user);
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { groups: groupId } }
    );

    // Delete all bets associated with this group
    const Bet = require('../models/Bet');
    await Bet.deleteMany({ group: groupId });

    // Remove group from all matches
    const Match = require('../models/Match');
    await Match.updateMany(
      { groups: groupId },
      { $pull: { groups: groupId } }
    );

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Leave group (any member except creator)
exports.leaveGroup = async (req, res) => {
  try {
    const groupId = req.params.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member
    const isMember = group.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Creator cannot leave (must delete the group instead)
    if (group.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Group creator cannot leave. Delete the group instead.'
      });
    }

    // Remove user from group members
    group.members = group.members.filter(
      m => m.user.toString() !== req.user._id.toString()
    );
    await group.save();

    // Remove group from user's groups
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { groups: groupId }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully left the group'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get filter preferences for a group
exports.getFilterPreferences = async (req, res) => {
  try {
    const groupId = req.params.id;

    const preference = await FilterPreference.findOne({
      user: req.user._id,
      group: groupId
    });

    res.status(200).json({
      success: true,
      data: preference || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Save filter preferences for a group
exports.saveFilterPreferences = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { filters, saveEnabled } = req.body;

    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isMember && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Upsert filter preferences
    await FilterPreference.findOneAndUpdate(
      { user: req.user._id, group: groupId },
      {
        user: req.user._id,
        group: groupId,
        filters,
        saveEnabled,
        updatedAt: Date.now()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Filter preferences saved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Clear filter preferences for a group
exports.clearFilterPreferences = async (req, res) => {
  try {
    const groupId = req.params.id;

    await FilterPreference.findOneAndDelete({
      user: req.user._id,
      group: groupId
    });

    res.status(200).json({
      success: true,
      message: 'Filter preferences cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
