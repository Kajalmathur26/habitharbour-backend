const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Apply authentication to all journal routes
router.use(authenticate);

// Journal CRUD routes
router.get('/', journalController.getEntries);
router.get('/:id', journalController.getEntry);
router.post('/', journalController.createEntry);
router.put('/:id', journalController.updateEntry);
router.delete('/:id', journalController.deleteEntry);

// Upload image route
router.post('/upload-image', upload.single('image'), journalController.uploadImage);

module.exports = router;