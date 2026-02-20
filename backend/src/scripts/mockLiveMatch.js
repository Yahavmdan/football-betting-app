/**
 * Mock Live Match Simulator
 * 
 * Simulates a live match: Maccabi Haifa vs Maccabi Tel Aviv
 * that appears on the home page for local testing.
 * 
 * The match auto-progresses through all phases:
 *   1H → HT → 2H → FT  (at 10x speed by default)
 * 
 * Includes ALL event types from API-Football:
 *   - Goals: Normal Goal, Own Goal, Penalty (scored), Missed Penalty
 *   - Cards: Yellow Card, Second Yellow card, Red Card (straight)
 *   - Substitutions
 *   - VAR: Goal Disallowed, Penalty confirmed, Goal cancelled
 * 
 * Control endpoints (NO auth required):
 *   GET  /api/mock-live/status      - See current match state
 *   POST /api/mock-live/start       - Start/restart (body: { speed: 10 })
 *   POST /api/mock-live/stop        - Stop and remove mock match
 *   POST /api/mock-live/jump/:min   - Jump to a specific minute (0-95)
 * 
 * How it works:
 *   This module registers middleware BEFORE your routes.
 *   It wraps res.json() to inject mock data into personalized matches responses.
 *   For events/lineups/statistics of the mock match, it responds directly
 *   (bypassing auth) since it's local test data.
 */

// ============================================================
// TEAM & MATCH CONFIGURATION (real API-Football IDs)
// ============================================================

const MOCK_FIXTURE_ID = 'apifootball_9999999';

const HOME_TEAM = {
    id: 632,
    name: 'Maccabi Haifa',
    logo: 'https://media.api-sports.io/football/teams/632.png'
};

const AWAY_TEAM = {
    id: 604,
    name: 'Maccabi Tel Aviv',
    logo: 'https://media.api-sports.io/football/teams/604.png'
};

const LEAGUE = {
    id: 383,
    name: "Ligat Ha'al",
    logo: 'https://media.api-sports.io/football/leagues/383.png',
    country: 'Israel',
    season: 2025,
    round: 'Regular Season - 22'
};

// ============================================================
// MATCH TIMELINE - All events with their minute
// Score accumulates based on goal events up to current minute
// ============================================================

