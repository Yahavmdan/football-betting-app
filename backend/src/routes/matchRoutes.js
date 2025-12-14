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
  updateMatchScore
} = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMatches);
router.get('/leagues/available', protect, getAvailableLeagues);
router.get('/:id', protect, getMatchById);
router.post('/add-to-group', protect, addMatchToGroup);
router.post('/fetch', protect, fetchAndSaveMatches);
router.post('/update-results', protect, updateMatchResults);
router.post('/create-manual', protect, createManualMatch);
router.post('/update-score', protect, updateMatchScore);

module.exports = router;
