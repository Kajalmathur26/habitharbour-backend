const express = require('express');
const router = express.Router();
const moodController = require('../controllers/moodController');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all mood routes
router.use(authenticate);

// Mood routes
router.get('/', moodController.getMoods);
router.get('/stats', moodController.getMoodStats);
router.get('/trend', moodController.getMoodTrend); // trend route
router.post('/', moodController.logMood);
router.put('/:id', moodController.updateMood); // update mood

module.exports = router;