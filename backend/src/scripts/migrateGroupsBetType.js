require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Group = require('../models/Group');

async function migrateGroupsBetType() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all groups that don't have betType set
    const groups = await Group.find({
      $or: [
        { betType: { $exists: false } },
        { betType: null }
      ]
    });

    if (groups.length === 0) {
      console.log('No groups to migrate - all groups already have betType set');
      process.exit(0);
    }

    console.log(`Found ${groups.length} groups to migrate`);

    // Update all groups to have betType: 'classic'
    const result = await Group.updateMany(
      {
        $or: [
          { betType: { $exists: false } },
          { betType: null }
        ]
      },
      { $set: { betType: 'classic' } }
    );

    console.log(`Successfully migrated ${result.modifiedCount} groups to 'classic' bet type`);
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

migrateGroupsBetType();
