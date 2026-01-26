const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Match = require('../models/Match');
const Group = require('../models/Group');

const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = '9db1098dbfd9fb7f2b28db8dd673c245';

async function addLiveToGroup() {
  try {
    // Get group ID from command line args
    const groupId = process.argv[2];

    if (!groupId) {
      console.log('Usage: node addLiveToGroup.js <groupId>');
      console.log('\nFetching available groups...\n');

      await mongoose.connect(process.env.MONGODB_URI);
      const groups = await Group.find({}).select('_id name matchType');

      if (groups.length === 0) {
        console.log('No groups found. Create a group first.');
      } else {
        console.log('Available groups:');
        groups.forEach(g => {
          console.log(`  ${g._id} - ${g.name} (${g.matchType})`);
        });
        console.log('\nRun: node addLiveToGroup.js <groupId>');
      }
      process.exit(0);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      console.log(`Group not found: ${groupId}`);
      process.exit(1);
    }
    console.log(`Found group: ${group.name}\n`);

    // Fetch live games
    console.log('Fetching live games from API-Football...\n');
    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      headers: { 'x-apisports-key': API_KEY },
      params: { live: 'all' }
    });

    const liveGames = response.data?.response || [];
    console.log(`Found ${liveGames.length} live games worldwide\n`);

    if (liveGames.length === 0) {
      console.log('No live games at the moment. Try again later.');
      process.exit(0);
    }

    // Display live games
    console.log('=== Live Games ===\n');
    liveGames.forEach((game, index) => {
      const home = game.teams.home.name;
      const away = game.teams.away.name;
      const homeScore = game.goals.home ?? 0;
      const awayScore = game.goals.away ?? 0;
      const status = game.fixture.status.short;
      const elapsed = game.fixture.status.elapsed || 0;
      const league = game.league.name;

      console.log(`${index + 1}. ${home} ${homeScore}-${awayScore} ${away}`);
      console.log(`   ${league} | ${status} ${elapsed}'`);
      console.log('');
    });

    // Add all live games to the group
    console.log(`\nAdding ${liveGames.length} live games to group "${group.name}"...\n`);

    let added = 0;
    let updated = 0;

    for (const game of liveGames) {
      const externalApiId = `apifootball_${game.fixture.id}`;

      let match = await Match.findOne({ externalApiId });

      if (match) {
        // Update existing match
        match.status = 'LIVE';
        match.result = {
          homeScore: game.goals.home ?? 0,
          awayScore: game.goals.away ?? 0,
          outcome: null
        };
        match.elapsed = game.fixture.status.elapsed || 0;
        match.extraTime = game.fixture.status.extra || null;
        match.statusShort = game.fixture.status.short;
        if (!match.groups.some(g => g.toString() === groupId)) {
          match.groups.push(groupId);
        }
        await match.save();
        updated++;
      } else {
        // Create new match
        match = new Match({
          externalApiId,
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
          elapsed: game.fixture.status.elapsed || 0,
          extraTime: game.fixture.status.extra || null,
          statusShort: game.fixture.status.short,
          competition: game.league.name,
          season: game.league.season,
          round: game.league.round || 'Live',
          groups: [groupId]
        });
        await match.save();
        added++;
      }
    }

    console.log(`Done! Added ${added} new matches, updated ${updated} existing matches.`);
    console.log(`\nGo to your group "${group.name}" and filter by "Ongoing" to see the live games.`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addLiveToGroup();
