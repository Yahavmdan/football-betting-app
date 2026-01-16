require('dotenv').config({path: require('path').join(__dirname, '../../.env')});
const mongoose = require('mongoose');
const Group = require('../models/Group');

async function migrateGroupsShowBets() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all groups that don't have showBets set
        const groups = await Group.find({
            $or: [
                {showBets: {$exists: false}},
                {showBets: null}
            ]
        });

        if (groups.length === 0) {
            console.log('No groups to migrate - all groups already have showBets set');
            process.exit(0);
        }

        console.log(`Found ${groups.length} groups to migrate`);

        // Update all groups to have showBets: true
        const result = await Group.updateMany(
            {
                $or: [
                    {showBets: {$exists: false}},
                    {showBets: null}
                ]
            },
            {$set: {showBets: true}}
        );

        console.log(`Successfully migrated ${result.modifiedCount} groups to showBets: true`);
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error.message);
        process.exit(1);
    }
}

migrateGroupsShowBets();