const MATCH_EVENTS = [
    // ---- FIRST HALF (0-45+2') ----

    // EVENT TYPE: Goal - Normal Goal
    {
        minute: 3, extra: null,
        type: 'Goal', detail: 'Normal Goal',
        team: HOME_TEAM,
        player: { id: 50101, name: 'T. Haziza' },
        assist: { id: 50102, name: 'D. David' },
        scoreAfter: { home: 1, away: 0 }
    },
    // EVENT TYPE: Card - Yellow Card
    {
        minute: 12, extra: null,
        type: 'Card', detail: 'Yellow Card',
        team: AWAY_TEAM,
        player: { id: 50201, name: 'E. Zahavi' },
        assist: null
    },
    // EVENT TYPE: Card - Yellow Card
    {
        minute: 18, extra: null,
        type: 'Card', detail: 'Yellow Card',
        team: HOME_TEAM,
        player: { id: 50103, name: 'S. Menachem' },
        assist: null
    },
    // EVENT TYPE: Goal - Normal Goal
    {
        minute: 23, extra: null,
        type: 'Goal', detail: 'Normal Goal',
        team: AWAY_TEAM,
        player: { id: 50201, name: 'E. Zahavi' },
        assist: { id: 50202, name: 'D. Peretz' },
        scoreAfter: { home: 1, away: 1 }
    },
    // EVENT TYPE: Goal - Missed Penalty (does NOT change score)
    {
        minute: 28, extra: null,
        type: 'Goal', detail: 'Missed Penalty',
        team: HOME_TEAM,
        player: { id: 50101, name: 'T. Haziza' },
        assist: null
        // no scoreAfter - missed penalty doesn't change the score
    },
    // EVENT TYPE: Var - Goal Disallowed (offside)
    {
        minute: 31, extra: null,
        type: 'Var', detail: 'Goal Disallowed - offside',
        team: HOME_TEAM,
        player: { id: 50104, name: 'M. Abu Fani' },
        assist: null
    },
    // EVENT TYPE: Subst - Substitution
    {
        minute: 35, extra: null,
        type: 'Subst', detail: 'Substitution 1',
        team: HOME_TEAM,
        player: { id: 50105, name: 'N. Eliyahu' },     // OUT
        assist: { id: 50106, name: 'R. Atzili' },       // IN
    },
    // EVENT TYPE: Goal - Penalty (scored)
    {
        minute: 38, extra: null,
        type: 'Goal', detail: 'Penalty',
        team: HOME_TEAM,
        player: { id: 50106, name: 'R. Atzili' },
        assist: null,
        scoreAfter: { home: 2, away: 1 }
    },
    // EVENT TYPE: Card - Yellow Card (stoppage time)
    {
        minute: 44, extra: 2,
        type: 'Card', detail: 'Yellow Card',
        team: AWAY_TEAM,
        player: { id: 50203, name: 'S. Glazer' },
        assist: null
    },

    // ---- SECOND HALF (45-90+3') ----

    // EVENT TYPE: Goal - Own Goal
    {
        minute: 52, extra: null,
        type: 'Goal', detail: 'Own Goal',
        team: HOME_TEAM,
        player: { id: 50107, name: 'B. Natcho' },
        assist: null,
        scoreAfter: { home: 2, away: 2 }
    },
    // EVENT TYPE: Subst - Substitution
    {
        minute: 55, extra: null,
        type: 'Subst', detail: 'Substitution 2',
        team: AWAY_TEAM,
        player: { id: 50204, name: 'O. Gandelman' },   // OUT
        assist: { id: 50205, name: 'T. Kanichowsky' },  // IN
    },
    // EVENT TYPE: Subst - Substitution
    {
        minute: 60, extra: null,
        type: 'Subst', detail: 'Substitution 3',
        team: AWAY_TEAM,
        player: { id: 50206, name: 'A. Jaber' },       // OUT
        assist: { id: 50207, name: 'G. Shua' },          // IN
    },
    // EVENT TYPE: Card - Yellow Card (first yellow for Batubinsika)
    {
        minute: 63, extra: null,
        type: 'Card', detail: 'Yellow Card',
        team: HOME_TEAM,
        player: { id: 50108, name: 'D. Batubinsika' },
        assist: null
    },
    // EVENT TYPE: Var - Penalty confirmed
    {
        minute: 67, extra: null,
        type: 'Var', detail: 'Penalty confirmed',
        team: AWAY_TEAM,
        player: { id: 50205, name: 'T. Kanichowsky' },
        assist: null
    },
    // EVENT TYPE: Goal - Penalty (scored after VAR)
    {
        minute: 68, extra: null,
        type: 'Goal', detail: 'Penalty',
        team: AWAY_TEAM,
        player: { id: 50201, name: 'E. Zahavi' },
        assist: null,
        scoreAfter: { home: 2, away: 3 }
    },
    // EVENT TYPE: Subst - Substitution
    {
        minute: 72, extra: null,
        type: 'Subst', detail: 'Substitution 4',
        team: HOME_TEAM,
        player: { id: 50109, name: 'M. Jaber' },       // OUT
        assist: { id: 50110, name: 'K. Filipovic' },     // IN
    },
    // EVENT TYPE: Card - Second Yellow card (2nd yellow for Batubinsika → sent off)
    {
        minute: 74, extra: null,
        type: 'Card', detail: 'Second Yellow card',
        team: HOME_TEAM,
        player: { id: 50108, name: 'D. Batubinsika' },
        assist: null
    },
    // EVENT TYPE: Var - Goal cancelled (Haifa thought they scored but VAR cancelled)
    {
        minute: 77, extra: null,
        type: 'Var', detail: 'Goal cancelled',
        team: HOME_TEAM,
        player: { id: 50110, name: 'K. Filipovic' },
        assist: null
    },
    // EVENT TYPE: Subst - Substitution
    {
        minute: 80, extra: null,
        type: 'Subst', detail: 'Substitution 5',
        team: HOME_TEAM,
        player: { id: 50104, name: 'M. Abu Fani' },     // OUT
        assist: { id: 50111, name: 'A. Meir' },          // IN
    },
    // EVENT TYPE: Card - Red Card (straight red - violent conduct)
    {
        minute: 82, extra: null,
        type: 'Card', detail: 'Red Card',
        team: AWAY_TEAM,
        player: { id: 50207, name: 'G. Shua' },
        assist: null
    },
    // EVENT TYPE: Goal - Normal Goal
    {
        minute: 85, extra: null,
        type: 'Goal', detail: 'Normal Goal',
        team: HOME_TEAM,
        player: { id: 50106, name: 'R. Atzili' },
        assist: { id: 50110, name: 'K. Filipovic' },
        scoreAfter: { home: 3, away: 3 }
    },
    // EVENT TYPE: Card - Yellow Card
    {
        minute: 88, extra: null,
        type: 'Card', detail: 'Yellow Card',
        team: AWAY_TEAM,
        player: { id: 50205, name: 'T. Kanichowsky' },
        assist: null
    },
    // EVENT TYPE: Goal - Normal Goal (stoppage time winner)
    {
        minute: 90, extra: 3,
        type: 'Goal', detail: 'Normal Goal',
        team: AWAY_TEAM,
        player: { id: 50205, name: 'T. Kanichowsky' },
        assist: { id: 50201, name: 'E. Zahavi' },
        scoreAfter: { home: 3, away: 4 }
    }
];

