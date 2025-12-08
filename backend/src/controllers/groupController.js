const Group = require('../models/Group');
const User = require('../models/User');
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

    if (!isMember) {
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

    if (!isMember) {
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
