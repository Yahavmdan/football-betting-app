# TheSportsDB API Integration Guide

Your football betting app now uses **TheSportsDB API** to fetch real football matches!

## API Details

- **API Provider**: TheSportsDB (https://www.thesportsdb.com)
- **API Key**: `3` (Free tier)
- **Documentation**: https://www.thesportsdb.com/api.php

## How It Works

### For Group Creators:

1. **Create a Group** or navigate to an existing group you created
2. **Click "Manage Matches"** button (orange button, only visible to group creators)
3. **Select a League** from the dropdown:
   - English Premier League
   - Spanish La Liga
   - German Bundesliga
   - Italian Serie A
   - French Ligue 1
   - UEFA Champions League
4. **Fetch Upcoming Matches** - Clicks this to get next 15 matches from the selected league
5. **Add Matches to Group** - Click "Add to Group" on any match to make it available for betting
6. **Update Past Results** - Click this to update scores for finished matches

### For Group Members:

1. Join a group using an invite code
2. View available matches in the group
3. Place bets on scheduled matches before they start
4. After matches finish, the group creator updates results
5. Points are calculated automatically based on your predictions!

## Available Leagues & IDs

The following leagues are pre-configured:

| League | ID | Country |
|--------|-----|---------|
| Israeli Premier League (Ligat Ha'al) | 4485 | Israel 🇮🇱 |
| English Premier League | 4328 | England |
| Spanish La Liga | 4335 | Spain |
| German Bundesliga | 4331 | Germany |
| Italian Serie A | 4332 | Italy |
| French Ligue 1 | 4334 | France |
| UEFA Champions League | 4346 | Europe |

## API Endpoints Used

### Backend Endpoints:

1. **GET** `/api/matches/leagues/available` - Get list of available leagues
2. **POST** `/api/matches/fetch` - Fetch upcoming matches from a league
   - Body: `{ "leagueId": "4328" }` (optional, defaults to Premier League)
3. **POST** `/api/matches/update-results` - Update match results from API
   - Body: `{ "leagueId": "4328" }` (optional, defaults to Premier League)
4. **POST** `/api/matches/add-to-group` - Add a match to a group
   - Body: `{ "matchId": "...", "groupId": "..." }`
5. **POST** `/api/bets/calculate-points` - Calculate points for finished matches

### TheSportsDB API Endpoints:

The backend automatically calls these TheSportsDB endpoints:

- **Next Events**: `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id={leagueId}`
  - Returns next 15 upcoming events for a league
- **Past Events**: `https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id={leagueId}`
  - Returns last 15 finished events for a league

## Workflow Example

1. **Group Creator**:
   - Navigate to "Manage Matches"
   - Select "English Premier League"
   - Click "Fetch Upcoming Matches"
   - Add desired matches to the group

2. **Group Members**:
   - See available matches in the group
   - Place bets on match outcomes and scores

3. **After Match Finishes**:
   - Group Creator clicks "Update Past Results"
   - System fetches final scores from TheSportsDB
   - Group Creator (or anyone) can call the calculate points endpoint
   - Points are automatically calculated and added to leaderboard

## Testing the Integration

### Quick Test:

```bash
# Make sure backend is running
cd backend
npm run dev

# In a separate terminal, test the API
curl -X GET http://localhost:3000/api/matches/leagues/available \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Fetch matches (requires authentication)
curl -X POST http://localhost:3000/api/matches/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"leagueId": "4328"}'
```

## Notes

- **Free API Limitations**: The free tier (API key `3`) has rate limits. Don't fetch too frequently.
- **Match Data**: TheSportsDB provides comprehensive football data including team names, dates, scores, and more.
- **Automatic Processing**: The system only processes Soccer/Football events, filtering out other sports.
- **Status Updates**: Match status automatically updates from "SCHEDULED" to "FINISHED" when results are fetched.

## Troubleshooting

### No matches found?
- Try a different league
- Check if the league has upcoming matches
- Verify the league ID is correct

### Results not updating?
- Make sure matches have actually finished
- Click "Update Past Results" for the specific league
- Check that the match was fetched from TheSportsDB (has an externalApiId)

### Can't add match to group?
- Only group creators can add matches
- Make sure you're logged in
- Verify the match isn't already in the group
