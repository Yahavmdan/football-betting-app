# Football Betting App

A full-stack web application for betting on football matches with friends in private groups.

## Features

- User authentication (register, login, logout)
- Create and join private betting groups with invite codes
- Bet on football match results (1/X/2) and exact scores
- Point system for correct predictions:
  - Correct result (1/X/2): 1 point
  - Correct home team score: +2 points
  - Correct away team score: +2 points
  - Exact score match: +3 points
- Group leaderboards
- Integration with external football API for match data

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- bcrypt for password hashing
- Axios for API calls

### Frontend
- Angular 17
- Standalone components
- Reactive forms
- HTTP interceptors for authentication
- Route guards

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn
- Angular CLI: `npm install -g @angular/cli`

## Setup Instructions

### 1. Clone the Repository

```bash
cd ba-betim
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env file with your configuration
# - MongoDB URI (already set to port 27018)
# - JWT secret (change in production!)
# - Football API is already configured (TheSportsDB free key)
nano .env

# Start the backend server
npm run dev
```

The backend server will run on `http://localhost:3000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start the Angular development server
npm start
```

The frontend will run on `http://localhost:4200`

### 4. Database Setup

You need to start a separate MongoDB instance on port 27018 (to avoid conflicts with other MongoDB instances).

**Option 1: Start MongoDB on a specific port**
```bash
mongod --port 27018 --dbpath /path/to/your/data/directory
```

**Option 2: Using a configuration file**
Create a `mongod.conf` file:
```yaml
net:
  port: 27018
storage:
  dbPath: /path/to/your/data/directory
```

Then start MongoDB:
```bash
mongod --config mongod.conf
```

**Option 3: Use MongoDB Atlas (Cloud)**
If you prefer a cloud database, sign up for MongoDB Atlas and update the `MONGODB_URI` in your `.env` file with the connection string.

MongoDB will automatically create the database and collections when you first run the application.

## Environment Variables

### Backend (.env)

```
PORT=3000
MONGODB_URI=mongodb://localhost:27018/football-betting
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
FOOTBALL_API_KEY=3
FOOTBALL_API_URL=https://www.thesportsdb.com/api/v1/json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Groups
- `POST /api/groups` - Create new group (protected)
- `POST /api/groups/join` - Join group with invite code (protected)
- `GET /api/groups` - Get user's groups (protected)
- `GET /api/groups/:id` - Get group details (protected)
- `GET /api/groups/:id/leaderboard` - Get group leaderboard (protected)

### Matches
- `GET /api/matches` - Get all matches (protected)
- `GET /api/matches/:id` - Get match by ID (protected)
- `POST /api/matches/add-to-group` - Add match to group (protected)
- `POST /api/matches/fetch` - Fetch new matches from API (protected)
- `POST /api/matches/update-results` - Update match results from API (protected)

### Bets
- `POST /api/bets` - Place or update bet (protected)
- `GET /api/bets` - Get user's bets (protected)
- `GET /api/bets/match/:matchId` - Get bets for a match (protected)
- `POST /api/bets/calculate-points` - Calculate points for finished matches (protected)

## Football API Integration

This application uses **TheSportsDB API** (https://www.thesportsdb.com/) to fetch real football match data.

### Available League:
- 🇮🇱 **Israeli Premier League (Ligat Ha'al)** - League ID: 4644

The app is configured to show only Israeli Premier League matches.

**Match Date Range**: The app displays matches from the **past up to 2 weeks in the future**. This gives users time to place bets on upcoming matches while still showing historical results.

**API Implementation**: Due to a bug in TheSportsDB's API where league-based endpoints return incorrect data for the Israeli Premier League, the app uses a workaround that fetches matches from 10 major Israeli teams:
- Maccabi Tel Aviv
- Maccabi Haifa
- Beitar Jerusalem
- Hapoel Be'er Sheva
- Hapoel Tel Aviv
- Maccabi Petah Tikva
- Hapoel Haifa
- Maccabi Netanya
- Bnei Sakhnin
- FC Ashdod

The free API key (`3`) is already configured in the `.env` file. No additional signup required!

For detailed integration guide, see [THESPORTSDB_INTEGRATION.md](THESPORTSDB_INTEGRATION.md)

## Usage

1. **Register/Login** - Create an account or login
2. **Create or Join Group** - Create a new betting group or join with an invite code
3. **Manage Matches** (Group Creators Only):
   - Navigate to your group
   - Click "Manage Matches"
   - Click "Fetch Israeli League Matches" to load matches from the past up to 2 weeks in the future
   - Add matches to your group that you want members to bet on
4. **Place Bets** - Bet on match outcomes and exact scores before matches start
   - Each user can only place **one bet per match** (no changes allowed after submission)
   - Betting is disabled for matches that have already started
5. **Update Results** - After matches finish, group creator clicks "Update Match Results" to fetch final scores from the API
6. **Calculate Points** - Points are automatically calculated based on prediction accuracy
7. **View Leaderboard** - Check rankings within your group

### Betting Rules:
- ✅ Users can bet on future matches (up to 2 weeks ahead)
- ✅ Users can view past matches and their results
- ❌ Users cannot bet on matches that have already started
- ❌ Users cannot change their bet once submitted
- 🔒 Only group creators can add matches and update results

## Project Structure

```
ba-betim/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── models/
│   │   │   └── services/
│   │   ├── assets/
│   │   ├── environments/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Future Enhancements

- Real-time updates with WebSockets
- Match notifications
- Historical statistics
- Multiple competitions/leagues
- Social features (comments, reactions)
- Mobile app
- Admin dashboard
- Automated match result updates with cron jobs

## License

MIT