// ============================================================
// MOCK LINEUPS (real formation structure matching API-Football)
// ============================================================

const MOCK_LINEUPS = [
    // Home team: Maccabi Haifa
    {
        team: {
            id: HOME_TEAM.id,
            name: HOME_TEAM.name,
            logo: HOME_TEAM.logo,
            colors: {
                player: { primary: '#00A651', number: '#FFFFFF', border: '#008643' },
                goalkeeper: { primary: '#FFD700', number: '#000000', border: '#CC9900' }
            }
        },
        coach: { id: 90001, name: 'B. Bakhar', photo: 'https://media.api-sports.io/football/coachs/1.png' },
        formation: '4-2-3-1',
        startXI: [
            { id: 50100, name: 'J. Cohen', number: 1, pos: 'G', grid: '1:1' },
            { id: 50103, name: 'S. Menachem', number: 3, pos: 'D', grid: '2:1' },
            { id: 50108, name: 'D. Batubinsika', number: 4, pos: 'D', grid: '2:2' },
            { id: 50112, name: 'B. Goldberg', number: 5, pos: 'D', grid: '2:3' },
            { id: 50105, name: 'N. Eliyahu', number: 2, pos: 'D', grid: '2:4' },
            { id: 50107, name: 'B. Natcho', number: 6, pos: 'M', grid: '3:1' },
            { id: 50104, name: 'M. Abu Fani', number: 8, pos: 'M', grid: '3:2' },
            { id: 50102, name: 'D. David', number: 10, pos: 'M', grid: '4:1' },
            { id: 50101, name: 'T. Haziza', number: 7, pos: 'M', grid: '4:2' },
            { id: 50109, name: 'M. Jaber', number: 11, pos: 'M', grid: '4:3' },
            { id: 50113, name: 'F. Frantzdy', number: 9, pos: 'F', grid: '5:1' }
        ],
        substitutes: [
            { id: 50114, name: 'O. Marciano', number: 12, pos: 'G' },
            { id: 50106, name: 'R. Atzili', number: 14, pos: 'M' },
            { id: 50110, name: 'K. Filipovic', number: 15, pos: 'M' },
            { id: 50111, name: 'A. Meir', number: 17, pos: 'D' },
            { id: 50115, name: 'T. Chery', number: 20, pos: 'F' },
            { id: 50116, name: 'R. Gershon', number: 21, pos: 'D' },
            { id: 50117, name: 'S. Lavi', number: 23, pos: 'M' }
        ]
    },
    // Away team: Maccabi Tel Aviv
    {
        team: {
            id: AWAY_TEAM.id,
            name: AWAY_TEAM.name,
            logo: AWAY_TEAM.logo,
            colors: {
                player: { primary: '#FFD700', number: '#0000FF', border: '#0000CC' },
                goalkeeper: { primary: '#FF6600', number: '#FFFFFF', border: '#CC5200' }
            }
        },
        coach: { id: 90002, name: 'P. Vermezovic', photo: 'https://media.api-sports.io/football/coachs/2.png' },
        formation: '4-3-3',
        startXI: [
            { id: 50200, name: 'D. Gerafi', number: 1, pos: 'G', grid: '1:1' },
            { id: 50208, name: 'E. Tibi', number: 2, pos: 'D', grid: '2:1' },
            { id: 50209, name: 'O. Meir', number: 3, pos: 'D', grid: '2:2' },
            { id: 50203, name: 'S. Glazer', number: 4, pos: 'D', grid: '2:3' },
            { id: 50210, name: 'A. Davidzada', number: 5, pos: 'D', grid: '2:4' },
            { id: 50202, name: 'D. Peretz', number: 6, pos: 'M', grid: '3:1' },
            { id: 50206, name: 'A. Jaber', number: 8, pos: 'M', grid: '3:2' },
            { id: 50204, name: 'O. Gandelman', number: 10, pos: 'M', grid: '3:3' },
            { id: 50211, name: 'T. Biton', number: 7, pos: 'F', grid: '4:1' },
            { id: 50201, name: 'E. Zahavi', number: 9, pos: 'F', grid: '4:2' },
            { id: 50212, name: 'O. Atzili', number: 11, pos: 'F', grid: '4:3' }
        ],
        substitutes: [
            { id: 50213, name: 'R. Mishpati', number: 12, pos: 'G' },
            { id: 50205, name: 'T. Kanichowsky', number: 14, pos: 'M' },
            { id: 50207, name: 'G. Shua', number: 15, pos: 'M' },
            { id: 50214, name: 'E. Saborit', number: 17, pos: 'D' },
            { id: 50215, name: 'Y. Naor', number: 19, pos: 'M' },
            { id: 50216, name: 'I. Yosef', number: 20, pos: 'F' },
            { id: 50217, name: 'D. Leidner', number: 22, pos: 'D' }
        ]
    }
];

