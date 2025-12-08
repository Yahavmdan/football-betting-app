const express = require('express');
const router = express.Router();
const {
  getMatches,
  getMatchById,
  addMatchToGroup,
  fetchAndSaveMatches,
  updateMatchResults,
  getAvailableLeagues
} = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMatches);
router.get('/:id', protect, getMatchById);
router.get('/leagues/available', protect, getAvailableLeagues);
router.post('/add-to-group', protect, addMatchToGroup);
router.post('/fetch', protect, fetchAndSaveMatches);
router.post('/update-results', protect, updateMatchResults);

module.exports = router;
