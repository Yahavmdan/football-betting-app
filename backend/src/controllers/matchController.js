const Match = require('../models/Match');
const Group = require('../models/Group');
const axios = require('axios');
const apiFootballService = require('../services/apiFootballService');

exports.getMatches = async (req, res) => {
  try {
    const { groupId } = req.query;

    let query = {};
    if (groupId) {
      query.groups = groupId;
    }

    const matches = await Match.find(query).sort({ matchDate: 1 });

    // Auto-enrich potentially live matches with fresh API data
    const now = new Date();
    const potentiallyLiveMatches = matches.filter(match =>
      match.externalApiId &&
      match.externalApiId.startsWith('apifootball_') &&
      (match.status === 'LIVE' || (match.status === 'SCHEDULED' && new Date(match.matchDate) <= now))
    );

    if (potentiallyLiveMatches.length > 0) {
      try {
        // Fetch all live fixtures with one API call
        const liveFixtures = await apiFootballService.getLiveFixtures();

        // Update matches with fresh data
        for (const match of potentiallyLiveMatches) {
          const freshData = liveFixtures.find(f => f.externalApiId === match.externalApiId);

          if (freshData) {
            // Match is currently live - update with fresh data
            match.status = 'LIVE';
            match.result = freshData.result;
            match.elapsed = freshData.elapsed;
            match.extraTime = freshData.extraTime;
            match.statusShort = freshData.statusShort;
            await match.save();
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
                await match.save();
              }
            } catch (err) {
              console.error(`Failed to fetch final data for match ${match.externalApiId}:`, err.message);
            }
          }
        }
      } catch (apiError) {
        // If API fails, still return DB data (graceful degradation)
        console.error('Failed to fetch live data:', apiError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addMatchToGroup = async (req, res) => {
  try {
    const { matchId, groupId } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isCreator = group.creator.toString() === req.user._id.toString();
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can add matches'
      });
    }

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.groups.includes(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Match already added to this group'
      });
    }

    match.groups.push(groupId);
    await match.save();

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Fetch ALL Israeli Premier League teams dynamically
async function fetchIsraeliTeams() {
  try {
    const response = await axios.get(
      `${process.env.FOOTBALL_API_URL}/${process.env.FOOTBALL_API_KEY}/search_all_teams.php?l=Israeli Premier League`
    );

    if (response.data.teams) {
      return response.data.teams.map(team => team.idTeam);
    }
    return [];
  } catch (error) {
    console.error('Error fetching Israeli teams:', error.message);
    return [];
  }
}

// Fetch Israeli matches using league endpoint and all teams
async function fetchIsraeliMatches() {
  const israeliLeagueId = '4644'; // Israeli Premier League
  const allEvents = [];
  const seenEventIds = new Set();

  // Calculate date range: upcoming matches for the next 3 months
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  console.log('Fetching Israeli Premier League matches...');

  // Step 1: Get upcoming matches from league endpoint (most reliable for upcoming matches)
  try {
    const leagueNextResponse = await axios.get(
      `${process.env.FOOTBALL_API_URL}/${process.env.FOOTBALL_API_KEY}/eventsnextleague.php?id=${israeliLeagueId}`
    );

    console.log('League next events response:', leagueNextResponse.data.events ? leagueNextResponse.data.events.length : 0);

    if (leagueNextResponse.data.events) {
      for (const event of leagueNextResponse.data.events) {
        if (!seenEventIds.has(event.idEvent)) {
          seenEventIds.add(event.idEvent);
          allEvents.push(event);
          console.log(`Added match from league endpoint: ${event.strHomeTeam} vs ${event.strAwayTeam} on ${event.dateEvent}`);
        }
      }
    }
  } catch (leagueError) {
    console.error('League next events error:', leagueError.message);
  }

  // Step 2: Get ALL Israeli teams dynamically
  console.log('Fetching all Israeli Premier League teams...');
  const israeliTeamIds = await fetchIsraeliTeams();
  console.log(`Found ${israeliTeamIds.length} Israeli Premier League teams`);

  // Step 3: Fetch upcoming matches for each team for comprehensive coverage
  for (const teamId of israeliTeamIds) {
    try {
      // Get next events for this team
      const nextResponse = await axios.get(
        `${process.env.FOOTBALL_API_URL}/${process.env.FOOTBALL_API_KEY}/eventsnext.php?id=${teamId}`
      );

      if (nextResponse.data.events) {
        for (const event of nextResponse.data.events) {
          // Only add if from Israeli league and not already seen
          if (event.strLeague === 'Israeli Premier League' && !seenEventIds.has(event.idEvent)) {
            seenEventIds.add(event.idEvent);
            allEvents.push(event);
            console.log(`Added match from team ${teamId}: ${event.strHomeTeam} vs ${event.strAwayTeam} on ${event.dateEvent}`);
          }
        }
      }
    } catch (error) {
      // Continue with next team if this one fails
      console.error(`Error fetching matches for team ${teamId}:`, error.message);
    }
  }

  console.log(`Total unique matches found: ${allEvents.length}`);
  return allEvents;
}

