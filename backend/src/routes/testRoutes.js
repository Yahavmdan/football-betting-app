const express = require('express');
const router = express.Router();
const { testIsraeliLeague, searchAllLeagues } = require('../controllers/testController');
const { protect } = require('../middleware/auth');

router.get('/israeli-league', protect, testIsraeliLeague);
router.get('/search-leagues', protect, searchAllLeagues);

module.exports = router;
