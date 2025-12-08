const express = require('express');
const router = express.Router();
const {
  createGroup,
  joinGroup,
  getMyGroups,
  getGroupById,
  getLeaderboard
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createGroup);
router.post('/join', protect, joinGroup);
router.get('/', protect, getMyGroups);
router.get('/:id', protect, getGroupById);
router.get('/:id/leaderboard', protect, getLeaderboard);

module.exports = router;
