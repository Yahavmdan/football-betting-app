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
  leaveGroup,
  getFilterPreferences,
  saveFilterPreferences,
  clearFilterPreferences,
  getPendingMembers,
  approveMember,
  rejectMember,
  cancelJoinRequest,
  kickMember,
  updateTrashTalk,
  adjustMemberPoints,
  adjustMemberStats
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
router.get('/:id/filter-preferences', protect, getFilterPreferences);
router.post('/:id/filter-preferences', protect, saveFilterPreferences);
router.delete('/:id/filter-preferences', protect, clearFilterPreferences);

// Member management routes
router.get('/:id/pending', protect, getPendingMembers);
router.post('/:id/approve/:userId', protect, approveMember);
router.post('/:id/reject/:userId', protect, rejectMember);
router.post('/:id/cancel-join', protect, cancelJoinRequest);
router.post('/:id/kick/:userId', protect, kickMember);

// Admin: adjust member points and stats
router.put('/:id/members/:userId/points', protect, adjustMemberPoints);
router.put('/:id/members/:userId/stats', protect, adjustMemberStats);

// Trash talk
router.post('/:id/trash-talk', protect, updateTrashTalk);

module.exports = router;
