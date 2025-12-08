const Match = require('../models/Match');
const Group = require('../models/Group');
const axios = require('axios');

exports.getMatches = async (req, res) => {
  try {
    const { groupId } = req.query;

    let query = {};
    if (groupId) {
      query.groups = groupId;
    }

    const matches = await Match.find(query).sort({ matchDate: 1 });

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

    if (group.creator.toString() !== req.user._id.toString()) {
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

// Get available leagues
exports.getAvailableLeagues = async (req, res) => {
  try {
    const leagues = [
      { id: '4644', name: 'Israeli Premier League (Ligat Ha\'al)', country: 'Israel' }
    ];

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
