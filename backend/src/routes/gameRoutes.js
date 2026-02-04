const express = require('express');
const router = express.Router();
const GameScore = require('../models/GameScore');
const { protect } = require('../middleware/auth');

// Get leaderboard (global top 10 + personal top 10)
router.get('/leaderboard', protect, async (req, res) => {
  try {
    // Get global top 10 (best score per user)
    const globalLeaderboard = await GameScore.aggregate([
      {
        $group: {
          _id: '$user',
          score: { $max: '$score' },
          latestGame: { $max: '$createdAt' }
        }
      },
      {
        $sort: { score: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          _id: 1,
          score: 1,
          createdAt: '$latestGame',
          user: {
            _id: '$userInfo._id',
            username: '$userInfo.username',
            profilePicture: '$userInfo.profilePicture'
          }
        }
      }
    ]);

    // Get personal top 10 scores for the current user
    const personalScores = await GameScore.find({ user: req.user._id })
      .sort({ score: -1 })
      .limit(10)
      .select('score createdAt');

    res.json({
      success: true,
      data: {
        global: globalLeaderboard,
        personal: personalScores
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
});

// Submit a score (only keeps top 10 per user)
router.post('/score', protect, async (req, res) => {
  try {
    const { score } = req.body;

    if (typeof score !== 'number' || score < 0 || score > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid score'
      });
    }

    // Only save if it's a valid score (at least 1)
    if (score < 1) {
      return res.status(400).json({
        success: false,
        message: 'Score must be at least 1'
      });
    }

    // Get user's current scores count and lowest score
    const userScores = await GameScore.find({ user: req.user._id })
      .sort({ score: 1 }) // Sort ascending to get lowest first
      .limit(10);

    // If user has 10 scores, check if new score is better than lowest
    if (userScores.length >= 10) {
      const lowestScore = userScores[0];
      if (score <= lowestScore.score) {
        // New score isn't better than user's top 10, don't save
        return res.status(200).json({
          success: true,
          data: null,
          message: 'Score not in top 10'
        });
      }
      // Delete the lowest score to make room
      await GameScore.findByIdAndDelete(lowestScore._id);
    }

    const gameScore = await GameScore.create({
      user: req.user._id,
      score
    });

    // Populate user info for response
    await gameScore.populate('user', 'username profilePicture');

    res.status(201).json({
      success: true,
      data: gameScore
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit score'
    });
  }
});

// Get user's personal best
router.get('/personal-best', protect, async (req, res) => {
  try {
    const bestScore = await GameScore.findOne({ user: req.user._id })
      .sort({ score: -1 })
      .select('score createdAt');

    res.json({
      success: true,
      data: bestScore || { score: 0 }
    });
  } catch (error) {
    console.error('Error fetching personal best:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch personal best'
    });
  }
});

module.exports = router;
