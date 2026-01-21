const express = require('express');
const router = express.Router();
const {
  getMatches,
  getMatchById,
  addMatchToGroup,
  fetchAndSaveMatches,
  updateMatchResults,
  getAvailableLeagues,
  createManualMatch,
  updateMatchScore,
  markMatchAsFinished,
  deleteMatch,
  editMatch,
  getHeadToHead,
  getTeamRecentMatches
} = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMatches);
router.get('/leagues/available', protect, getAvailableLeagues);
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

module.exports = router;
