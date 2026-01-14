const Group = require('../models/Group');
const User = require('../models/User');
const Bet = require('../models/Bet');
const FilterPreference = require('../models/FilterPreference');
const generateInviteCode = require('../utils/generateInviteCode');

exports.createGroup = async (req, res) => {
  try {
    const { name, description, betType, startingCredits, creditsGoal } = req.body;

    let inviteCode;
    let isUnique = false;

    while (!isUnique) {
      inviteCode = generateInviteCode();
      const existingGroup = await Group.findOne({ inviteCode });
      if (!existingGroup) {
        isUnique = true;
      }
    }

    // Set starting points/credits based on betType
    const initialPoints = betType === 'relative' ? (startingCredits || 100) : 0;

    const group = await Group.create({
      name,
      description,
      betType: betType || 'classic',
      startingCredits: betType === 'relative' ? (startingCredits || 100) : 100,
      creditsGoal: betType === 'relative' ? (creditsGoal || 1000) : 1000,
      creator: req.user._id,
      inviteCode,
      members: [{
        user: req.user._id,
        points: initialPoints
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

    // Check if already pending
    const isPending = group.pendingMembers.some(
      pending => pending.user.toString() === req.user._id.toString()
    );

    if (isPending) {
      return res.status(400).json({
        success: false,
        message: 'Your join request is already pending approval'
      });
    }

    // Add to pending members instead of members
    group.pendingMembers.push({
      user: req.user._id
    });

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Join request sent. Waiting for admin approval.',
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
    // Get groups where user is a member
    const memberGroups = await Group.find({
      'members.user': req.user._id
    }).populate('members.user', 'username email profilePicture');

    // Get groups where user has a pending request
    const pendingGroups = await Group.find({
      'pendingMembers.user': req.user._id
    }).populate('members.user', 'username email profilePicture');

    // Add isPending flag to each group
    const memberGroupsWithFlag = memberGroups.map(group => ({
      ...group.toObject(),
      isPending: false
    }));

    const pendingGroupsWithFlag = pendingGroups.map(group => ({
      ...group.toObject(),
      isPending: true
    }));

    // Combine and return all groups
    const allGroups = [...memberGroupsWithFlag, ...pendingGroupsWithFlag];

    res.status(200).json({
      success: true,
      data: allGroups
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
      .populate('members.user', 'username email profilePicture')
      .populate('pendingMembers.user', 'username email profilePicture lastActive')
      .populate('creator', 'username email profilePicture');

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
      .populate('members.user', 'username email profilePicture lastActive');

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

    // For relative betting groups, check for ongoing bets per member and sum at-risk credits
    let membersWithOngoingBets = new Set();
    let memberAtRiskCredits = {};
    if (group.betType === 'relative') {
      const ongoingBets = await Bet.find({
        group: group._id,
        calculated: false
      });
      ongoingBets.forEach(bet => {
        const userId = bet.user.toString();
        membersWithOngoingBets.add(userId);
        // Sum up the wager amounts for each user
        if (!memberAtRiskCredits[userId]) {
          memberAtRiskCredits[userId] = 0;
        }
        memberAtRiskCredits[userId] += bet.wagerAmount || 0;
      });
    }

    // Add hasOngoingBets field to each member and include at-risk credits in total
    const membersWithBetInfo = group.members.map(member => {
      const userId = member.user._id.toString();
      const atRiskCredits = memberAtRiskCredits[userId] || 0;
      return {
        user: member.user,
        joinedAt: member.joinedAt,
        // For relative mode, show total credits including at-risk amount
        points: member.points + atRiskCredits,
        hasOngoingBets: membersWithOngoingBets.has(userId)
      };
    });

    const sortedMembers = membersWithBetInfo.sort((a, b) => b.points - a.points);

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

// Get pending members (admin/creator only)
exports.getPendingMembers = async (req, res) => {
  try {
    const groupId = req.params.id;

    const group = await Group.findById(groupId)
      .populate('pendingMembers.user', 'username email profilePicture lastActive');

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
        message: 'Only the group admin can view pending members'
      });
    }

    res.status(200).json({
      success: true,
      data: group.pendingMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve pending member (admin/creator only)
exports.approveMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;

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
        message: 'Only the group admin can approve members'
      });
    }

    // Find the pending member
    const pendingIndex = group.pendingMembers.findIndex(
      p => p.user.toString() === userId
    );

    if (pendingIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found in pending list'
      });
    }

    // Remove from pending and add to members
    group.pendingMembers.splice(pendingIndex, 1);

    // Set starting points/credits based on betType
    const initialPoints = group.betType === 'relative' ? group.startingCredits : 0;

    group.members.push({
      user: userId,
      points: initialPoints
    });

    await group.save();

    // Add group to user's groups array
    await User.findByIdAndUpdate(userId, {
      $push: { groups: groupId }
    });

    res.status(200).json({
      success: true,
      message: 'Member approved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject pending member (admin/creator only)
exports.rejectMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;

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
        message: 'Only the group admin can reject members'
      });
    }

    // Find and remove the pending member
    const pendingIndex = group.pendingMembers.findIndex(
      p => p.user.toString() === userId
    );

    if (pendingIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found in pending list'
      });
    }

    group.pendingMembers.splice(pendingIndex, 1);
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Member request rejected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Kick member from group (admin/creator only)
exports.kickMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;

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
        message: 'Only the group admin can kick members'
      });
    }

    // Cannot kick the creator
    if (group.creator.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot kick the group creator'
      });
    }

    // Find and remove the member
    const memberIndex = group.members.findIndex(
      m => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found in group members'
      });
    }

    group.members.splice(memberIndex, 1);
    await group.save();

    // Remove group from user's groups array
    await User.findByIdAndUpdate(userId, {
      $pull: { groups: groupId }
    });

    // Optionally delete user's bets in this group
    const Bet = require('../models/Bet');
    await Bet.deleteMany({ user: userId, group: groupId });

    res.status(200).json({
      success: true,
      message: 'Member kicked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
