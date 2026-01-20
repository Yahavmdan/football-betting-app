const Bet = require('../models/Bet');
const Match = require('../models/Match');
const Group = require('../models/Group');
const calculatePoints = require('../utils/calculatePoints');

exports.placeBet = async (req, res) => {
  try {
    const { matchId, groupId, outcome, wagerAmount } = req.body;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status !== 'SCHEDULED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot place bet on a match that has already started or finished'
      });
    }

    if (new Date() >= new Date(match.matchDate)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot place bet on a match that has already started'
      });
    }

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

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Get user's current credits/points
    const memberIndex = group.members.findIndex(
      m => m.user.toString() === req.user._id.toString()
    );

    if (memberIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    const userCredits = group.members[memberIndex].points;

    // Check if user already placed a bet on this match
    const existingBet = await Bet.findOne({
      user: req.user._id,
      match: matchId,
      group: groupId
    });

    // For relative groups, validate wager amount
    if (group.betType === 'relative') {
      if (!wagerAmount || wagerAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Wager amount is required for relative betting groups'
        });
      }

      // Calculate effective credits (include refund if editing existing bet)
      const refundAmount = existingBet?.wagerAmount || 0;
      const effectiveCredits = userCredits + refundAmount;

      // Prevent users with 0 effective credits from betting (truly eliminated)
      if (effectiveCredits <= 0) {
        return res.status(400).json({
          success: false,
          message: 'You have 0 available credits and cannot place new bets.'
        });
      }

      if (wagerAmount > effectiveCredits) {
        return res.status(400).json({
          success: false,
          message: `Insufficient credits. You have ${effectiveCredits} credits available`
        });
      }
    }

    if (existingBet) {
      // Refund old wager amount if applicable
      if (group.betType === 'relative' && existingBet.wagerAmount) {
        group.members[memberIndex].points += existingBet.wagerAmount;
      }

      // Deduct new wager amount for relative groups
      if (group.betType === 'relative') {
        group.members[memberIndex].points -= wagerAmount;
      }

      // Update existing bet
      existingBet.prediction = {
        outcome
      };
      existingBet.wagerAmount = group.betType === 'relative' ? wagerAmount : null;
      await existingBet.save();
      await group.save();

      return res.status(200).json({
        success: true,
        message: 'Bet updated successfully',
        data: existingBet
      });
    }

    // Deduct wager amount for relative groups
    if (group.betType === 'relative') {
      group.members[memberIndex].points -= wagerAmount;
      await group.save();
    }

    const bet = await Bet.create({
      user: req.user._id,
      match: matchId,
      group: groupId,
      prediction: {
        outcome
      },
      wagerAmount: group.betType === 'relative' ? wagerAmount : null
    });

    res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      data: bet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMyBets = async (req, res) => {
  try {
    const { groupId } = req.query;

    let query = { user: req.user._id };
    if (groupId) {
      query.group = groupId;
    }

    const bets = await Bet.find(query)
      .populate('match')
      .populate('group', 'name');

    res.status(200).json({
      success: true,
      data: bets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Check if user already has a bet for a specific match
exports.checkExistingBet = async (req, res) => {
  try {
    const { matchId, groupId } = req.query;

    if (!matchId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Match ID and Group ID are required'
      });
    }

    const existingBet = await Bet.findOne({
      user: req.user._id,
      match: matchId,
      group: groupId
    });

    res.status(200).json({
      success: true,
      data: {
        hasBet: !!existingBet,
        bet: existingBet
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getBetsByMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { groupId } = req.query;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status !== 'FINISHED') {
      const userBet = await Bet.findOne({
        user: req.user._id,
        match: matchId,
        group: groupId
      });

      return res.status(200).json({
        success: true,
        data: userBet ? [userBet] : [],
        message: 'Bets are hidden until match is finished'
      });
    }

    const bets = await Bet.find({
      match: matchId,
      group: groupId
    }).populate('user', 'username profilePicture');

    res.status(200).json({
      success: true,
      data: bets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all group members' bets for a specific match
exports.getGroupMembersBets = async (req, res) => {
  try {
    const { matchId, groupId } = req.params;

    const group = await Group.findById(groupId).populate('members.user', 'username profilePicture lastActive');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member of this group
    const isMember = group.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // If showBets is false and match hasn't started yet (based on matchDate), only return user's own bet
    // If showBets is true, always show all bets
    const matchHasStarted = new Date(match.matchDate) <= new Date();
    if (group.showBets !== true && !matchHasStarted) {
      const userBet = await Bet.findOne({
        user: req.user._id,
        match: matchId,
        group: groupId
      });

      const currentMember = group.members.find(
        member => member.user._id.toString() === req.user._id.toString()
      );

      return res.status(200).json({
        success: true,
        data: [{
          user: {
            _id: currentMember.user._id,
            username: currentMember.user.username
          },
          hasBet: !!userBet,
          bet: userBet ? {
            outcome: userBet.prediction.outcome,
            createdAt: userBet.createdAt,
            points: userBet.points,
            wagerAmount: userBet.wagerAmount
          } : null
        }],
        message: !matchHasStarted
          ? 'Bets are hidden until match starts'
          : 'Bets are hidden in this group'
      });
    }

    // Get all bets for this match in this group
    const bets = await Bet.find({
      match: matchId,
      group: groupId
    });

    // Create a map of user bets
    const betsByUser = {};
    bets.forEach(bet => {
      betsByUser[bet.user.toString()] = {
        outcome: bet.prediction.outcome,
        createdAt: bet.createdAt,
        points: bet.points,
        wagerAmount: bet.wagerAmount
      };
    });

    // Build response with all members
    const membersBets = group.members.map(member => {
      const userId = member.user._id.toString();
      const userBet = betsByUser[userId];

      return {
        user: {
          _id: member.user._id,
          username: member.user.username
        },
        hasBet: !!userBet,
        bet: userBet ? {
          outcome: userBet.outcome,
          createdAt: userBet.createdAt,
          points: userBet.points,
          wagerAmount: userBet.wagerAmount
        } : null
      };
    });

    res.status(200).json({
      success: true,
      data: membersBets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.calculateBetPoints = async (req, res) => {
  try {
    const finishedMatches = await Match.find({ status: 'FINISHED' });

    let totalCalculated = 0;

    for (const match of finishedMatches) {
      const bets = await Bet.find({ match: match._id, calculated: false });

      for (const bet of bets) {
        const points = calculatePoints(bet.prediction, match.result);
        bet.points = points;
        bet.calculated = true;
        await bet.save();

        const group = await Group.findById(bet.group);
        const memberIndex = group.members.findIndex(
          m => m.user.toString() === bet.user.toString()
        );

        if (memberIndex !== -1) {
          group.members[memberIndex].points += points;
          await group.save();
        }

        totalCalculated++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Calculated points for ${totalCalculated} bets`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all bets for a group (for filtering purposes)
exports.getAllBetsForGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member of this group or is admin
    const isMember = group.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isMember && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    const bets = await Bet.find({ group: groupId })
      .select('user match prediction createdAt');

    res.status(200).json({
      success: true,
      data: bets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
