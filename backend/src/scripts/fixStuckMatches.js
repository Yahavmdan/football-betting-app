/**
 * Fix Stuck Matches Script
 *
 * Finds matches that should have finished but are still marked as LIVE or SCHEDULED,
 * fetches their current status from API-Football, and updates them.
 *
 * Usage: cd backend && node src/scripts/fixStuckMatches.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Match = require('../models/Match');
const Group = require('../models/Group');
const Bet = require('../models/Bet');
const apiFootballService = require('../services/apiFootballService');
const calculatePoints = require('../utils/calculatePoints');

// Helper: Calculate bet points for a match that just finished
async function calculateBetsForFinishedMatch(match) {
  if (!match || match.status !== 'FINISHED' || !match.result || match.result.outcome === null) {
    return 0;
  }

  const bets = await Bet.find({ match: match._id, calculated: false });
  if (bets.length === 0) return 0;

  const groups = await Group.find({ _id: { $in: match.groups } });
  const groupMap = {};
  groups.forEach(g => { groupMap[g._id.toString()] = g; });

  let totalCalculated = 0;

  for (const bet of bets) {
    const group = groupMap[bet.group.toString()];
    if (!group) continue;

    const matchRelativePoints = match.relativePoints
      ? match.relativePoints.find(rp => rp.group && rp.group.toString() === bet.group.toString())
      : null;

    const points = calculatePoints(
      bet.prediction,
      match.result,
      group.betType,
      matchRelativePoints,
      bet.wagerAmount
    );

    bet.points = points;
    bet.calculated = true;
    await bet.save();

    const memberIndex = group.members.findIndex(
      m => m.user.toString() === bet.user.toString()
    );

    if (memberIndex !== -1) {
      group.members[memberIndex].points += points;
      await group.save({ validateModifiedOnly: true });
    }

    totalCalculated++;
  }

  return totalCalculated;
}

async function fixStuckMatches() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const now = new Date();
    // Look for matches that started more than 3 hours ago (should have finished by now)
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Find stuck matches
    const stuckMatches = await Match.find({
      status: { $in: ['LIVE', 'SCHEDULED'] },
      matchDate: { $lt: threeHoursAgo },
      externalApiId: { $exists: true, $regex: /^apifootball_/ }
    });

    console.log(`Found ${stuckMatches.length} stuck matches\n`);

    if (stuckMatches.length === 0) {
      console.log('No stuck matches to fix!');
      process.exit(0);
    }

    let fixedCount = 0;
    let errorCount = 0;

    for (const match of stuckMatches) {
      console.log(`Processing: ${match.homeTeam} vs ${match.awayTeam} (${match.status})`);
      console.log(`  Match date: ${match.matchDate}`);
      console.log(`  External ID: ${match.externalApiId}`);

      try {
        // Fetch current status from API
        const freshData = await apiFootballService.getFixtureById(match.externalApiId);

        if (freshData) {
          const oldStatus = match.status;
          match.status = freshData.status;
          match.result = freshData.result;
          match.elapsed = freshData.elapsed;
          match.extraTime = freshData.extraTime;
          match.statusShort = freshData.statusShort;
          if (freshData.round) match.round = freshData.round;

          await match.save();

          console.log(`  Updated: ${oldStatus} -> ${freshData.status}`);
          if (freshData.result) {
            console.log(`  Score: ${freshData.result.homeScore}-${freshData.result.awayScore}`);
          }

          // Calculate bets if match is now finished
          if (match.status === 'FINISHED' && match.result && match.result.outcome) {
            const betsCalculated = await calculateBetsForFinishedMatch(match);
            if (betsCalculated > 0) {
              console.log(`  Calculated ${betsCalculated} bets`);
            }
          }

          fixedCount++;
        } else {
          console.log(`  WARNING: Could not fetch data from API`);
          errorCount++;
        }
      } catch (err) {
        console.log(`  ERROR: ${err.message}`);
        errorCount++;
      }

      console.log('');

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('=== Summary ===');
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Errors: ${errorCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixStuckMatches();