// ============================================================
// SIMULATION STATE
// ============================================================

let simulationState = {
    running: false,
    startedAt: null,
    speedMultiplier: 10,        // 10x speed: 1 real second = 10 match seconds
    currentMinute: 0,
    currentStatusShort: 'NS',
    currentStatus: 'SCHEDULED',
    homeScore: 0,
    awayScore: 0
};

function getMatchStatusFromShort(statusShort) {
    return { 'NS': 'SCHEDULED', '1H': 'LIVE', 'HT': 'LIVE', '2H': 'LIVE', 'FT': 'FINISHED' }[statusShort] || 'SCHEDULED';
}

// Calculate current sim state from real elapsed time
function updateSimulationState() {
    if (!simulationState.running || !simulationState.startedAt) return;

    const realElapsedMs = Date.now() - simulationState.startedAt;
    const simSeconds = (realElapsedMs / 1000) * simulationState.speedMultiplier;
    const simMinute = Math.floor(simSeconds / 60);

    // Timeline (in simulated minutes):
    //   0-47   → 1H (min 0-45, last 2 are stoppage)
    //   47-52  → HT (5-min break)
    //   52-100 → 2H (min 45-90, last 3 are stoppage)
    //   100+   → FT

    let matchMinute = 0;
    let statusShort = 'NS';

    if (simMinute <= 47) {
        statusShort = '1H';
        matchMinute = Math.min(simMinute, 45);
    } else if (simMinute <= 52) {
        statusShort = 'HT';
        matchMinute = 45;
    } else if (simMinute <= 100) {
        statusShort = '2H';
        matchMinute = Math.min(45 + (simMinute - 52), 90);
    } else {
        statusShort = 'FT';
        matchMinute = 90;
    }

    // Calculate score at current minute
    let homeScore = 0;
    let awayScore = 0;
    for (const event of MATCH_EVENTS) {
        if (event.scoreAfter && event.minute <= matchMinute) {
            homeScore = event.scoreAfter.home;
            awayScore = event.scoreAfter.away;
        }
    }

    simulationState.currentMinute = matchMinute;
    simulationState.currentStatusShort = statusShort;
    simulationState.currentStatus = getMatchStatusFromShort(statusShort);
    simulationState.homeScore = homeScore;
    simulationState.awayScore = awayScore;
}

