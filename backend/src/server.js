require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const matchRoutes = require('./routes/matchRoutes');
const betRoutes = require('./routes/betRoutes');
const testRoutes = require('./routes/testRoutes');

const app = express();

connectDB();

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:4200',
    'https://YOUR-FRONTEND-URL.vercel.app',  // Replace with your actual Vercel URL
    'https://*.vercel.app'  // Allow all Vercel preview deployments
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/test', testRoutes);

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
