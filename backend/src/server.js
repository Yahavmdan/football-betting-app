require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const matchRoutes = require('./routes/matchRoutes');
const betRoutes = require('./routes/betRoutes');
const testRoutes = require('./routes/testRoutes');
const userRoutes = require('./routes/userRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const gameRoutes = require('./routes/gameRoutes');
const autoBetJob = require('./jobs/autoBetJob');
const telegramService = require('./services/telegramService');
const telegramReminderJob = require('./jobs/telegramReminderJob');

const app = express();

connectDB();

// CORS configuration for development and production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow all localhost and local network origins for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.match(/^http:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/)) {
      return callback(null, true);
    }

    // Allow Vercel production and preview deployments
    const allowedOrigins = [
      'https://football-betting-app-six.vercel.app'
    ];

    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/test', testRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/game', gameRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Start the auto-bet scheduler
  autoBetJob.start();

  // Initialize Telegram bot
  await telegramService.init();

  // Start Telegram reminder scheduler
  telegramReminderJob.start();
});
