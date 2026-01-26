const express = require('express');
const router = express.Router();
const {
  getMatches,
  getMatchById,
  addMatchToGroup,
  fetchAndSaveMatches,
  updateMatchResults,
  getAvailableLeagues,
  getLeagueFixtures,
  getFilteredFixtures,
  getLeagueTeams,
  syncLeagueFixturesToGroup,
  clearLeagueCache,
  searchLeagues,
  createManualMatch,
  updateMatchScore,
  markMatchAsFinished,
  deleteMatch,
  editMatch,
  getHeadToHead,
  getTeamRecentMatches,
  setMatchLive,
  getLiveFixtures,
  addLiveFixturesToGroup,
  refreshLiveMatches
} = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMatches);
router.get('/leagues/available', protect, getAvailableLeagues);
router.get('/leagues/search', protect, searchLeagues);
router.get('/leagues/fixtures', protect, getLeagueFixtures);
router.get('/leagues/fixtures/filtered', protect, getFilteredFixtures);
router.get('/live', protect, getLiveFixtures);
router.post('/live/add-to-group', protect, addLiveFixturesToGroup);
router.post('/live/refresh/:groupId', protect, refreshLiveMatches);
router.get('/leagues/teams', protect, getLeagueTeams);
router.delete('/leagues/cache', protect, clearLeagueCache);
router.post('/sync-league', protect, syncLeagueFixturesToGroup);
router.get('/head-to-head', protect, getHeadToHead);
router.get('/team-recent', protect, getTeamRecentMatches);
router.get('/:id', protect, getMatchById);
router.post('/add-to-group', protect, addMatchToGroup);
router.post('/fetch', protect, fetchAndSaveMatches);
router.post('/update-results', protect, updateMatchResults);
router.post('/create-manual', protect, createManualMatch);
router.post('/update-score', protect, updateMatchScore);
router.post('/mark-finished', protect, markMatchAsFinished);
router.delete('/:matchId', protect, deleteMatch);
router.put('/:matchId', protect, editMatch);
router.post('/:matchId/set-live', protect, setMatchLive);

module.exports = router;
