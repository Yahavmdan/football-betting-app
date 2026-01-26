const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Match = require('../models/Match');
const FixtureCache = require('../models/FixtureCache');
const Bet = require('../models/Bet');

const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = '9db1098dbfd9fb7f2b28db8dd673c245';

async function cleanAndFetchLive() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Step 1: Show current data counts
    const matchCount = await Match.countDocuments();
    const cacheCount = await FixtureCache.countDocuments();
    const betCount = await Bet.countDocuments();

    console.log('=== Current Database State ===');
    console.log(`Matches: ${matchCount}`);
    console.log(`Fixture Cache entries: ${cacheCount}`);
    console.log(`Bets: ${betCount}`);
    console.log('');

    // Step 2: Clean matches and cache (keep bets for now)
    console.log('=== Cleaning Database ===');
    const deletedMatches = await Match.deleteMany({});
    console.log(`Deleted ${deletedMatches.deletedCount} matches`);

    const deletedCache = await FixtureCache.deleteMany({});
    console.log(`Deleted ${deletedCache.deletedCount} cache entries`);
    console.log('');

    // Step 3: Fetch all currently LIVE games from API-Football
    console.log('=== Fetching LIVE Games from API-Football ===');

    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      headers: {
        'x-apisports-key': API_KEY
      },
      params: {
        live: 'all'  // Get all live games worldwide
      }
    });

    const liveGames = response.data?.response || [];
    console.log(`Found ${liveGames.length} live games worldwide\n`);

    if (liveGames.length === 0) {
      console.log('No live games at the moment. Try again when there are live matches.');
      console.log('\nTip: Check https://www.api-football.com/demo to see current live games');
      process.exit(0);
    }

    // Display live games grouped by league
    const gamesByLeague = {};
    liveGames.forEach(game => {
      const leagueName = game.league.name;
      if (!gamesByLeague[leagueName]) {
        gamesByLeague[leagueName] = [];
      }
      gamesByLeague[leagueName].push(game);
    });

    console.log('=== Live Games by League ===\n');
    Object.entries(gamesByLeague).forEach(([league, games]) => {
      console.log(`📺 ${league} (${games[0].league.country})`);
      games.forEach(game => {
        const homeTeam = game.teams.home.name;
        const awayTeam = game.teams.away.name;
        const homeScore = game.goals.home ?? 0;
        const awayScore = game.goals.away ?? 0;
        const status = game.fixture.status.short;
        const elapsed = game.fixture.status.elapsed || 0;
        console.log(`   ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} [${status} ${elapsed}']`);
        console.log(`   League ID: ${game.league.id}, Fixture ID: ${game.fixture.id}`);
      });
      console.log('');
    });

    // Save first few live games to database for testing
    console.log('=== Saving Live Games to Database ===\n');
    const gamesToSave = liveGames.slice(0, 5); // Save first 5 live games

    for (const game of gamesToSave) {
      const match = new Match({
        externalApiId: `apifootball_${game.fixture.id}`,
        homeTeam: game.teams.home.name,
        homeTeamId: game.teams.home.id,
        homeTeamLogo: game.teams.home.logo,
        awayTeam: game.teams.away.name,
        awayTeamId: game.teams.away.id,
        awayTeamLogo: game.teams.away.logo,
        matchDate: new Date(game.fixture.date),
        status: 'LIVE',
        result: {
          homeScore: game.goals.home ?? 0,
          awayScore: game.goals.away ?? 0,
          outcome: null
        },
        competition: game.league.name,
        season: game.league.season,
        round: game.league.round || 'Live',
        groups: [] // No group association yet
      });

      await match.save();
      console.log(`Saved: ${match.homeTeam} vs ${match.awayTeam} (LIVE)`);
    }

    console.log(`\nSaved ${gamesToSave.length} live games to database`);
    console.log('\nNote: These matches are not associated with any group yet.');
    console.log('To test with a group, create an automatic group and the matches will sync.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

cleanAndFetchLive();
