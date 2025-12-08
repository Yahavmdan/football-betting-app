const express = require('express');
const router = express.Router();
const {
  placeBet,
  getMyBets,
  getBetsByMatch,
  calculateBetPoints,
  checkExistingBet
} = require('../controllers/betController');
const { protect } = require('../middleware/auth');

router.post('/', protect, placeBet);
router.get('/', protect, getMyBets);
router.get('/check', protect, checkExistingBet);
router.get('/match/:matchId', protect, getBetsByMatch);
router.post('/calculate-points', protect, calculateBetPoints);

module.exports = router;
