# API-Football Integration Rules

## Base Configuration
- **Base URL**: `https://v3.football.api-sports.io`
- **Auth Header**: `x-apisports-key: {API_KEY}`
- **Rate Limit**: 7500 requests/day
- **Cache TTL**: 6 hours (to minimize API calls)

---

## Endpoints Reference

### 1. Fixtures (`GET /fixtures`)
Fetch match fixtures with various filters.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `league` | number | League ID (required for our use) |
| `season` | number | Season year (e.g., 2025 for 2025-26 season) |
| `team` | number | Filter by team ID |
| `from` | string | Start date (YYYY-MM-DD) |
| `to` | string | End date (YYYY-MM-DD) |
| `status` | string | Match status (can use multiple: `NS-FT-1H`) |
| `date` | string | Specific date (YYYY-MM-DD) |
| `timezone` | string | Timezone (default: UTC) |

**Status Values:**
| Code | Meaning | Our Mapping |
|------|---------|-------------|
| `TBD` | Time To Be Defined | SCHEDULED |
| `NS` | Not Started | SCHEDULED |
| `1H` | First Half | LIVE |
| `HT` | Halftime | LIVE |
| `2H` | Second Half | LIVE |
| `ET` | Extra Time | LIVE |
| `BT` | Break Time | LIVE |
| `P` | Penalties | LIVE |
| `SUSP` | Suspended | POSTPONED |
| `INT` | Interrupted | POSTPONED |
| `FT` | Full Time | FINISHED |
| `AET` | After Extra Time | FINISHED |
| `PEN` | After Penalties | FINISHED |
| `PST` | Postponed | POSTPONED |
| `CANC` | Cancelled | CANCELLED |
| `ABD` | Abandoned | CANCELLED |
| `AWD` | Technical Loss | FINISHED |
| `WO` | Walkover | FINISHED |

**Example Requests:**
```bash
# Get all fixtures for a league/season
GET /fixtures?league=383&season=2025

# Get fixtures in date range
GET /fixtures?league=383&season=2025&from=2026-01-18&to=2026-02-01

# Get only not started matches
GET /fixtures?league=383&season=2025&status=NS

# Get finished matches
GET /fixtures?league=383&season=2025&status=FT-AET-PEN

# Filter by team
GET /fixtures?league=383&season=2025&team=604
```

---

### 2. Teams (`GET /teams`)
Get teams for a specific league and season.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `league` | number | League ID |
| `season` | number | Season year |

**Example Request:**
```bash
GET /teams?league=383&season=2025
```

**Response Structure:**
```json
{
  "response": [{
    "team": {
      "id": 604,
      "name": "Maccabi Tel Aviv",
      "code": "MAC",
      "country": "Israel",
      "logo": "https://media.api-sports.io/football/teams/604.png"
    },
    "venue": { ... }
  }]
}
```

---

### 3. Leagues (`GET /leagues`)
Search for leagues by country.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `country` | string | Country name |
| `id` | number | League ID |

**Example Request:**
```bash
GET /leagues?country=Israel
```

---

## Supported Leagues (Hard-coded)

| League | ID | Country |
|--------|-----|---------|
| Ligat Ha'al | 383 | Israel |
| Liga Leumit | 382 | Israel |
| Premier League | 39 | England |
| La Liga | 140 | Spain |
| Serie A | 135 | Italy |
| Bundesliga | 78 | Germany |
| Ligue 1 | 61 | France |
| Champions League | 2 | Europe |
| Europa League | 3 | Europe |
| World Cup | 1 | World |
| Euro Championship | 4 | Europe |

---

## Season Calculation
Football seasons typically start in August and end in May.
- **Before August**: Use `currentYear - 1` (e.g., January 2026 = season 2025)
- **August onwards**: Use `currentYear` (e.g., September 2025 = season 2025)

```javascript
function getCurrentSeason() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month < 7 ? year - 1 : year;
}
```

---

## Caching Strategy
1. **Fixtures**: Cache per league+season for 6 hours
2. **Teams**: Cache per league+season (refresh weekly or on demand)
3. **Leagues**: Hard-coded (no cache needed)

---

## Filter Mapping (Frontend to API)

| UI Filter | API Parameter |
|-----------|---------------|
| Status: Finished | `status=FT-AET-PEN` |
| Status: Not Started | `status=NS-TBD` |
| Status: Ongoing/Live | `status=1H-HT-2H-ET-BT-P` |
| Date From | `from=YYYY-MM-DD` |
| Date To | `to=YYYY-MM-DD` |
| Team | `team={teamId}` |

**Note:** For multiple teams, make separate API calls or filter locally.

---

## Best Practices
1. Always include `league` and `season` in fixture requests
2. Use date range filters (`from`, `to`) to limit results
3. Cache aggressively to stay within rate limits
4. For team filtering, prefer API filtering when single team, local filtering for multiple teams
5. Combine status filters using hyphen: `status=NS-FT`

---

## Group Type Handling

### Manual Groups
- Matches stored locally in MongoDB
- All filtering done client-side on local data
- Teams from local `teams.data.ts`

### Automatic Groups
- Matches fetched from API-Football
- Filtering can use API parameters for efficiency
- Teams fetched dynamically from API based on selected league
- Results synced periodically or on-demand
