const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getTransactions, createTransaction, deleteTransaction, getSummary } = require('../controllers/financeController');

router.use(auth);

router.get('/summary', getSummary);
router.get('/', getTransactions);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
