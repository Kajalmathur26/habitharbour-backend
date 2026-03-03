const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all goal routes
router.use(authenticate);

// Goal CRUD routes
router.get('/', goalController.getGoals);
router.post('/', goalController.createGoal);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

// Milestones
router.post('/:id/milestones', goalController.addMilestone);

// Update intermediate targets (JSONB)
router.put('/:id/targets', goalController.updateTargets);

module.exports = router;