const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Profile routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

// Avatar upload route
router.post(
  '/upload-avatar',
  authenticate,
  upload.single('avatar'),
  authController.uploadAvatar
);

// Delete account route
router.delete('/account', authenticate, authController.deleteAccount);

module.exports = router;