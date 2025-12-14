const express = require('express');
const router = express.Router();
const {
  placeBet,
  getMyBets,
  getBetsByMatch,
  calculateBetPoints,
  checkExistingBet,
  getGroupMembersBets
} = require('../controllers/betController');
const { protect } = require('../middleware/auth');

router.post('/', protect, placeBet);
router.get('/', protect, getMyBets);
router.get('/check', protect, checkExistingBet);
router.get('/match/:matchId', protect, getBetsByMatch);
router.get('/match/:matchId/group/:groupId/members', protect, getGroupMembersBets);
router.post('/calculate-points', protect, calculateBetPoints);

module.exports = router;
