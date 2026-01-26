const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Match = require('../models/Match');

async function setFirstMatchLive() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    console.log('URI:', mongoUri ? mongoUri.replace(/\/\/.*@/, '//<credentials>@') : 'NOT SET');

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find the first scheduled match that belongs to a group
    const match = await Match.findOne({
      status: 'SCHEDULED',
      groups: { $exists: true, $ne: [] }
    }).sort({ matchDate: 1 });

    if (!match) {
      console.log('No scheduled match found that belongs to a group');
      console.log('Trying to find any scheduled match...');

      const anyMatch = await Match.findOne({ status: 'SCHEDULED' }).sort({ matchDate: 1 });
      if (!anyMatch) {
        console.log('No scheduled matches found at all');
        process.exit(1);
      }

      console.log(`Found match without group: ${anyMatch.homeTeam} vs ${anyMatch.awayTeam}`);
      console.log(`Match ID: ${anyMatch._id}`);
      console.log(`Groups: ${anyMatch.groups}`);

      // Set it as LIVE
      anyMatch.status = 'LIVE';
      anyMatch.result = {
        homeScore: 1,
        awayScore: 0,
        outcome: null
      };

      await anyMatch.save();
      console.log('Match set to LIVE with score 1-0');
      process.exit(0);
    }

    console.log(`Found match: ${match.homeTeam} vs ${match.awayTeam}`);
    console.log(`Match ID: ${match._id}`);
    console.log(`Groups: ${match.groups}`);

    // Set it as LIVE with a score
    match.status = 'LIVE';
    match.result = {
      homeScore: 1,
      awayScore: 0,
      outcome: null
    };

    await match.save();
    console.log('Match set to LIVE with score 1-0');
    console.log('Updated match:', JSON.stringify(match, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

setFirstMatchLive();
