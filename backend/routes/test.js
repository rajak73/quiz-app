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

// End a test
router.post('/:id/end', testController.endTest);

module.exports = router;
