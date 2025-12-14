const express = require('express');
const router = express.Router();
const {
  createGroup,
  joinGroup,
  getMyGroups,
  getGroupById,
  getLeaderboard,
  editGroup,
  deleteGroup,
  leaveGroup
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createGroup);
router.post('/join', protect, joinGroup);
router.get('/', protect, getMyGroups);
router.get('/:id', protect, getGroupById);
router.get('/:id/leaderboard', protect, getLeaderboard);
router.put('/:id', protect, editGroup);
router.delete('/:id', protect, deleteGroup);
router.post('/:id/leave', protect, leaveGroup);

module.exports = router;
