const axios = require('axios');
const FixtureCache = require('../models/FixtureCache');

const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = '9db1098dbfd9fb7f2b28db8dd673c245';

// Hard-coded supported leagues (no API calls needed)
const SUPPORTED_LEAGUES = [
  // Israeli Leagues (verified IDs from API-Football)
  { id: '383', name: "Ligat Ha'al", nameHe: 'ליגת העל', country: 'Israel', countryHe: 'ישראל', logo: 'https://media.api-sports.io/football/leagues/383.png' },
  { id: '382', name: 'Liga Leumit', nameHe: 'ליגה לאומית', country: 'Israel', countryHe: 'ישראל', logo: 'https://media.api-sports.io/football/leagues/382.png' },
  // Top European Leagues
  { id: '39', name: 'Premier League', nameHe: 'פרמייר ליג', country: 'England', countryHe: 'אנגליה', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { id: '140', name: 'La Liga', nameHe: 'לה ליגה', country: 'Spain', countryHe: 'ספרד', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { id: '135', name: 'Serie A', nameHe: 'סרייה א', country: 'Italy', countryHe: 'איטליה', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { id: '78', name: 'Bundesliga', nameHe: 'בונדסליגה', country: 'Germany', countryHe: 'גרמניה', logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { id: '61', name: 'Ligue 1', nameHe: 'ליג 1', country: 'France', countryHe: 'צרפת', logo: 'https://media.api-sports.io/football/leagues/61.png' },
  // European Tournaments
  { id: '2', name: 'Champions League', nameHe: 'ליגת האלופות', country: 'Europe', countryHe: 'אירופה', logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { id: '3', name: 'Europa League', nameHe: 'ליגה אירופית', country: 'Europe', countryHe: 'אירופה', logo: 'https://media.api-sports.io/football/leagues/3.png' },
  // International Tournaments
  { id: '1', name: 'World Cup', nameHe: 'מונדיאל', country: 'World', countryHe: 'עולם', logo: 'https://media.api-sports.io/football/leagues/1.png' },
  { id: '4', name: 'Euro Championship', nameHe: 'יורו', country: 'Europe', countryHe: 'אירופה', logo: 'https://media.api-sports.io/football/leagues/4.png' }
];

// Map API-Football status to our status
function mapStatus(apiStatus) {
  const statusMap = {
    'TBD': 'SCHEDULED',
    'NS': 'SCHEDULED',
    '1H': 'LIVE',
    'HT': 'LIVE',
    '2H': 'LIVE',
    'ET': 'LIVE',
    'BT': 'LIVE',
    'P': 'LIVE',
    'SUSP': 'POSTPONED',
    'INT': 'POSTPONED',
    'FT': 'FINISHED',
    'AET': 'FINISHED',
    'PEN': 'FINISHED',
    'PST': 'POSTPONED',
    'CANC': 'CANCELLED',
    'ABD': 'CANCELLED',
    'AWD': 'FINISHED',
    'WO': 'FINISHED',
    'LIVE': 'LIVE'
  };
  return statusMap[apiStatus] || 'SCHEDULED';
}

// Get current season year
function getCurrentSeason() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  // Football seasons typically start in August, so if we're before August, use previous year
  return month < 7 ? year - 1 : year;
}

// Get all supported leagues (no API call)
function getSupportedLeagues() {
  return SUPPORTED_LEAGUES;
}

// Check if league is supported
function isLeagueSupported(leagueId) {
  return SUPPORTED_LEAGUES.some(league => league.id === leagueId);
}

// Fetch fixtures from API-Football
async function fetchFixturesFromAPI(leagueId, season) {
  try {
    const url = `${API_BASE_URL}/fixtures`;
    const params = {
      league: leagueId,
      season: season
    };

    console.log('=== API-Football Request ===');
    console.log('URL:', url);
    console.log('Params:', params);
    console.log('Full URL:', `${url}?league=${leagueId}&season=${season}`);

    const response = await axios.get(url, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params
    });

    console.log('API Response - Total fixtures:', response.data?.response?.length || 0);
    console.log('API Response - Errors:', response.data?.errors);

    if (response.data && response.data.response) {
      return response.data.response;
    }
    return [];
  } catch (error) {
    console.error('Error fetching fixtures from API-Football:', error.message);
    throw error;
  }
}

// Get fixtures with caching
async function getFixtures(leagueId, season = null) {
  if (!isLeagueSupported(leagueId)) {
    throw new Error('League not supported');
  }

  const currentSeason = season || getCurrentSeason();

  // Check cache first
  const cached = await FixtureCache.findOne({ leagueId, season: currentSeason });

  if (cached) {
    console.log(`Cache hit for league ${leagueId}, season ${currentSeason}`);
    return {
      fixtures: cached.fixtures,
      fromCache: true,
      cachedAt: cached.cachedAt
    };
  }

  console.log(`Cache miss for league ${leagueId}, season ${currentSeason}. Fetching from API...`);

  // Fetch from API
  const apiFixtures = await fetchFixturesFromAPI(leagueId, currentSeason);

  // Transform fixtures to our format
  const transformedFixtures = apiFixtures.map(fixture => {
    const status = mapStatus(fixture.fixture.status.short);
    const isFinished = ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(fixture.fixture.status.short);
    const isLive = status === 'LIVE';

    // Include scores for both finished and live matches
    let result = null;
    if (isFinished || isLive) {
      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;
      result = {
        homeScore: homeScore,
        awayScore: awayScore,
        outcome: isFinished && homeScore !== null && awayScore !== null
          ? (homeScore > awayScore ? '1' : homeScore < awayScore ? '2' : 'X')
          : null
      };
    }

    return {
      externalApiId: `apifootball_${fixture.fixture.id}`,
      homeTeam: fixture.teams.home.name,
      homeTeamId: fixture.teams.home.id,
      homeTeamLogo: fixture.teams.home.logo,
      awayTeam: fixture.teams.away.name,
      awayTeamId: fixture.teams.away.id,
      awayTeamLogo: fixture.teams.away.logo,
      matchDate: new Date(fixture.fixture.date),
      status: status,
      statusShort: fixture.fixture.status.short,
      elapsed: fixture.fixture.status.elapsed,
      extraTime: fixture.fixture.status.extra,
      result: result,
      competition: fixture.league.name,
      leagueId: fixture.league.id,
      season: fixture.league.season,
      round: fixture.league.round,
      venue: fixture.fixture.venue?.name || null
    };
  });

  // Save to cache
  await FixtureCache.findOneAndUpdate(
    { leagueId, season: currentSeason },
    {
      leagueId,
      season: currentSeason,
      fixtures: transformedFixtures,
      cachedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return {
    fixtures: transformedFixtures,
    fromCache: false,
    cachedAt: new Date()
  };
}

// Get only scheduled (upcoming) fixtures
async function getScheduledFixtures(leagueId, season = null) {
  const { fixtures, fromCache, cachedAt } = await getFixtures(leagueId, season);

  const now = new Date();
  const scheduledFixtures = fixtures.filter(fixture => {
    const matchDate = new Date(fixture.matchDate);
    return matchDate > now && fixture.status === 'SCHEDULED';
  });

  // Sort by date (nearest first)
  scheduledFixtures.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

  return {
    fixtures: scheduledFixtures,
    fromCache,
    cachedAt
  };
}

// Get fixtures within a date range (default: past week to next week)
async function getFixturesInRange(leagueId, season = null, daysBack = 7, daysForward = 7) {
  const { fixtures, fromCache, cachedAt } = await getFixtures(leagueId, season);

  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - daysBack);
  pastDate.setHours(0, 0, 0, 0);

  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + daysForward);
  futureDate.setHours(23, 59, 59, 999);

  const filteredFixtures = fixtures.filter(fixture => {
    const matchDate = new Date(fixture.matchDate);
    return matchDate >= pastDate && matchDate <= futureDate;
  });

  // Sort by date (earliest first)
  filteredFixtures.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

  return {
    fixtures: filteredFixtures,
    fromCache,
    cachedAt
  };
}

// Clear cache for a league (useful for manual refresh)
async function clearCache(leagueId, season = null) {
  const currentSeason = season || getCurrentSeason();
  await FixtureCache.deleteOne({ leagueId, season: currentSeason });
}

// Get teams for a specific league
async function getTeamsForLeague(leagueId, season = null) {
  const currentSeason = season || getCurrentSeason();

  try {
    const response = await axios.get(`${API_BASE_URL}/teams`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        league: leagueId,
        season: currentSeason
      }
    });

    console.log(`Found ${response.data?.response?.length || 0} teams for league ${leagueId}, season ${currentSeason}`);

    if (response.data && response.data.response) {
      return response.data.response.map(item => ({
        id: item.team.id,
        name: item.team.name,
        code: item.team.code,
        logo: item.team.logo,
        country: item.team.country
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    throw error;
  }
}

// Get filtered fixtures from API (for automatic groups)
async function getFilteredFixtures(leagueId, season = null, filters = {}) {
  const currentSeason = season || getCurrentSeason();

  const params = {
    league: leagueId,
    season: currentSeason
  };

  // Validate and swap dates if reversed
  let { dateFrom, dateTo } = filters;
  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    if (fromDate > toDate) {
      console.log(`Swapping reversed dates: ${dateFrom} <-> ${dateTo}`);
      [dateFrom, dateTo] = [dateTo, dateFrom];
    }
  }

  // Add date filters
  if (dateFrom) {
    params.from = dateFrom;
  }
  if (dateTo) {
    params.to = dateTo;
  }

  // Add status filter
  if (filters.status) {
    // Map our status values to API status codes
    const statusMap = {
      'FINISHED': 'FT-AET-PEN',
      'SCHEDULED': 'NS-TBD',
      'LIVE': '1H-HT-2H-ET-BT-P'
    };

    if (Array.isArray(filters.status)) {
      const apiStatuses = filters.status.map(s => statusMap[s] || s).join('-');
      params.status = apiStatuses;
    } else {
      params.status = statusMap[filters.status] || filters.status;
    }
  }

  // Add team filter (single team only - API limitation)
  if (filters.teamId) {
    params.team = filters.teamId;
  }

  try {
    console.log('=== Filtered API Request ===');
    console.log('Params:', params);

    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params
    });

    console.log('API Response - Total fixtures:', response.data?.response?.length || 0);

    if (response.data && response.data.response) {
      // Transform fixtures to our format
      const transformedFixtures = response.data.response.map(fixture => {
        const status = mapStatus(fixture.fixture.status.short);
        const isFinished = ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(fixture.fixture.status.short);
        const isLive = status === 'LIVE';

        // Include scores for both finished and live matches
        let result = null;
        if (isFinished || isLive) {
          const homeScore = fixture.goals.home;
          const awayScore = fixture.goals.away;
          result = {
            homeScore: homeScore,
            awayScore: awayScore,
            outcome: isFinished && homeScore !== null && awayScore !== null
              ? (homeScore > awayScore ? '1' : homeScore < awayScore ? '2' : 'X')
              : null
          };
        }

        return {
          externalApiId: `apifootball_${fixture.fixture.id}`,
          homeTeam: fixture.teams.home.name,
          homeTeamId: fixture.teams.home.id,
          homeTeamLogo: fixture.teams.home.logo,
          awayTeam: fixture.teams.away.name,
          awayTeamId: fixture.teams.away.id,
          awayTeamLogo: fixture.teams.away.logo,
          matchDate: new Date(fixture.fixture.date),
          status: status,
          statusShort: fixture.fixture.status.short,
          elapsed: fixture.fixture.status.elapsed,
          extraTime: fixture.fixture.status.extra,
          result: result,
          competition: fixture.league.name,
          leagueId: fixture.league.id,
          season: fixture.league.season,
          round: fixture.league.round,
          venue: fixture.fixture.venue?.name || null
        };
      });

      // Sort by date
      transformedFixtures.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

      return transformedFixtures;
    }
    return [];
  } catch (error) {
    console.error('Error fetching filtered fixtures:', error.message);
    throw error;
  }
}

// Search leagues by country (for finding correct league IDs)
async function searchLeaguesByCountry(country) {
  try {
    const response = await axios.get(`${API_BASE_URL}/leagues`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        country: country
      }
    });

    console.log(`Found ${response.data?.response?.length || 0} leagues for country: ${country}`);

    if (response.data && response.data.response) {
      return response.data.response.map(item => ({
        id: item.league.id,
        name: item.league.name,
        type: item.league.type,
        logo: item.league.logo,
        country: item.country.name
      }));
    }
    return [];
  } catch (error) {
    console.error('Error searching leagues:', error.message);
    throw error;
  }
}

