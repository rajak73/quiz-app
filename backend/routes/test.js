const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Create a new test
router.post('/', testController.createTest);

// Get public tests
router.get('/public', testController.getPublicTests);

// Get my created tests
router.get('/my', testController.getMyTests);

// Get tests I joined
router.get('/joined', testController.getJoinedTests);

// Find a groupwise test by its secret code
router.post('/find-by-code', testController.findTestByCode);

// Get single test
router.get('/:id', testController.getTest);

// Join a test
router.post('/:id/join', testController.joinTest);

// Start a test
router.post('/:id/start', testController.startTest);

// Submit answers
router.post('/:id/submit', testController.submitAnswer);

// Get test results
router.get('/:id/results', testController.getResults);

// Get creator analytics for a test
router.get('/:id/analytics', testController.getTestAnalytics);

// End a test
router.post('/:id/end', testController.endTest);

// Update a test
router.put('/:id', testController.updateTest);

// Delete a test
router.delete('/:id', testController.deleteTest);

// Duplicate a test
router.post('/:id/duplicate', testController.duplicateTest);

// Save a new draft
router.post('/draft', testController.saveDraft);

// Update an existing draft
router.put('/draft/:id', testController.saveDraft);

// Finalize a draft test
router.post('/:id/finalize', testController.finalizeTest);

module.exports = router;

