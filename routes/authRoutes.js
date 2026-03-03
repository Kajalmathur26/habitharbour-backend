const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, deleteAccount } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.delete('/account', authenticate, deleteAccount);

module.exports = router;