// Get all currently live fixtures worldwide
async function getLiveFixtures() {
  try {
    console.log('=== Fetching LIVE Fixtures ===');

    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        live: 'all'
      }
    });

    console.log('API Response - Live fixtures:', response.data?.response?.length || 0);

    if (response.data && response.data.response) {
      return response.data.response.map(fixture => ({
        externalApiId: `apifootball_${fixture.fixture.id}`,
        homeTeam: fixture.teams.home.name,
        homeTeamId: fixture.teams.home.id,
        homeTeamLogo: fixture.teams.home.logo,
        awayTeam: fixture.teams.away.name,
        awayTeamId: fixture.teams.away.id,
        awayTeamLogo: fixture.teams.away.logo,
        matchDate: new Date(fixture.fixture.date),
        status: 'LIVE',
        result: {
          homeScore: fixture.goals.home ?? 0,
          awayScore: fixture.goals.away ?? 0,
          outcome: null
        },
        elapsed: fixture.fixture.status.elapsed,
        extraTime: fixture.fixture.status.extra,
        statusShort: fixture.fixture.status.short,
        competition: fixture.league.name,
        leagueId: fixture.league.id,
        season: fixture.league.season,
        round: fixture.league.round || 'Live',
        venue: fixture.fixture.venue?.name || null
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching live fixtures:', error.message);
    throw error;
  }
}

// Get head-to-head matches between two teams
async function getHeadToHead(team1Id, team2Id, last = 5) {
  try {
    console.log(`=== Fetching H2H: ${team1Id} vs ${team2Id} ===`);

    const response = await axios.get(`${API_BASE_URL}/fixtures/headtohead`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        h2h: `${team1Id}-${team2Id}`,
        last: last
      }
    });

    console.log('API Response - H2H fixtures:', response.data?.response?.length || 0);

    if (response.data && response.data.response) {
      return response.data.response.map(fixture => ({
        externalApiId: `apifootball_${fixture.fixture.id}`,
        homeTeam: fixture.teams.home.name,
        homeTeamId: fixture.teams.home.id,
        homeTeamLogo: fixture.teams.home.logo,
        awayTeam: fixture.teams.away.name,
        awayTeamId: fixture.teams.away.id,
        awayTeamLogo: fixture.teams.away.logo,
        matchDate: new Date(fixture.fixture.date),
        status: mapStatus(fixture.fixture.status.short),
        result: {
          homeScore: fixture.goals.home,
          awayScore: fixture.goals.away,
          outcome: fixture.goals.home > fixture.goals.away ? '1' :
                   fixture.goals.home < fixture.goals.away ? '2' : 'X'
        },
        competition: fixture.league.name,
        season: fixture.league.season
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching H2H:', error.message);
    throw error;
  }
}

// Get recent matches for a team
async function getTeamRecentMatches(teamId, last = 5) {
  try {
    console.log(`=== Fetching recent matches for team ${teamId} ===`);

    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        team: teamId,
        last: last,
        status: 'FT-AET-PEN' // Only finished matches
      }
    });

    console.log('API Response - Team recent matches:', response.data?.response?.length || 0);

    if (response.data && response.data.response) {
      return response.data.response.map(fixture => ({
        externalApiId: `apifootball_${fixture.fixture.id}`,
        homeTeam: fixture.teams.home.name,
        homeTeamId: fixture.teams.home.id,
        homeTeamLogo: fixture.teams.home.logo,
        awayTeam: fixture.teams.away.name,
        awayTeamId: fixture.teams.away.id,
        awayTeamLogo: fixture.teams.away.logo,
        matchDate: new Date(fixture.fixture.date),
        status: 'FINISHED',
        result: {
          homeScore: fixture.goals.home,
          awayScore: fixture.goals.away,
          outcome: fixture.goals.home > fixture.goals.away ? '1' :
                   fixture.goals.home < fixture.goals.away ? '2' : 'X'
        },
        competition: fixture.league.name,
        season: fixture.league.season
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching team recent matches:', error.message);
    throw error;
  }
}

// Get a single fixture by its API ID (efficient for refreshing individual matches)
// fixtureId should be the numeric ID, not the full externalApiId
async function getFixtureById(fixtureId) {
  try {
    // Extract numeric ID if full externalApiId is passed
    const numericId = fixtureId.toString().replace('apifootball_', '');

    console.log(`=== Fetching single fixture: ${numericId} ===`);

    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        id: numericId
      }
    });

    console.log('API Response - Fixture found:', response.data?.response?.length > 0);

    if (response.data && response.data.response && response.data.response.length > 0) {
      const fixture = response.data.response[0];
      return {
        externalApiId: `apifootball_${fixture.fixture.id}`,
        homeTeam: fixture.teams.home.name,
        homeTeamId: fixture.teams.home.id,
        homeTeamLogo: fixture.teams.home.logo,
        awayTeam: fixture.teams.away.name,
        awayTeamId: fixture.teams.away.id,
        awayTeamLogo: fixture.teams.away.logo,
        matchDate: new Date(fixture.fixture.date),
        status: mapStatus(fixture.fixture.status.short),
        statusShort: fixture.fixture.status.short,
        elapsed: fixture.fixture.status.elapsed,
        extraTime: fixture.fixture.status.extra,
        result: {
          homeScore: fixture.goals.home,
          awayScore: fixture.goals.away,
          outcome: fixture.goals.home > fixture.goals.away ? '1' :
                   fixture.goals.home < fixture.goals.away ? '2' :
                   fixture.goals.home !== null ? 'X' : null
        },
        competition: fixture.league.name,
        leagueId: fixture.league.id,
        season: fixture.league.season,
        round: fixture.league.round,
        venue: fixture.fixture.venue?.name || null
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching fixture by ID:', error.message);
    throw error;
  }
}

// Get league standings/table
async function getLeagueStandings(leagueId, season = null) {
  const currentSeason = season || getCurrentSeason();

  try {
    console.log(`=== Fetching standings for league ${leagueId}, season ${currentSeason} ===`);

    const response = await axios.get(`${API_BASE_URL}/standings`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        league: leagueId,
        season: currentSeason
      }
    });

    console.log('API Response - Standings found:', response.data?.response?.length > 0);

    if (response.data && response.data.response && response.data.response.length > 0) {
      const leagueData = response.data.response[0];
      const standings = leagueData.league.standings[0]; // First standings group (for leagues without groups)

      return {
        league: {
          id: leagueData.league.id,
          name: leagueData.league.name,
          country: leagueData.league.country,
          logo: leagueData.league.logo,
          flag: leagueData.league.flag,
          season: leagueData.league.season
        },
        standings: standings.map(team => ({
          rank: team.rank,
          team: {
            id: team.team.id,
            name: team.team.name,
            logo: team.team.logo
          },
          points: team.points,
          goalsDiff: team.goalsDiff,
          form: team.form,
          description: team.description,
          played: team.all.played,
          won: team.all.win,
          drawn: team.all.draw,
          lost: team.all.lose,
          goalsFor: team.all.goals.for,
          goalsAgainst: team.all.goals.against
        }))
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching standings:', error.message);
    throw error;
  }
}

// Get odds for a fixture (for relative points calculation)
async function getFixtureOdds(fixtureId) {
  try {
    // Extract numeric ID if full externalApiId is passed
    const numericId = fixtureId.toString().replace('apifootball_', '');

    console.log(`=== Fetching odds for fixture: ${numericId} ===`);

    const response = await axios.get(`${API_BASE_URL}/odds`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        fixture: numericId
      }
    });

    if (response.data && response.data.response && response.data.response.length > 0) {
      const oddsData = response.data.response[0];

      // Find "Match Winner" bet from any bookmaker
      for (const bookmaker of oddsData.bookmakers || []) {
        const matchWinnerBet = bookmaker.bets.find(bet => bet.name === 'Match Winner');
        if (matchWinnerBet) {
          const homeOdd = matchWinnerBet.values.find(v => v.value === 'Home');
          const drawOdd = matchWinnerBet.values.find(v => v.value === 'Draw');
          const awayOdd = matchWinnerBet.values.find(v => v.value === 'Away');

          if (homeOdd && drawOdd && awayOdd) {
            return {
              homeWin: parseFloat(homeOdd.odd),
              draw: parseFloat(drawOdd.odd),
              awayWin: parseFloat(awayOdd.odd),
              bookmaker: bookmaker.name,
              updatedAt: oddsData.update
            };
          }
        }
      }
    }

    // Return default odds if not available
    console.log(`No odds found for fixture ${numericId}, using defaults`);
    return {
      homeWin: 1,
      draw: 1,
      awayWin: 1,
      bookmaker: null,
      updatedAt: null
    };
  } catch (error) {
    console.error('Error fetching odds:', error.message);
    // Return defaults on error
    return {
      homeWin: 1,
      draw: 1,
      awayWin: 1,
      bookmaker: null,
      updatedAt: null
    };
  }
}

// Get odds for multiple fixtures (batch)
async function getFixturesOdds(fixtureIds) {
  const oddsMap = {};

  // API doesn't support batch odds, so we fetch one by one
  // But we limit to avoid too many API calls
  const limitedIds = fixtureIds.slice(0, 20);

  for (const fixtureId of limitedIds) {
    const numericId = fixtureId.toString().replace('apifootball_', '');
    oddsMap[fixtureId] = await getFixtureOdds(numericId);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return oddsMap;
}

module.exports = {
  getSupportedLeagues,
  isLeagueSupported,
  getFixtures,
  getScheduledFixtures,
  getFixturesInRange,
  getFilteredFixtures,
  getTeamsForLeague,
  clearCache,
  getCurrentSeason,
  searchLeaguesByCountry,
  getLiveFixtures,
  getHeadToHead,
  getTeamRecentMatches,
  getFixtureById,
  getLeagueStandings,
  getFixtureOdds,
  getFixturesOdds
};
