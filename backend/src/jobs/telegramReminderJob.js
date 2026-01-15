const cron = require('node-cron');
const Match = require('../models/Match');
const User = require('../models/User');
const Group = require('../models/Group');
const Bet = require('../models/Bet');
const telegramService = require('../services/telegramService');

// Track which reminders have been sent to avoid duplicates
// Key: `${matchId}-${userId}-${reminderMinutes}`
const sentReminders = new Set();

// Clean up old entries periodically
const cleanupSentReminders = () => {
  sentReminders.clear();
  console.log('[TelegramReminder] Cleared sent reminders cache');
};

const processReminders = async () => {
  try {
    const now = new Date();

    // Find users with Telegram linked and reminders enabled
    const usersWithTelegram = await User.find({
      'settings.telegram.isLinked': true,
      'settings.telegram.reminderEnabled': true,
      'settings.telegram.chatId': { $ne: null }
    });

    if (usersWithTelegram.length === 0) {
      return;
    }

    // Group users by their reminder timing preference
    const usersByTiming = {};
    for (const user of usersWithTelegram) {
      const minutes = user.settings.telegram.reminderMinutes || 15;
      if (!usersByTiming[minutes]) {
        usersByTiming[minutes] = [];
      }
      usersByTiming[minutes].push(user);
    }

    // Process each timing group
    for (const [minutes, users] of Object.entries(usersByTiming)) {
      const reminderTime = new Date(now.getTime() + parseInt(minutes) * 60 * 1000);
      const windowStart = new Date(reminderTime.getTime() - 60 * 1000); // 1 minute window
      const windowEnd = new Date(reminderTime.getTime() + 60 * 1000);

      // Find matches starting within the window
      const upcomingMatches = await Match.find({
        matchDate: {
          $gte: windowStart,
          $lte: windowEnd
        },
        status: 'SCHEDULED'
      });

      if (upcomingMatches.length === 0) {
        continue;
      }

      // Process each user
      for (const user of users) {
        // Get all groups the user is a member of
        const userGroups = await Group.find({
          'members.user': user._id
        });

        if (userGroups.length === 0) {
          continue;
        }

        const userGroupIds = userGroups.map(g => g._id.toString());
        const matchesToRemind = [];

        // Check each upcoming match
        for (const match of upcomingMatches) {
          // Check if match is in any of user's groups
          const matchGroupIds = match.groups.map(g => g.toString());
          const relevantGroupIds = matchGroupIds.filter(gId => userGroupIds.includes(gId));

          if (relevantGroupIds.length === 0) {
            continue;
          }

          // Check if reminder was already sent for this match
          const reminderKey = `${match._id}-${user._id}-${minutes}`;
          if (sentReminders.has(reminderKey)) {
            continue;
          }

          // Check if user has placed bets in ALL relevant groups
          const betsCount = await Bet.countDocuments({
            user: user._id,
            match: match._id,
            group: { $in: relevantGroupIds }
          });

          // Only remind if user hasn't placed bet in at least one relevant group
          if (betsCount < relevantGroupIds.length) {
            // Get the group names where user hasn't bet
            const bets = await Bet.find({
              user: user._id,
              match: match._id,
              group: { $in: relevantGroupIds }
            });
            const bettedGroupIds = bets.map(b => b.group.toString());
            const unbettedGroupIds = relevantGroupIds.filter(gId => !bettedGroupIds.includes(gId));
            const unbettedGroups = userGroups.filter(g => unbettedGroupIds.includes(g._id.toString()));

            matchesToRemind.push({
              ...match.toObject(),
              groupNames: unbettedGroups.map(g => g.name)
            });

            // Mark as sent
            sentReminders.add(reminderKey);
          }
        }

        // Send consolidated reminder if there are matches to remind about
        if (matchesToRemind.length > 0) {
          await telegramService.sendReminder(
            user.settings.telegram.chatId,
            matchesToRemind,
            user.settings.language
          );
          console.log(`[TelegramReminder] Sent reminder to ${user.username} for ${matchesToRemind.length} matches`);
        }
      }
    }
  } catch (error) {
    console.error('[TelegramReminder] Error processing reminders:', error);
  }
};

const start = () => {
  console.log('[TelegramReminder] Starting Telegram reminder scheduler (runs every minute)...');

  // Run every minute to check for upcoming matches
  cron.schedule('* * * * *', () => {
    processReminders();
  });

  // Clean up sent reminders cache every hour
  cron.schedule('0 * * * *', () => {
    cleanupSentReminders();
  });
};

module.exports = { start, processReminders };
