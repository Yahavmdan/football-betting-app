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

// Fetch Israeli matches by querying team events (workaround for API bug)
async function fetchIsraeliMatches() {
  const israeliLeagueId = '4644'; // Israeli Premier League

  // List of major Israeli Premier League team IDs
  const israeliTeamIds = [
    '134315', // Maccabi Tel Aviv
    '134400', // Maccabi Haifa
    '135992', // Beitar Jerusalem
    '135234', // Hapoel Be'er Sheva
    '135991', // Hapoel Tel Aviv
    '133629', // Maccabi Petah Tikva
    '135236', // Hapoel Haifa
    '134688', // Maccabi Netanya
    '134687', // Bnei Sakhnin
    '135235'  // FC Ashdod
  ];

  const allEvents = [];
  const seenEventIds = new Set();

  // Calculate date range: past matches to 3 months in the future
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  // First, try to get upcoming matches directly from the league endpoint
  try {
    const leagueNextResponse = await axios.get(
      `${process.env.FOOTBALL_API_URL}/${process.env.FOOTBALL_API_KEY}/eventsnextleague.php?id=${israeliLeagueId}`
    );

    if (leagueNextResponse.data.events) {
      for (const event of leagueNextResponse.data.events) {
        if (!seenEventIds.has(event.idEvent)) {
          const matchDate = new Date(event.dateEvent);
          if (matchDate <= threeMonthsFromNow) {
            seenEventIds.add(event.idEvent);
            allEvents.push(event);
          }
        }
      }
    }
  } catch (leagueError) {
    console.log('League next events endpoint not available, using team-based approach');
  }

  // Also fetch from team endpoints for more complete coverage
  for (const teamId of israeliTeamIds) {
    try {
      // Get last events for each team
      const lastResponse = await axios.get(
        `${process.env.FOOTBALL_API_URL}/${process.env.FOOTBALL_API_KEY}/eventslast.php?id=${teamId}`
      );

      if (lastResponse.data.results) {
        for (const event of lastResponse.data.results) {
          // Only add if from Israeli league, not already seen, and within date range
          if (event.strLeague === 'Israeli Premier League' && !seenEventIds.has(event.idEvent)) {
            const matchDate = new Date(event.dateEvent);
            if (matchDate <= threeMonthsFromNow) {
              seenEventIds.add(event.idEvent);
              allEvents.push(event);
            }
          }
        }
      }

      // Try to get next events
      try {
        const nextResponse = await axios.get(
          `${process.env.FOOTBALL_API_URL}/${process.env.FOOTBALL_API_KEY}/eventsnext.php?id=${teamId}`
        );

        if (nextResponse.data.events) {
          for (const event of nextResponse.data.events) {
            if (event.strLeague === 'Israeli Premier League' && !seenEventIds.has(event.idEvent)) {
              const matchDate = new Date(event.dateEvent);
              if (matchDate <= threeMonthsFromNow) {
                seenEventIds.add(event.idEvent);
                allEvents.push(event);
              }
            }
          }
        }
      } catch (nextError) {
        // Next events might not be available, continue
      }
    } catch (error) {
      console.error(`Error fetching matches for team ${teamId}:`, error.message);
    }
  }

  return allEvents;
}

// Fetch Israeli Premier League matches from TheSportsDB API
// Uses league endpoint for upcoming matches and team endpoints for comprehensive coverage
// Shows matches from past to 3 months in the future
exports.fetchAndSaveMatches = async (req, res) => {
  try {
    // Only Israeli league is supported
    const events = await fetchIsraeliMatches();

    if (!events || events.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No Israeli Premier League matches found within the date range (past to 3 months future).',
        data: []
      });
    }

    const savedMatches = [];
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    for (const eventData of events) {
      // Only process soccer/football events
      if (eventData.strSport !== 'Soccer') continue;

      // Double-check date range (past to 3 months in future)
      const matchDate = new Date(eventData.dateEvent);
      if (matchDate > threeMonthsFromNow) continue;

      const existingMatch = await Match.findOne({ externalApiId: eventData.idEvent });

      if (!existingMatch) {
        // Check if match has results
        const hasResult = eventData.intHomeScore !== null && eventData.intAwayScore !== null;
        const homeScore = hasResult ? parseInt(eventData.intHomeScore) : null;
        const awayScore = hasResult ? parseInt(eventData.intAwayScore) : null;

        let outcome = null;
        if (hasResult) {
          if (homeScore > awayScore) outcome = '1';
          else if (homeScore < awayScore) outcome = '2';
          else outcome = 'X';
        }

        const match = await Match.create({
          externalApiId: eventData.idEvent,
          homeTeam: eventData.strHomeTeam,
          awayTeam: eventData.strAwayTeam,
          matchDate: new Date(eventData.dateEvent + (eventData.strTime ? ' ' + eventData.strTime : '')),
          status: hasResult ? 'FINISHED' : 'SCHEDULED',
          competition: eventData.strLeague,
          season: eventData.strSeason,
          ...(hasResult && {
            result: {
              homeScore,
              awayScore,
              outcome
            }
          })
        });
        savedMatches.push(match);
      }
    }

    res.status(200).json({
      success: true,
      message: `${savedMatches.length} Israeli Premier League matches saved (from past to 3 months future)`,
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
