/**
 * Live Match Refresh Job
 *
 * Runs every minute to:
 * 1. Find all matches that are LIVE or should have started
 * 2. Fetch fresh data from API-Football
 * 3. Update match status, scores, and elapsed time
 * 4. Auto-calculate bet points when matches finish
 */

const cron = require('node-cron');
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

  // Load all groups this match belongs to (for betType and relativePoints)
  const groups = await Group.find({ _id: { $in: match.groups } });
  const groupMap = {};
  groups.forEach(g => { groupMap[g._id.toString()] = g; });

  let totalCalculated = 0;

  for (const bet of bets) {
    const group = groupMap[bet.group.toString()];
    if (!group) continue;

    // Get relative points for this match and group (if applicable)
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

    // Update user points/credits in group
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

// Main refresh function
async function refreshLiveMatches() {
  try {
    const now = new Date();
    // Only look at matches that started within the last 3 hours
    // A football match is ~2 hours max, so 3 hours gives buffer
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Find matches that are either:
    // 1. Already marked as LIVE
    // 2. SCHEDULED and started within the last 3 hours (not old stale matches)
    // Only consider matches from API (have externalApiId starting with apifootball_)
    const potentiallyLiveMatches = await Match.find({
      $or: [
        { status: 'LIVE' },
        {
          status: 'SCHEDULED',
          matchDate: { $gte: threeHoursAgo, $lte: now },
          externalApiId: { $regex: /^apifootball_/ }
        }
      ],
      externalApiId: { $exists: true, $regex: /^apifootball_/ }
    });

    if (potentiallyLiveMatches.length === 0) {
      return { updated: 0, finished: 0, message: 'No live matches to refresh' };
    }

    console.log(`[LiveRefresh] Found ${potentiallyLiveMatches.length} potentially live matches`);

    // Fetch all currently live fixtures from API (single API call)
    const liveFixtures = await apiFootballService.getLiveFixtures();
    console.log(`[LiveRefresh] API returned ${liveFixtures.length} live fixtures worldwide`);

    let updatedCount = 0;
    let finishedCount = 0;

    for (const match of potentiallyLiveMatches) {
      const freshData = liveFixtures.find(f => f.externalApiId === match.externalApiId);

      if (freshData) {
        // Match is currently live - update with fresh data
        const wasNotLive = match.status !== 'LIVE';

        match.status = 'LIVE';
        match.result = freshData.result;
        match.elapsed = freshData.elapsed;
        match.extraTime = freshData.extraTime;
        match.statusShort = freshData.statusShort;
        if (freshData.round) match.round = freshData.round;
        if (freshData.homeTeamId) match.homeTeamId = freshData.homeTeamId;
        if (freshData.awayTeamId) match.awayTeamId = freshData.awayTeamId;
        if (freshData.homeTeamLogo) match.homeTeamLogo = freshData.homeTeamLogo;
        if (freshData.awayTeamLogo) match.awayTeamLogo = freshData.awayTeamLogo;

        await match.save();
        updatedCount++;

        if (wasNotLive) {
          console.log(`[LiveRefresh] Match started: ${match.homeTeam} vs ${match.awayTeam}`);
        } else {
          console.log(`[LiveRefresh] Updated: ${match.homeTeam} ${match.result?.homeScore}-${match.result?.awayScore} ${match.awayTeam} (${match.elapsed}')`);
        }
      } else if (match.status === 'LIVE') {
        // Match was LIVE but no longer in live API - it likely finished
        // Fetch individual fixture to get final result
        try {
          const finalData = await apiFootballService.getFixtureById(match.externalApiId);

          if (finalData) {
            match.status = finalData.status;
            match.result = finalData.result;
            match.elapsed = finalData.elapsed;
            match.extraTime = finalData.extraTime;
            match.statusShort = finalData.statusShort;
            if (finalData.round) match.round = finalData.round;

            await match.save();

            // Auto-calculate bet points when match transitions to FINISHED
            if (match.status === 'FINISHED' && match.result && match.result.outcome) {
              const betsCalculated = await calculateBetsForFinishedMatch(match);
              console.log(`[LiveRefresh] Match finished: ${match.homeTeam} ${match.result?.homeScore}-${match.result?.awayScore} ${match.awayTeam}. Calculated ${betsCalculated} bets.`);
              finishedCount++;
            }
          }
        } catch (err) {
          console.error(`[LiveRefresh] Failed to fetch final data for ${match.externalApiId}:`, err.message);
        }
      }
      // If match is SCHEDULED but not in live API, leave it as SCHEDULED
      // It might not have started yet
    }

    return {
      updated: updatedCount,
      finished: finishedCount,
      message: `Refreshed ${updatedCount} live matches, ${finishedCount} finished`
    };
  } catch (error) {
    console.error('[LiveRefresh] Error:', error.message);
    return { updated: 0, finished: 0, error: error.message };
  }
}

// Track state to avoid unnecessary logging
let lastCheckHadLiveMatches = false;

async function checkAndRefresh() {
  const now = new Date();

  // Only check matches that:
  // 1. Are already LIVE (confirmed to be playing)
  // 2. Are SCHEDULED and started within the last 3 hours (typical match duration + buffer)
  // This prevents API calls for old stale SCHEDULED matches
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  // First, check if there are any LIVE matches (most important)
  const liveMatchCount = await Match.countDocuments({
    status: 'LIVE',
    externalApiId: { $exists: true, $regex: /^apifootball_/ }
  });

  // Then check for SCHEDULED matches that should have started recently
  const recentlyStartedCount = await Match.countDocuments({
    status: 'SCHEDULED',
    matchDate: { $gte: threeHoursAgo, $lte: now },
    externalApiId: { $exists: true, $regex: /^apifootball_/ }
  });

  const totalToCheck = liveMatchCount + recentlyStartedCount;

  if (totalToCheck === 0) {
    if (lastCheckHadLiveMatches) {
      console.log('[LiveRefresh] No live matches to track - pausing API calls');
      lastCheckHadLiveMatches = false;
    }
    return;
  }

  if (!lastCheckHadLiveMatches) {
    console.log(`[LiveRefresh] Found matches to track (${liveMatchCount} live, ${recentlyStartedCount} recently started)`);
  }

  lastCheckHadLiveMatches = true;
  await refreshLiveMatches();
}

// Fix stuck matches (matches that should have finished but weren't updated)
async function fixStuckMatches() {
  try {
    const now = new Date();
    // Look for matches that started more than 3 hours ago but are still LIVE or SCHEDULED
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stuckMatches = await Match.find({
      status: { $in: ['LIVE', 'SCHEDULED'] },
      matchDate: { $gte: oneDayAgo, $lt: threeHoursAgo },
      externalApiId: { $exists: true, $regex: /^apifootball_/ }
    });

    if (stuckMatches.length === 0) return;

    console.log(`[LiveRefresh] Found ${stuckMatches.length} stuck matches to fix`);

    for (const match of stuckMatches) {
      try {
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

          console.log(`[LiveRefresh] Fixed stuck match: ${match.homeTeam} vs ${match.awayTeam} (${oldStatus} -> ${freshData.status})`);

          // Calculate bets if match is now finished
          if (match.status === 'FINISHED' && match.result && match.result.outcome) {
            const betsCalculated = await calculateBetsForFinishedMatch(match);
            if (betsCalculated > 0) {
              console.log(`[LiveRefresh] Calculated ${betsCalculated} bets for fixed match`);
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`[LiveRefresh] Failed to fix stuck match ${match.externalApiId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[LiveRefresh] Error fixing stuck matches:', error.message);
  }
}

// Cron jobs
let liveJob = null;
let cleanupJob = null;

function start() {
  if (liveJob) {
    console.log('[LiveRefresh] Job already running');
    return;
  }

  // Run every minute for live matches
  liveJob = cron.schedule('* * * * *', async () => {
    await checkAndRefresh();
  });

  // Run every hour to fix any stuck matches
  cleanupJob = cron.schedule('0 * * * *', async () => {
    console.log('[LiveRefresh] Running hourly cleanup for stuck matches');
    await fixStuckMatches();
  });

  console.log('[LiveRefresh] Live match refresh job started (every minute + hourly cleanup)');

  // Run immediately on startup
  checkAndRefresh();

  // Also fix stuck matches on startup
  fixStuckMatches();
}

function stop() {
  if (liveJob) {
    liveJob.stop();
    liveJob = null;
  }
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
  }
  console.log('[LiveRefresh] Live match refresh jobs stopped');
}

module.exports = {
  start,
  stop,
  refreshLiveMatches,
  checkAndRefresh,
  fixStuckMatches
};