function startSimulation(speedMultiplier = 10) {
    simulationState = {
        running: true,
        startedAt: Date.now(),
        speedMultiplier,
        currentMinute: 0,
        currentStatusShort: '1H',
        currentStatus: 'LIVE',
        homeScore: 0,
        awayScore: 0
    };
    console.log('[MockLive] ⚽ Match simulation STARTED! Maccabi Haifa vs Maccabi Tel Aviv');
    console.log(`[MockLive] ⏩ Speed: ${speedMultiplier}x (1 real minute ≈ ${speedMultiplier} match minutes)`);
    console.log(`[MockLive] ⏱️  Full match takes ~${Math.ceil(100 / speedMultiplier)} real minutes`);
}

function jumpToMinute(targetMinute) {
    if (!simulationState.running) {
        startSimulation(simulationState.speedMultiplier || 10);
    }
    // Calculate the simulated minute offset (account for HT break)
    let simTarget = targetMinute;
    if (targetMinute > 45) {
        simTarget = targetMinute + 7; // +5 HT break + 2 stoppage
    }
    const realMsNeeded = (simTarget * 60 / simulationState.speedMultiplier) * 1000;
    simulationState.startedAt = Date.now() - realMsNeeded;
    updateSimulationState();
    console.log(`[MockLive] ⏭️  Jumped to ${simulationState.currentMinute}' (${simulationState.currentStatusShort}) | Score: ${simulationState.homeScore}-${simulationState.awayScore}`);
}

function stopSimulation() {
    simulationState.running = false;
    simulationState.startedAt = null;
    console.log('[MockLive] ⏹️  Simulation STOPPED');
}

// ============================================================
// DATA GETTERS (return API-Football format data)
// ============================================================

function getCurrentFixtureData() {
    updateSimulationState();
    if (!simulationState.running) return null;

    const matchDate = new Date();
    matchDate.setMinutes(matchDate.getMinutes() - 10);

    return {
        externalApiId: MOCK_FIXTURE_ID,
        homeTeam: HOME_TEAM.name,
        homeTeamId: HOME_TEAM.id,
        homeTeamLogo: HOME_TEAM.logo,
        awayTeam: AWAY_TEAM.name,
        awayTeamId: AWAY_TEAM.id,
        awayTeamLogo: AWAY_TEAM.logo,
        matchDate: matchDate.toISOString(),
        status: simulationState.currentStatus,
        statusShort: simulationState.currentStatusShort,
        elapsed: simulationState.currentMinute,
        extraTime: null,
        result: {
            homeScore: simulationState.homeScore,
            awayScore: simulationState.awayScore,
            outcome: simulationState.currentStatus === 'FINISHED'
                ? (simulationState.homeScore > simulationState.awayScore ? '1'
                    : simulationState.homeScore < simulationState.awayScore ? '2' : 'X')
                : null
        },
        competition: LEAGUE.name,
        leagueId: LEAGUE.id,
        season: LEAGUE.season,
        round: LEAGUE.round,
        venue: 'Sammy Ofer Stadium',
        isFavoriteTeam: true,
        isMock: true
    };
}

function getCurrentEvents() {
    updateSimulationState();
    return MATCH_EVENTS
        .filter(e => e.minute <= simulationState.currentMinute)
        .map(e => ({
            time: { elapsed: e.minute, extra: e.extra || null },
            team: { id: e.team.id, name: e.team.name, logo: e.team.logo },
            player: e.player,
            assist: e.assist,
            type: e.type,
            detail: e.detail
        }));
}