// Fetch Israeli Premier League matches from TheSportsDB API
// Uses league endpoint for upcoming matches and team endpoints for comprehensive coverage
// Only fetches UPCOMING matches (not started yet) for the next 3 months
exports.fetchAndSaveMatches = async (req, res) => {
  try {
    // Only Israeli league is supported
    const events = await fetchIsraeliMatches();

    if (!events || events.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No upcoming Israeli Premier League matches found (next 3 months).',
        data: []
      });
    }

    const savedMatches = [];
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const now = new Date();

    for (const eventData of events) {
      // Only process soccer/football events
      if (eventData.strSport !== 'Soccer') continue;

      // Skip matches that have already started or finished
      // Check for scores (if scores exist, match has started/finished)
      const hasScores = (eventData.intHomeScore !== null && eventData.intHomeScore !== '') ||
                        (eventData.intAwayScore !== null && eventData.intAwayScore !== '');

      // Check status - skip if match is in progress or finished
      const statusesToSkip = ['1H', '2H', 'HT', 'FT', 'AET', 'PEN', 'LIVE'];
      if (statusesToSkip.includes(eventData.strStatus)) continue;

      // Skip if match has scores
      if (hasScores) continue;

      // Parse match date/time
      const matchDateTime = new Date(eventData.dateEvent + (eventData.strTime ? ' ' + eventData.strTime : ''));

      // Only include future matches (not started yet)
      if (matchDateTime <= now) continue;

      // Check if within 3 months range
      if (matchDateTime > threeMonthsFromNow) continue;

      const existingMatch = await Match.findOne({ externalApiId: eventData.idEvent });

      if (!existingMatch) {
        const match = await Match.create({
          externalApiId: eventData.idEvent,
          homeTeam: eventData.strHomeTeam,
          awayTeam: eventData.strAwayTeam,
          matchDate: matchDateTime,
          status: 'SCHEDULED',
          competition: eventData.strLeague,
          season: eventData.strSeason
        });
        savedMatches.push(match);
      }
    }

    res.status(200).json({
      success: true,
      message: `${savedMatches.length} upcoming Israeli Premier League matches saved (next 3 months)`,
      data: savedMatches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update match results from TheSportsDB API for Israeli Premier League
exports.updateMatchResults = async (req, res) => {
  try {
    // Fetch Israeli matches to update results
    const events = await fetchIsraeliMatches();

    if (!events || events.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No Israeli Premier League matches found to update',
        data: []
      });
    }

    const updatedMatches = [];

    for (const eventData of events) {
      // Only process soccer/football events that have finished
      if (eventData.strSport !== 'Soccer') continue;
      if (!eventData.intHomeScore && !eventData.intAwayScore) continue;
      if (eventData.intHomeScore === null || eventData.intAwayScore === null) continue;

      const match = await Match.findOne({ externalApiId: eventData.idEvent });

      if (match && match.status !== 'FINISHED') {
        const homeScore = parseInt(eventData.intHomeScore);
        const awayScore = parseInt(eventData.intAwayScore);

        let outcome;
        if (homeScore > awayScore) {
          outcome = '1';
        } else if (homeScore < awayScore) {
          outcome = '2';
        } else {
          outcome = 'X';
        }

        match.status = 'FINISHED';
        match.result = {
          homeScore,
          awayScore,
          outcome
        };

        await match.save();
        updatedMatches.push(match);
      }
    }

    res.status(200).json({
      success: true,
      message: `${updatedMatches.length} Israeli Premier League matches updated with results`,
      data: updatedMatches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get available leagues (hard-coded list, no API call)
exports.getAvailableLeagues = async (req, res) => {
  try {
    const leagues = apiFootballService.getSupportedLeagues();

    res.status(200).json({
      success: true,
      data: leagues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Clear fixture cache for a league (for testing/debugging)
exports.clearLeagueCache = async (req, res) => {
  try {
    const { leagueId, season } = req.query;

    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leagueId'
      });
    }

    await apiFootballService.clearCache(leagueId, season ? parseInt(season) : null);

    res.status(200).json({
      success: true,
      message: `Cache cleared for league ${leagueId}`,
      currentSeason: apiFootballService.getCurrentSeason()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Search leagues by country (for finding correct league IDs)
exports.searchLeagues = async (req, res) => {
  try {
    const { country } = req.query;

    if (!country) {
      return res.status(400).json({
        success: false,
        message: 'Please provide country name'
      });
    }

    const leagues = await apiFootballService.searchLeaguesByCountry(country);

    res.status(200).json({
      success: true,
      data: leagues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get teams for a specific league
exports.getLeagueTeams = async (req, res) => {
  try {
    const { leagueId, season } = req.query;

    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leagueId'
      });
    }

    const teams = await apiFootballService.getTeamsForLeague(leagueId, season ? parseInt(season) : null);

    res.status(200).json({
      success: true,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get filtered fixtures for automatic groups
exports.getFilteredFixtures = async (req, res) => {
  try {
    const { leagueId, season, dateFrom, dateTo, status, teamId, homeScore, awayScore, groupId } = req.query;

    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leagueId'
      });
    }

    const filters = {};

    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    // Parse status filter (can be comma-separated)
    const statusArray = status ? status.split(',') : [];
    if (statusArray.length > 0) {
      filters.status = statusArray;
    }

    // Single team filter (API limitation)
    if (teamId) {
      filters.teamId = teamId;
    }

    let fixtures = await apiFootballService.getFilteredFixtures(
      leagueId,
      season ? parseInt(season) : null,
      filters
    );

    // Also fetch local DB matches that might have been updated locally (e.g., LIVE status for testing)
    const localQuery = {};
    if (groupId) {
      localQuery.groups = groupId;
    }
    // Filter by status if provided
    if (statusArray.length > 0) {
      localQuery.status = { $in: statusArray };
    }
    // Filter by date range if provided
    if (dateFrom || dateTo) {
      localQuery.matchDate = {};
      if (dateFrom) localQuery.matchDate.$gte = new Date(dateFrom);
      if (dateTo) localQuery.matchDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    const localMatches = await Match.find(localQuery);

    // Merge local matches with API fixtures
    // Local matches take precedence (for status updates like LIVE)
    localMatches.forEach(localMatch => {
      const existingIndex = fixtures.findIndex(f =>
        f.externalApiId === localMatch.externalApiId
      );

      // Convert local match to API fixture format
      const localAsFixture = {
        externalApiId: localMatch.externalApiId || localMatch._id.toString(),
        homeTeam: localMatch.homeTeam,
        homeTeamId: localMatch.homeTeamId,
        homeTeamLogo: localMatch.homeTeamLogo,
        awayTeam: localMatch.awayTeam,
        awayTeamId: localMatch.awayTeamId,
        awayTeamLogo: localMatch.awayTeamLogo,
        matchDate: localMatch.matchDate,
        status: localMatch.status,
        result: localMatch.result,
        competition: localMatch.competition,
        season: localMatch.season,
        round: localMatch.round || 'Unknown',
        elapsed: localMatch.elapsed,
        extraTime: localMatch.extraTime,
        statusShort: localMatch.statusShort
      };

      if (existingIndex !== -1) {
        // Always replace API fixture with local version for LIVE matches (to get elapsed time)
        // or if status is different
        if (localMatch.status === 'LIVE' || localMatch.status !== fixtures[existingIndex].status) {
          fixtures[existingIndex] = localAsFixture;
        }
      } else {
        // Add local match if not in API results
        fixtures.push(localAsFixture);
      }
    });

    // Apply score filter locally (API doesn't support this)
    if (homeScore !== undefined || awayScore !== undefined) {
      fixtures = fixtures.filter(match => {
        if (match.status !== 'FINISHED' || !match.result) return false;

        const homeMatch = homeScore === undefined || match.result.homeScore === parseInt(homeScore);
        const awayMatch = awayScore === undefined || match.result.awayScore === parseInt(awayScore);

        return homeMatch && awayMatch;
      });
    }

    res.status(200).json({
      success: true,
      data: fixtures
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get fixtures for a specific league
exports.getLeagueFixtures = async (req, res) => {
  try {
    const { leagueId, season, scheduled, daysBack, daysForward } = req.query;

    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leagueId'
      });
    }

    let result;
    if (scheduled === 'true') {
      result = await apiFootballService.getScheduledFixtures(leagueId, season ? parseInt(season) : null);
    } else if (daysBack || daysForward) {
      // Use date range filter
      result = await apiFootballService.getFixturesInRange(
        leagueId,
        season ? parseInt(season) : null,
        daysBack ? parseInt(daysBack) : 7,
        daysForward ? parseInt(daysForward) : 7
      );
    } else {
      result = await apiFootballService.getFixtures(leagueId, season ? parseInt(season) : null);
    }

    res.status(200).json({
      success: true,
      data: result.fixtures,
      fromCache: result.fromCache,
      cachedAt: result.cachedAt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Sync league fixtures to a group
exports.syncLeagueFixturesToGroup = async (req, res) => {
  try {
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide groupId'
      });
    }

    // Find the group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member of the group
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group members can sync matches'
      });
    }

    // Check if group is automatic type
    if (group.matchType !== 'automatic') {
      return res.status(400).json({
        success: false,
        message: 'This group is not set to automatic match loading'
      });
    }

    // Check if group has a selected league
    if (!group.selectedLeague) {
      return res.status(400).json({
        success: false,
        message: 'No league selected for this group'
      });
    }

    // Get fixtures from the past week to the next week
    const { fixtures } = await apiFootballService.getFixturesInRange(
      group.selectedLeague,
      group.selectedSeason,
      7,  // days back
      7   // days forward
    );

    let addedCount = 0;
    let skippedCount = 0;
    const isRelativeGroup = group.betType === 'relative';

    for (const fixtureData of fixtures) {
      // Check if match already exists
      let match = await Match.findOne({ externalApiId: fixtureData.externalApiId });

      // For relative groups, fetch odds from API
      let oddsData = null;
      if (isRelativeGroup) {
        try {
          oddsData = await apiFootballService.getFixtureOdds(fixtureData.externalApiId);
        } catch (err) {
          console.error(`Failed to fetch odds for ${fixtureData.externalApiId}:`, err.message);
        }
      }

      if (match) {
        // Match exists, check if it's already in this group
        if (!match.groups.includes(groupId)) {
          match.groups.push(groupId);

          // Add relativePoints for this group if relative mode
          if (isRelativeGroup && oddsData) {
            // Check if relativePoints already exists for this group
            const existingRP = match.relativePoints?.find(rp => rp.group?.toString() === groupId);
            if (!existingRP) {
              if (!match.relativePoints) match.relativePoints = [];
              match.relativePoints.push({
                group: groupId,
                homeWin: oddsData.homeWin,
                draw: oddsData.draw,
                awayWin: oddsData.awayWin,
                fromApi: true
              });
            }
          }

          await match.save();
          addedCount++;
        } else {
          // Already in group, but update odds if relative mode and match not started
          if (isRelativeGroup && oddsData && match.status === 'SCHEDULED') {
            const rpIndex = match.relativePoints?.findIndex(rp => rp.group?.toString() === groupId);
            if (rpIndex >= 0) {
              match.relativePoints[rpIndex] = {
                group: groupId,
                homeWin: oddsData.homeWin,
                draw: oddsData.draw,
                awayWin: oddsData.awayWin,
                fromApi: true
              };
              await match.save();
            }
          }
          skippedCount++;
        }
      } else {
        // Create new match with all API fields
        const matchData = {
          externalApiId: fixtureData.externalApiId,
          homeTeam: fixtureData.homeTeam,
          awayTeam: fixtureData.awayTeam,
          matchDate: fixtureData.matchDate,
          status: fixtureData.status,
          competition: fixtureData.competition,
          season: fixtureData.season,
          groups: [groupId],
          // API-specific fields
          homeTeamId: fixtureData.homeTeamId,
          awayTeamId: fixtureData.awayTeamId,
          homeTeamLogo: fixtureData.homeTeamLogo,
          awayTeamLogo: fixtureData.awayTeamLogo,
          round: fixtureData.round
        };

        // Add relativePoints if relative mode
        if (isRelativeGroup && oddsData) {
          matchData.relativePoints = [{
            group: groupId,
            homeWin: oddsData.homeWin,
            draw: oddsData.draw,
            awayWin: oddsData.awayWin,
            fromApi: true
          }];
        }

        match = await Match.create(matchData);
        addedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Synced ${addedCount} matches to group (${skippedCount} already existed)`,
      data: {
        added: addedCount,
        skipped: skippedCount,
        total: fixtures.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a manual match (group admin only)
exports.createManualMatch = async (req, res) => {
  try {
    const { homeTeam, awayTeam, matchDateTime: matchDateTimeISO, matchDate, matchHour, groupId, homeScore, awayScore, relativePoints } = req.body;

    // Validate required fields - accept either matchDateTime (ISO) or matchDate+matchHour
    if (!homeTeam || !awayTeam || !groupId || (!matchDateTimeISO && (!matchDate || !matchHour))) {
      return res.status(400).json({
        success: false,
        message: 'Please provide homeTeam, awayTeam, matchDateTime (or matchDate+matchHour), and groupId'
      });
    }

    // Find the group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Automatic groups don't allow manual match creation
    if (group.matchType === 'automatic') {
      return res.status(403).json({
        success: false,
        message: 'Cannot create manual matches for automatic groups. Matches are synced automatically from the API.'
      });
    }

    // Check if user is the group creator OR is admin
    const isCreator = group.creator.toString() === req.user._id.toString();
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can add manual matches'
      });
    }

    // Validate relativePoints if group is 'relative' type
    if (group.betType === 'relative') {
      if (!relativePoints || !relativePoints.homeWin || !relativePoints.draw || !relativePoints.awayWin) {
        return res.status(400).json({
          success: false,
          message: 'For relative betting groups, please provide relativePoints (homeWin, draw, awayWin)'
        });
      }
    }

    // Use ISO datetime if provided, otherwise combine date and hour
    const matchDateTime = matchDateTimeISO ? new Date(matchDateTimeISO) : new Date(`${matchDate}T${matchHour}`);
    const isPastMatch = matchDateTime <= new Date();

    // If match is in the past, require scores
    if (isPastMatch && (homeScore === undefined || awayScore === undefined || homeScore === null || awayScore === null)) {
      return res.status(400).json({
        success: false,
        message: 'Past matches require home and away scores'
      });
    }

    // Determine outcome for past matches
    let result = null;
    let status = 'SCHEDULED';

    if (isPastMatch) {
      const hScore = parseInt(homeScore);
      const aScore = parseInt(awayScore);
      let outcome;

      if (hScore > aScore) {
        outcome = '1';
      } else if (hScore < aScore) {
        outcome = '2';
      } else {
        outcome = 'X';
      }

      result = {
        homeScore: hScore,
        awayScore: aScore,
        outcome
      };
      status = 'FINISHED';
    }

    // Prepare relativePoints array for the match
    const matchRelativePoints = [];
    if (group.betType === 'relative' && relativePoints) {
      matchRelativePoints.push({
        group: groupId,
        homeWin: parseFloat(relativePoints.homeWin),
        draw: parseFloat(relativePoints.draw),
        awayWin: parseFloat(relativePoints.awayWin)
      });
    }

    // Create the match with a unique manual ID
    const match = await Match.create({
      externalApiId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      homeTeam,
      awayTeam,
      matchDate: matchDateTime,
      status,
      result,
      competition: 'Manual Match',
      groups: [groupId],
      relativePoints: matchRelativePoints
    });

    res.status(201).json({
      success: true,
      message: isPastMatch ? 'Past match added with result' : 'Manual match created successfully',
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update match score (group admin only, 2 hours after match start)
exports.updateMatchScore = async (req, res) => {
  try {
    const { matchId, groupId, homeScore, awayScore } = req.body;

    // Validate required fields
    if (!matchId || !groupId || homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide matchId, groupId, homeScore, and awayScore'
      });
    }

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if match belongs to group
    if (!match.groups.includes(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Match does not belong to this group'
      });
    }

    // Find the group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Automatic groups don't allow manual score updates
    if (group.matchType === 'automatic') {
      return res.status(403).json({
        success: false,
        message: 'Cannot manually update scores for automatic groups. Scores are updated automatically from the API.'
      });
    }

    // Check if user is the group creator OR is admin
    const isCreator = group.creator.toString() === req.user._id.toString();
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can update match scores'
      });
    }

    // Check if match already has a final result
    if (match.status === 'FINISHED') {
      return res.status(400).json({
        success: false,
        message: 'Match is already marked as finished'
      });
    }

    // Check if match has started
    const matchDate = new Date(match.matchDate);
    const now = new Date();

    if (now < matchDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update score before match starts.'
      });
    }

    // Calculate outcome
    const hScore = parseInt(homeScore);
    const aScore = parseInt(awayScore);
    let outcome;

    if (hScore > aScore) {
      outcome = '1';
    } else if (hScore < aScore) {
      outcome = '2';
    } else {
      outcome = 'X';
    }

    // Update match score but keep it as SCHEDULED (ongoing)
    match.result = {
      homeScore: hScore,
      awayScore: aScore,
      outcome
    };
    await match.save();

    res.status(200).json({
      success: true,
      message: 'Match score updated successfully',
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark match as finished and calculate points
exports.markMatchAsFinished = async (req, res) => {
  try {
    const { matchId, groupId } = req.body;

    // Validate required fields
    if (!matchId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide matchId and groupId'
      });
    }

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if match belongs to group
    if (!match.groups.includes(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Match does not belong to this group'
      });
    }

    // Find the group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Automatic groups don't allow manual marking as finished
    if (group.matchType === 'automatic') {
      return res.status(403).json({
        success: false,
        message: 'Cannot manually mark matches as finished for automatic groups. Match status is updated automatically from the API.'
      });
    }

    // Check if user is the group creator OR is admin
    const isCreator = group.creator.toString() === req.user._id.toString();
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can mark matches as finished'
      });
    }

    // Check if match is already finished
    if (match.status === 'FINISHED') {
      return res.status(400).json({
        success: false,
        message: 'Match is already marked as finished'
      });
    }

    // Check if match has a score
    if (!match.result || match.result.homeScore === null || match.result.awayScore === null) {
      return res.status(400).json({
        success: false,
        message: 'Please update the match score before marking as finished'
      });
    }

    // Mark match as finished
    match.status = 'FINISHED';
    await match.save();

    // Calculate points for all bets on this match in this group
    const Bet = require('../models/Bet');
    const calculatePoints = require('../utils/calculatePoints');

    const bets = await Bet.find({ match: matchId, group: groupId, calculated: false });
    let totalCalculated = 0;

    // Get relative points for this match and group (if applicable)
    const matchRelativePoints = match.relativePoints.find(
      rp => rp.group.toString() === groupId
    );

    for (const bet of bets) {
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
        await group.save();
      }

      totalCalculated++;
    }

    res.status(200).json({
      success: true,
      message: `Match marked as finished. Calculated points for ${totalCalculated} bets.`,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a match (group admin only)
exports.deleteMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { groupId } = req.body;

    if (!matchId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide matchId and groupId'
      });
    }

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if match belongs to group
    if (!match.groups.includes(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Match does not belong to this group'
      });
    }

    // Find the group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Automatic groups don't allow manual match deletion
    if (group.matchType === 'automatic') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete matches for automatic groups. Matches are managed automatically from the API.'
      });
    }

    // Check if user is the group creator OR is admin
    const isCreator = group.creator.toString() === req.user._id.toString();
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can delete matches'
      });
    }

    // Delete all bets associated with this match in this group
    const Bet = require('../models/Bet');
    await Bet.deleteMany({ match: matchId, group: groupId });

    // Remove group from match's groups array
    match.groups = match.groups.filter(g => g.toString() !== groupId);

    if (match.groups.length === 0) {
      // If no more groups, delete the match entirely
      await Match.findByIdAndDelete(matchId);
    } else {
      await match.save();
    }

    res.status(200).json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Edit a match (group admin only)
exports.editMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { groupId, homeTeam, awayTeam, matchDateTime: matchDateTimeISO, matchDate, matchHour, relativePoints } = req.body;

    if (!matchId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide matchId and groupId'
      });
    }

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if match belongs to group
    if (!match.groups.includes(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Match does not belong to this group'
      });
    }

    // Find the group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Automatic groups don't allow manual match editing
    if (group.matchType === 'automatic') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit matches for automatic groups. Match data is managed automatically from the API.'
      });
    }

    // Check if user is the group creator OR is admin
    const isCreator = group.creator.toString() === req.user._id.toString();
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can edit matches'
      });
    }

    // Update fields if provided
    if (homeTeam) match.homeTeam = homeTeam;
    if (awayTeam) match.awayTeam = awayTeam;
    // Use ISO datetime if provided, otherwise use date+hour
    if (matchDateTimeISO) {
      match.matchDate = new Date(matchDateTimeISO);
    } else if (matchDate && matchHour) {
      match.matchDate = new Date(`${matchDate}T${matchHour}`);
    }

    // Update relative points if provided (for relative betting groups)
    if (relativePoints && group.betType === 'relative') {
      // Find existing relativePoints entry for this group
      const existingIndex = match.relativePoints.findIndex(rp => rp.group.toString() === groupId);

      if (existingIndex !== -1) {
        // Update existing entry
        match.relativePoints[existingIndex].homeWin = relativePoints.homeWin || 1;
        match.relativePoints[existingIndex].draw = relativePoints.draw || 1;
        match.relativePoints[existingIndex].awayWin = relativePoints.awayWin || 1;
      } else {
        // Add new entry
        match.relativePoints.push({
          group: groupId,
          homeWin: relativePoints.homeWin || 1,
          draw: relativePoints.draw || 1,
          awayWin: relativePoints.awayWin || 1
        });
      }
    }

    await match.save();

    res.status(200).json({
      success: true,
      message: 'Match updated successfully',
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// TEST ONLY: Set match as LIVE for testing purposes
exports.setMatchLive = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { homeScore, awayScore } = req.body;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Set match as LIVE with current score
    match.status = 'LIVE';
    match.result = {
      homeScore: homeScore !== undefined ? homeScore : 1,
      awayScore: awayScore !== undefined ? awayScore : 0,
      outcome: null
    };

    await match.save();

    res.status(200).json({
      success: true,
      message: 'Match set to LIVE for testing',
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get head-to-head history between two teams
exports.getHeadToHead = async (req, res) => {
  try {
    const { homeTeam, awayTeam, homeTeamId, awayTeamId } = req.query;

    // If team IDs are provided, use API-Football for H2H
    if (homeTeamId && awayTeamId) {
      try {
        const h2hMatches = await apiFootballService.getHeadToHead(homeTeamId, awayTeamId, 5);
        return res.status(200).json({
          success: true,
          data: h2hMatches,
          source: 'api'
        });
      } catch (apiError) {
        console.error('API H2H failed, falling back to local DB:', apiError.message);
        // Fall through to local DB query
      }
    }

    if (!homeTeam || !awayTeam) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both homeTeam and awayTeam (or homeTeamId and awayTeamId)'
      });
    }

    // Find matches where these two teams played against each other (in any order)
    // Only return finished matches with results
    const matches = await Match.find({
      status: 'FINISHED',
      'result.homeScore': { $ne: null },
      'result.awayScore': { $ne: null },
      $or: [
        { homeTeam: homeTeam, awayTeam: awayTeam },
        { homeTeam: awayTeam, awayTeam: homeTeam }
      ]
    })
    .sort({ matchDate: -1 })
    .limit(5)
    .select('homeTeam awayTeam matchDate result competition');

    res.status(200).json({
      success: true,
      data: matches,
      source: 'local'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get recent matches for a team (last 5 matches)
exports.getTeamRecentMatches = async (req, res) => {
  try {
    const { team, teamId } = req.query;

    // If team ID is provided, use API-Football
    if (teamId) {
      try {
        const recentMatches = await apiFootballService.getTeamRecentMatches(teamId, 5);
        return res.status(200).json({
          success: true,
          data: recentMatches,
          source: 'api'
        });
      } catch (apiError) {
        console.error('API team recent failed, falling back to local DB:', apiError.message);
        // Fall through to local DB query
      }
    }

    if (!team) {
      return res.status(400).json({
        success: false,
        message: 'Please provide team name or teamId'
      });
    }

    // Find last 5 finished matches where this team played (home or away)
    const matches = await Match.find({
      status: 'FINISHED',
      'result.homeScore': { $ne: null },
      'result.awayScore': { $ne: null },
      $or: [
        { homeTeam: team },
        { awayTeam: team }
      ]
    })
    .sort({ matchDate: -1 })
    .limit(5)
    .select('homeTeam awayTeam matchDate result competition');

    res.status(200).json({
      success: true,
      data: matches,
      source: 'local'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all currently live fixtures worldwide from API-Football
exports.getLiveFixtures = async (req, res) => {
  try {
    const liveFixtures = await apiFootballService.getLiveFixtures();

    res.status(200).json({
      success: true,
      data: liveFixtures,
      count: liveFixtures.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Refresh live matches in a group with fresh data from API
exports.refreshLiveMatches = async (req, res) => {
  try {
    const { groupId } = req.params;
    const now = new Date();

    // Get matches that are either:
    // 1. Already marked as LIVE
    // 2. SCHEDULED but matchDate is in the past (potentially started)
    const potentiallyLiveMatches = await Match.find({
      groups: groupId,
      $or: [
        { status: 'LIVE' },
        { status: 'SCHEDULED', matchDate: { $lte: now } }
      ],
      // Only consider matches with externalApiId (from API)
      externalApiId: { $exists: true, $ne: null }
    });

    if (potentiallyLiveMatches.length === 0) {
      // Return all matches even if no live matches to refresh
      const allMatches = await Match.find({ groups: groupId }).sort({ matchDate: 1 });
      return res.status(200).json({
        success: true,
        message: 'No live matches to refresh',
        data: allMatches
      });
    }

    // Fetch fresh live data from API
    const freshLiveFixtures = await apiFootballService.getLiveFixtures();

    // Update each match with fresh data
    const updatedMatches = [];
    for (const match of potentiallyLiveMatches) {
      const freshData = freshLiveFixtures.find(f => f.externalApiId === match.externalApiId);

      if (freshData) {
        // Match is live - update with fresh data
        match.status = 'LIVE';
        match.result = freshData.result;
        match.elapsed = freshData.elapsed;
        match.extraTime = freshData.extraTime;
        match.statusShort = freshData.statusShort;
        await match.save();
        updatedMatches.push(match);
      } else if (match.status === 'LIVE') {
        // Match was LIVE but is no longer in live API - it has likely finished
        // Mark as FINISHED and set final outcome
        match.status = 'FINISHED';
        match.elapsed = null;
        match.extraTime = null;
        match.statusShort = 'FT';

        // Set the outcome based on the score
        if (match.result && match.result.homeScore !== null && match.result.awayScore !== null) {
          if (match.result.homeScore > match.result.awayScore) {
            match.result.outcome = '1';
          } else if (match.result.homeScore < match.result.awayScore) {
            match.result.outcome = '2';
          } else {
            match.result.outcome = 'X';
          }
        }

        await match.save();
        updatedMatches.push(match);
      }
      // Note: If match is SCHEDULED but not in live API, leave it as SCHEDULED
      // It might not have started yet or might be from a different source
    }

    // Return all matches for the group (not just live)
    const allMatches = await Match.find({ groups: groupId }).sort({ matchDate: 1 });

    res.status(200).json({
      success: true,
      message: `Refreshed ${updatedMatches.length} live matches`,
      data: allMatches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Refresh a single match with fresh data from API (efficient - 1 API call per match)
exports.refreshSingleMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { groupId } = req.query; // Optional: specific group to refresh odds for

    // Try to find by MongoDB _id first, then by externalApiId
    let match;
    if (matchId.startsWith('apifootball_')) {
      match = await Match.findOne({ externalApiId: matchId });
    } else {
      match = await Match.findById(matchId);
    }

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Only refresh matches that have externalApiId (from API)
    if (!match.externalApiId) {
      return res.status(400).json({
        success: false,
        message: 'This match is not from the API and cannot be refreshed'
      });
    }

    // Fetch fresh data for this specific fixture (1 API call)
    const freshData = await apiFootballService.getFixtureById(match.externalApiId);

    if (!freshData) {
      return res.status(404).json({
        success: false,
        message: 'Could not fetch fresh data for this match'
      });
    }

    // Update match with fresh data
    match.status = freshData.status;
    match.statusShort = freshData.statusShort;
    match.elapsed = freshData.elapsed;
    match.extraTime = freshData.extraTime;

    // Update result if available
    if (freshData.result && (freshData.result.homeScore !== null || freshData.result.awayScore !== null)) {
      match.result = freshData.result;
    }

    // Fetch and update odds for relative groups
    if (match.groups && match.groups.length > 0) {
      // Get groups to check which are relative
      const groupsToCheck = groupId
        ? [await Group.findById(groupId)]
        : await Group.find({ _id: { $in: match.groups } });

      const relativeGroups = groupsToCheck.filter(g => g && g.betType === 'relative');

      if (relativeGroups.length > 0) {
        // Fetch fresh odds from API
        const oddsData = await apiFootballService.getFixtureOdds(match.externalApiId);

        if (oddsData) {
          // Update relativePoints for each relative group
          for (const group of relativeGroups) {
            const existingIndex = match.relativePoints.findIndex(
              rp => rp.group.toString() === group._id.toString()
            );

            const newOdds = {
              group: group._id,
              homeWin: oddsData.homeWin,
              draw: oddsData.draw,
              awayWin: oddsData.awayWin,
              fromApi: true
            };

            if (existingIndex !== -1) {
              match.relativePoints[existingIndex] = newOdds;
            } else {
              match.relativePoints.push(newOdds);
            }
          }
        }
      }
    }

    await match.save();

    res.status(200).json({
      success: true,
      message: 'Match refreshed successfully',
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add live fixtures to a group for testing
exports.addLiveFixturesToGroup = async (req, res) => {
  try {
    const { groupId, limit = 5 } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide groupId'
      });
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Fetch live fixtures
    const liveFixtures = await apiFootballService.getLiveFixtures();

    if (liveFixtures.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No live fixtures available at the moment',
        data: []
      });
    }

    // Add first N live fixtures to the group
    const fixturesToAdd = liveFixtures.slice(0, limit);
    const addedMatches = [];

    for (const fixture of fixturesToAdd) {
      // Check if match already exists
      let match = await Match.findOne({ externalApiId: fixture.externalApiId });

      if (match) {
        // Update existing match and add to group if not already
        match.status = 'LIVE';
        match.result = fixture.result;
        match.elapsed = fixture.elapsed;
        match.extraTime = fixture.extraTime;
        match.statusShort = fixture.statusShort;
        if (!match.groups.includes(groupId)) {
          match.groups.push(groupId);
        }
        await match.save();
      } else {
        // Create new match
        match = new Match({
          ...fixture,
          groups: [groupId]
        });
        await match.save();
      }
      addedMatches.push(match);
    }

    res.status(200).json({
      success: true,
      message: `Added ${addedMatches.length} live fixtures to group`,
      data: addedMatches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get league standings/table
exports.getLeagueStandings = async (req, res) => {
  try {
    const { leagueId, season } = req.query;

    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leagueId'
      });
    }

    const standings = await apiFootballService.getLeagueStandings(
      leagueId,
      season ? parseInt(season) : null
    );

    if (!standings) {
      return res.status(404).json({
        success: false,
        message: 'Standings not available for this league'
      });
    }

    res.status(200).json({
      success: true,
      data: standings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
