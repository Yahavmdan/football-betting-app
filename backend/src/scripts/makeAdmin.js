require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_EMAIL = 'yahavmdan@gmail.com';

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: ADMIN_EMAIL });

    if (!user) {
      console.log(`User with email ${ADMIN_EMAIL} not found`);
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`User ${user.username} is already an admin`);
      process.exit(0);
    }

    user.isAdmin = true;
    await user.save();

    console.log(`Successfully made ${user.username} (${user.email}) an admin`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

makeAdmin();