function generateStatistics(elapsed) {
    const progress = Math.min(elapsed / 90, 1) || 0.05;
    const rng = (base, variance) => Math.max(0, Math.round(base * progress + (Math.random() - 0.5) * variance * progress));

    const countCards = (teamId, cardType) =>
        MATCH_EVENTS.filter(e => e.type === 'Card' && e.detail.includes(cardType) && e.team.id === teamId && e.minute <= elapsed).length;

    return [
        {
            team: { id: HOME_TEAM.id, name: HOME_TEAM.name, logo: HOME_TEAM.logo },
            statistics: [
                { type: 'Shots on Goal', value: rng(6, 2) },
                { type: 'Shots off Goal', value: rng(4, 2) },
                { type: 'Total Shots', value: rng(14, 3) },
                { type: 'Blocked Shots', value: rng(3, 1) },
                { type: 'Shots insidebox', value: rng(8, 2) },
                { type: 'Shots outsidebox', value: rng(6, 2) },
                { type: 'Fouls', value: rng(12, 3) },
                { type: 'Corner Kicks', value: rng(5, 2) },
                { type: 'Offsides', value: rng(3, 1) },
                { type: 'Ball Possession', value: '46%' },
                { type: 'Yellow Cards', value: countCards(HOME_TEAM.id, 'Yellow') },
                { type: 'Red Cards', value: countCards(HOME_TEAM.id, 'Red') },
                { type: 'Goalkeeper Saves', value: rng(3, 1) },
                { type: 'Total passes', value: rng(380, 40) },
                { type: 'Passes accurate', value: rng(310, 30) },
                { type: 'Passes %', value: '82%' },
                { type: 'expected_goals', value: (2.1 * progress).toFixed(2) }
            ]
        },
        {
            team: { id: AWAY_TEAM.id, name: AWAY_TEAM.name, logo: AWAY_TEAM.logo },
            statistics: [
                { type: 'Shots on Goal', value: rng(7, 2) },
                { type: 'Shots off Goal', value: rng(3, 2) },
                { type: 'Total Shots', value: rng(13, 3) },
                { type: 'Blocked Shots', value: rng(2, 1) },
                { type: 'Shots insidebox', value: rng(9, 2) },
                { type: 'Shots outsidebox', value: rng(4, 2) },
                { type: 'Fouls', value: rng(10, 3) },
                { type: 'Corner Kicks', value: rng(4, 2) },
                { type: 'Offsides', value: rng(2, 1) },
                { type: 'Ball Possession', value: '54%' },
                { type: 'Yellow Cards', value: countCards(AWAY_TEAM.id, 'Yellow') },
                { type: 'Red Cards', value: countCards(AWAY_TEAM.id, 'Red') },
                { type: 'Goalkeeper Saves', value: rng(4, 2) },
                { type: 'Total passes', value: rng(420, 40) },
                { type: 'Passes accurate', value: rng(350, 30) },
                { type: 'Passes %', value: '85%' },
                { type: 'expected_goals', value: (2.5 * progress).toFixed(2) }
            ]
        }
    ];
}

// ============================================================
// EXPRESS ROUTES & MIDDLEWARE SETUP
// ============================================================

