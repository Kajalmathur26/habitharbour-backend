const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { exportFinanceCSV, exportJournalText, exportProductivityJSON } = require('../controllers/exportController');

router.use(authMiddleware);

router.get('/finance', exportFinanceCSV);
router.get('/journal', exportJournalText);
router.get('/productivity', exportProductivityJSON);

module.exports = router;
