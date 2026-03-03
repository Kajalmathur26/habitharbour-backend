const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getEntries,
  getSummary,
  getMonthlyTrend,
  createEntry,
  updateEntry,
  deleteEntry,
} = require('../controllers/financeController');

router.use(authenticate); // all finance routes require auth

router.get('/', getEntries);
router.get('/summary', getSummary);
router.get('/monthly-trend', getMonthlyTrend);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

module.exports = router;