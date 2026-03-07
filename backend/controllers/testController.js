const Test = require('../models/Test');

// Create a new test
exports.createTest = async (req, res) => {
    try {
        const { title, description, type, maxParticipants, questions, duration, subject } = req.body;
        
        // Validation
        if (!title || !type || !questions || !subject) {
            return res.status(400).json({
                success: false,
                message: 'Title, type, questions, and subject are required'
            });
        }
        
        if (type === 'groupwise' && !maxParticipants) {
            return res.status(400).json({
                success: false,
                message: 'Max participants required for groupwise test'
            });
        }
        
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one question is required'
            });
        }
        
        // Create test
        const testData = {
            title,
            description,
            type,
            creator: req.user._id,
            questions,
            duration: duration || 30,
            subject
        };
        
        if (type === 'groupwise') {
            testData.maxParticipants = maxParticipants;
        }
        
        const test = new Test(testData);
        
        // Generate secret code for groupwise tests
        let secretCode = null;
        if (type === 'groupwise') {
            secretCode = test.generateSecretCode();
        }
        
        // Add creator as first participant for personal tests
        if (type === 'personal') {
            test.participants.push({ user: req.user._id });
        }
        
        await test.save();
        
        res.status(201).json({
            success: true,
            message: 'Test created successfully',
            test: {
                id: test._id,
                title: test.title,
                type: test.type,
                secretCode: secretCode,
                status: test.status,
                createdAt: test.createdAt
            }
        });
        
    } catch (error) {
        console.error('Create test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create test'
        });
    }
};

// Get all public tests
exports.getPublicTests = async (req, res) => {
    try {
        const tests = await Test.find({ 
            type: 'public', 
            isActive: true,
            status: { $in: ['waiting', 'active'] }
        })
        .populate('creator', 'name')
        .select('-questions.correctAnswer -secretCode')
        .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            tests: tests.map(test => ({
                id: test._id,
                title: test.title,
                description: test.description,
                creator: test.creator.name,
                participantCount: test.participantCount,
                status: test.status,
                duration: test.duration,
                subject: test.subject,
                createdAt: test.createdAt
            }))
        });
        
    } catch (error) {
        console.error('Get public tests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public tests'
        });
    }
};

// Get tests created by user
exports.getMyTests = async (req, res) => {
    try {
        const tests = await Test.find({ creator: req.user._id })
            .select('-questions.correctAnswer')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            tests: tests.map(test => ({
                id: test._id,
                title: test.title,
                type: test.type,
                secretCode: test.secretCode,
                participantCount: test.participantCount,
                maxParticipants: test.maxParticipants,
                status: test.status,
                duration: test.duration,
                subject: test.subject,
                createdAt: test.createdAt
            }))
        });
        
    } catch (error) {
        console.error('Get my tests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your tests'
        });
    }
};

// Get tests joined by user
exports.getJoinedTests = async (req, res) => {
    try {
        const tests = await Test.find({
            'participants.user': req.user._id,
            creator: { $ne: req.user._id }
        })
        .populate('creator', 'name')
        .select('-questions.correctAnswer -secretCode')
        .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            tests: tests.map(test => ({
                id: test._id,
                title: test.title,
                type: test.type,
                creator: test.creator.name,
                participantCount: test.participantCount,
                status: test.status,
                myScore: test.getParticipant(req.user._id)?.score || 0,
                createdAt: test.createdAt
            }))
        });
        
    } catch (error) {
        console.error('Get joined tests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch joined tests'
        });
    }
};

