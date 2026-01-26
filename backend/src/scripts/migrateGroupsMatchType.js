require('dotenv').config({path: require('path').join(__dirname, '../../.env')});
const mongoose = require('mongoose');
const Group = require('../models/Group');

async function migrateGroupsMatchType() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all groups that don't have matchType set
        const groups = await Group.find({
            $or: [
                {matchType: {$exists: false}},
                {matchType: null}
            ]
        });

        if (groups.length === 0) {
            console.log('No groups to migrate - all groups already have matchType set');
            process.exit(0);
        }

        console.log(`Found ${groups.length} groups to migrate`);

        // Update all groups to have matchType: 'manual'
        const result = await Group.updateMany(
            {
                $or: [
                    {matchType: {$exists: false}},
                    {matchType: null}
                ]
            },
            {$set: {matchType: 'manual'}}
        );

        console.log(`Successfully migrated ${result.modifiedCount} groups to matchType: 'manual'`);
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error.message);
        process.exit(1);
    }
}

migrateGroupsMatchType();
