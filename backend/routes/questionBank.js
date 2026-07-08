const express = require('express');
const router = express.Router();
const questionBankController = require('../controllers/questionBankController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Get questions (optionally filter by subject)
router.get('/', questionBankController.getBankQuestions);

// Save question to bank
router.post('/', questionBankController.saveToBank);

// Delete question from bank
router.delete('/:id', questionBankController.deleteFromBank);

module.exports = router;
