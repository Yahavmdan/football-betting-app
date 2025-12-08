const axios = require('axios');

// Test endpoint to check TheSportsDB API for Israeli league
exports.testIsraeliLeague = async (req, res) => {
  try {
    const apiKey = process.env.FOOTBALL_API_KEY;
    const baseUrl = process.env.FOOTBALL_API_URL;

    // Try different possible Israeli league IDs
    const possibleIds = ['4485', '4480', '4554'];
    const results = {};

    for (const leagueId of possibleIds) {
      try {
        // Test next events
        const nextResponse = await axios.get(`${baseUrl}/${apiKey}/eventsnextleague.php?id=${leagueId}`);
        results[`league_${leagueId}_next`] = {
          hasEvents: !!nextResponse.data.events,
          eventCount: nextResponse.data.events ? nextResponse.data.events.length : 0,
          events: nextResponse.data.events ? nextResponse.data.events.slice(0, 2) : null
        };

        // Test past events
        const pastResponse = await axios.get(`${baseUrl}/${apiKey}/eventspastleague.php?id=${leagueId}`);
        results[`league_${leagueId}_past`] = {
          hasEvents: !!pastResponse.data.events,
          eventCount: pastResponse.data.events ? pastResponse.data.events.length : 0,
          events: pastResponse.data.events ? pastResponse.data.events.slice(0, 2) : null
        };
      } catch (error) {
        results[`league_${leagueId}_error`] = error.message;
      }
    }

    // Also try to lookup league by name
    try {
      const searchResponse = await axios.get(`${baseUrl}/${apiKey}/search_all_leagues.php?c=Israel`);
      results.israelLeagueSearch = searchResponse.data;
    } catch (error) {
      results.searchError = error.message;
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Search for all soccer leagues
exports.searchAllLeagues = async (req, res) => {
  try {
    const apiKey = process.env.FOOTBALL_API_KEY;
    const baseUrl = process.env.FOOTBALL_API_URL;
    const { country } = req.query;

    const response = await axios.get(`${baseUrl}/${apiKey}/search_all_leagues.php?c=${country || 'Israel'}`);

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
