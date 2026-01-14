const cron = require('node-cron');
const Match = require('../models/Match');
const User = require('../models/User');
const Group = require('../models/Group');
const Bet = require('../models/Bet');

// Random outcome generator
const getRandomOutcome = () => {
  const outcomes = ['1', 'X', '2'];
  return outcomes[Math.floor(Math.random() * outcomes.length)];
};

// Get random wager amount (between 1 and 10% of available credits, minimum 1)
const getRandomWager = (availableCredits) => {
  const maxWager = Math.max(1, Math.floor(availableCredits * 0.1));
  return Math.floor(Math.random() * maxWager) + 1;
};

// Main auto-bet function
const processAutoBets = async () => {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find matches starting in the next 5 minutes
    const upcomingMatches = await Match.find({
      matchDate: {
        $gt: now,
        $lte: fiveMinutesFromNow
      },
      status: 'SCHEDULED'
    });

    if (upcomingMatches.length === 0) {
      return;
    }

    console.log(`[AutoBet] Found ${upcomingMatches.length} matches starting soon`);

    // Find all users with autoBet enabled
    const autoBetUsers = await User.find({ 'settings.autoBet': true });

    if (autoBetUsers.length === 0) {
      return;
    }

    console.log(`[AutoBet] Found ${autoBetUsers.length} users with autoBet enabled`);

    // Process each match
    for (const match of upcomingMatches) {
      // Get all groups that include this match
      const groups = await Group.find({ _id: { $in: match.groups } });

      for (const group of groups) {
        // Process each autoBet user
        for (const user of autoBetUsers) {
          // Check if user is a member of this group
          const memberIndex = group.members.findIndex(
            m => m.user.toString() === user._id.toString()
          );

          if (memberIndex === -1) {
            continue; // User is not in this group
          }

          // Check if user already has a bet on this match in this group
          const existingBet = await Bet.findOne({
            user: user._id,
            match: match._id,
            group: group._id
          });

          if (existingBet) {
            continue; // User already has a bet
          }

          // Generate random bet
          const outcome = getRandomOutcome();
          let wagerAmount = null;

          // For relative betting, calculate wager
          if (group.betType === 'relative') {
            const availableCredits = group.members[memberIndex].points;

            if (availableCredits <= 0) {
              console.log(`[AutoBet] User ${user.username} has no credits in group ${group.name}`);
              continue;
            }

            wagerAmount = getRandomWager(availableCredits);

            // Deduct wager from user's points in group
            group.members[memberIndex].points -= wagerAmount;
            await group.save();
          }

          // Create the bet
          const bet = await Bet.create({
            user: user._id,
            match: match._id,
            group: group._id,
            prediction: { outcome },
            wagerAmount
          });

          console.log(`[AutoBet] Placed bet for user ${user.username} in group ${group.name}: ${outcome}${wagerAmount ? ` (wager: ${wagerAmount})` : ''}`);
        }
      }
    }
  } catch (error) {
    console.error('[AutoBet] Error processing auto bets:', error);
  }
};

// Start the cron job - runs every 5 minutes
const start = () => {
  console.log('[AutoBet] Starting auto-bet scheduler (runs every 5 minutes)...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    processAutoBets();
  });
};

module.exports = { start, processAutoBets };