function setupRoutes(app) {
    console.log('[MockLive] 🔌 Setting up mock live match routes...');

    // Auto-start when server boots
    startSimulation(10);

    // ---- Control endpoints (no auth) ----

    app.get('/api/mock-live/status', (req, res) => {
        updateSimulationState();
        res.json({
            success: true,
            data: {
                ...simulationState,
                fixture: getCurrentFixtureData(),
                eventsRevealed: getCurrentEvents().length,
                totalEvents: MATCH_EVENTS.length
            }
        });
    });

    app.post('/api/mock-live/start', (req, res) => {
        const speed = parseInt(req.body?.speed) || 10;
        startSimulation(speed);
        res.json({ success: true, message: `Mock match started at ${speed}x speed` });
    });

    app.post('/api/mock-live/stop', (req, res) => {
        stopSimulation();
        res.json({ success: true, message: 'Mock match stopped' });
    });

    app.post('/api/mock-live/jump/:minute', (req, res) => {
        const minute = parseInt(req.params.minute);
        if (isNaN(minute) || minute < 0 || minute > 95) {
            return res.status(400).json({ success: false, message: 'Minute must be 0-95' });
        }
        jumpToMinute(minute);
        res.json({
            success: true,
            message: `Jumped to ${simulationState.currentMinute}' (${simulationState.currentStatusShort})`,
            data: { minute: simulationState.currentMinute, score: `${simulationState.homeScore} - ${simulationState.awayScore}` }
        });
    });

    // ---- Direct endpoints for mock match data (no auth, checked by ID) ----

    // Events for mock match (must be registered BEFORE the app.use('/api/matches', matchRoutes))
    app.get('/api/matches/:matchId/events', (req, res, next) => {
        if (req.params.matchId === MOCK_FIXTURE_ID && simulationState.running) {
            return res.json({ success: true, data: getCurrentEvents() });
        }
        next();
    });

    app.get('/api/matches/:matchId/lineups', (req, res, next) => {
        if (req.params.matchId === MOCK_FIXTURE_ID && simulationState.running) {
            return res.json({ success: true, data: MOCK_LINEUPS });
        }
        next();
    });

    app.get('/api/matches/:matchId/statistics', (req, res, next) => {
        if (req.params.matchId === MOCK_FIXTURE_ID && simulationState.running) {
            return res.json({ success: true, data: generateStatistics(simulationState.currentMinute) });
        }
        next();
    });

    // ---- Middleware to inject mock match into personalized matches response ----
    // This wraps res.json for the specific endpoint path
    app.use('/api/matches/personalized', (req, res, next) => {
        if (!simulationState.running || req.method !== 'GET') return next();

        updateSimulationState();
        const mockFixture = getCurrentFixtureData();
        if (!mockFixture) return next();

        // Intercept res.json to inject our mock data
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (body && body.success && body.data) {
                // Inject into liveMatches
                if (mockFixture.status === 'LIVE') {
                    if (!body.data.liveMatches) body.data.liveMatches = [];
                    body.data.liveMatches = body.data.liveMatches.filter(m => m.externalApiId !== MOCK_FIXTURE_ID);
                    body.data.liveMatches.unshift(mockFixture);
                }

                // Inject into matches
                if (!body.data.matches) body.data.matches = [];
                body.data.matches = body.data.matches.filter(m => m.externalApiId !== MOCK_FIXTURE_ID);
                body.data.matches.unshift(mockFixture);

                // Inject into groupedByLeague
                if (!body.data.groupedByLeague) body.data.groupedByLeague = {};
                const leagueKey = LEAGUE.id.toString();
                if (!body.data.groupedByLeague[leagueKey]) {
                    body.data.groupedByLeague[leagueKey] = {
                        league: { id: leagueKey, name: LEAGUE.name, logo: LEAGUE.logo },
                        matches: []
                    };
                }
                body.data.groupedByLeague[leagueKey].matches =
                    body.data.groupedByLeague[leagueKey].matches.filter(m => m.externalApiId !== MOCK_FIXTURE_ID);
                body.data.groupedByLeague[leagueKey].matches.unshift(mockFixture);

                // Ensure home page shows content even without preferences
                body.data.hasPreferences = true;
            }
            return originalJson(body);
        };

        next();
    });

    console.log('[MockLive] ✅ Mock live match routes ready!');
    console.log('[MockLive] 📍 Control:');
    console.log('[MockLive]    GET  /api/mock-live/status');
    console.log('[MockLive]    POST /api/mock-live/start    { speed: 10 }');
    console.log('[MockLive]    POST /api/mock-live/stop');
    console.log('[MockLive]    POST /api/mock-live/jump/30  (jump to 30th minute)');
    console.log('[MockLive]    POST /api/mock-live/jump/80  (jump to 80th minute)');
}

module.exports = {
    setupRoutes,
    startSimulation,
    stopSimulation,
    jumpToMinute,
    getCurrentFixtureData,
    getCurrentEvents,
    MOCK_FIXTURE_ID
};