// Get single test details
exports.getTest = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id)
            .populate('creator', 'name')
            .populate('participants.user', 'name');
        
        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        const isCreator = test.creator._id.toString() === req.user._id.toString();
        const isParticipant = test.isParticipant(req.user._id);
        
        // Hide correct answers if user is participant and test is active
        let questions = test.questions;
        if (isParticipant && test.status === 'active') {
            questions = test.questions.map(q => ({
                question: q.question,
                options: q.options
            }));
        }
        
        res.json({
            success: true,
            test: {
                id: test._id,
                title: test.title,
                description: test.description,
                type: test.type,
                creator: test.creator.name,
                isCreator,
                isParticipant,
                participantCount: test.participantCount,
                maxParticipants: test.maxParticipants,
                status: test.status,
                duration: test.duration,
                subject: test.subject,
                questions,
                participants: test.participants.map(p => ({
                    name: p.user.name,
                    score: p.score,
                    status: p.status
                })),
                startTime: test.startTime,
                endTime: test.endTime
            }
        });
        
    } catch (error) {
        console.error('Get test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test'
        });
    }
};

// Join a test
exports.joinTest = async (req, res) => {
    try {
        const { secretCode } = req.body;
        const test = await Test.findById(req.params.id).select('+secretCode');
        
        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        // Check if test is active
        if (!test.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Test is not active'
            });
        }
        
        // Check test type and validation
        if (test.type === 'personal') {
            return res.status(403).json({
                success: false,
                message: 'Cannot join personal test'
            });
        }
        
        if (test.type === 'groupwise') {
            if (!secretCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Secret code required'
                });
            }
            
            if (!test.verifySecretCode(secretCode)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid secret code'
                });
            }
        }
        
        // Add participant
        const result = test.addParticipant(req.user._id);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
        await test.save();
        
        res.json({
            success: true,
            message: 'Joined test successfully'
        });
        
    } catch (error) {
        console.error('Join test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join test'
        });
    }
};

// Start a test
exports.startTest = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        
        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        // Only creator can start
        if (test.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only creator can start the test'
            });
        }
        
        const result = test.startTest();
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
        await test.save();
        
        res.json({
            success: true,
            message: 'Test started successfully',
            startTime: test.startTime,
            endTime: test.endTime
        });
        
    } catch (error) {
        console.error('Start test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start test'
        });
    }
};

// Submit answer
exports.submitAnswer = async (req, res) => {
    try {
        const { answers } = req.body;
        const test = await Test.findById(req.params.id);
        
        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        // Check if user is participant
        if (!test.isParticipant(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Not a participant of this test'
            });
        }
        
        // Check if test is active
        if (test.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Test is not active'
            });
        }
        
        // Calculate score
        let score = 0;
        const processedAnswers = answers.map((answer, index) => {
            const question = test.questions[answer.questionIndex];
            const isCorrect = question && answer.selectedOption === question.correctAnswer;
            if (isCorrect) score++;
            
            return {
                questionIndex: answer.questionIndex,
                selectedOption: answer.selectedOption,
                isCorrect,
                timeTaken: answer.timeTaken || 0
            };
        });
        
        // Update participant
        test.updateParticipantScore(req.user._id, score, processedAnswers);
        await test.save();
        
        res.json({
            success: true,
            message: 'Answers submitted successfully',
            score,
            totalQuestions: test.questions.length
        });
        
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit answers'
        });
    }
};

// Get test results
exports.getResults = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id)
            .populate('creator', 'name')
            .populate('participants.user', 'name');
        
        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        // Check if user is participant or creator
        if (!test.isParticipant(req.user._id) && 
            test.creator._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view results'
            });
        }
        
        // Sort participants by score
        const sortedParticipants = test.participants
            .sort((a, b) => b.score - a.score)
            .map((p, index) => ({
                rank: index + 1,
                name: p.user.name,
                score: p.score,
                totalQuestions: test.questions.length,
                completedAt: p.completedAt
            }));
        
        res.json({
            success: true,
            results: {
                title: test.title,
                totalQuestions: test.questions.length,
                participants: sortedParticipants,
                myRank: sortedParticipants.findIndex(
                    p => p.name === test.getParticipant(req.user._id)?.user?.name
                ) + 1
            }
        });
        
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch results'
        });
    }
};

// End test (creator only)
exports.endTest = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        
        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        if (test.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only creator can end the test'
            });
        }
        
        test.endTest();
        await test.save();
        
        res.json({
            success: true,
            message: 'Test ended successfully'
        });
        
    } catch (error) {
        console.error('End test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end test'
        });
    }
};
