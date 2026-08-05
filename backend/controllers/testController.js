const Test = require('../models/Test');
const validator = require('validator');

// If an active test's time is up, flip it to completed so stale tests
// can't keep accepting answers or show as "active" forever.
async function autoExpireIfNeeded(test) {
    if (test.status === 'active' && test.endTime && test.endTime <= new Date()) {
        test.endTest();
        await test.save();
    }
}

// Create a new test
exports.createTest = async (req, res) => {
    try {
        let { title, description, type, maxParticipants, questions, duration, subject } = req.body;
        
        // Validation
        if (!title || !type || !questions || !subject) {
            return res.status(400).json({
                success: false,
                message: 'Title, type, questions, and subject are required'
            });
        }
        
        title = validator.escape(validator.trim(title));
        if (description) description = validator.escape(validator.trim(description));
        subject = validator.escape(validator.trim(subject));
        
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

// Read page/limit query params into safe, bounded numbers
function getPagination(req, defaultLimit = 20, maxLimit = 100) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
    return { page, limit, skip: (page - 1) * limit };
}

// Get all public tests
exports.getPublicTests = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req);
        const filter = {
            type: 'public',
            isActive: true,
            status: { $in: ['waiting', 'active'] }
        };

        const [tests, total] = await Promise.all([
            Test.find(filter)
                .populate('creator', 'name')
                .select('-questions.correctAnswer -secretCode')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Test.countDocuments(filter)
        ]);

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
            })),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
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
        const { page, limit, skip } = getPagination(req);
        const filter = { creator: req.user._id };

        const [tests, total] = await Promise.all([
            Test.find(filter)
                .select('-questions.correctAnswer')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Test.countDocuments(filter)
        ]);

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
            })),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
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
        const { page, limit, skip } = getPagination(req);
        const filter = {
            'participants.user': req.user._id,
            creator: { $ne: req.user._id }
        };

        const [tests, total] = await Promise.all([
            Test.find(filter)
                .populate('creator', 'name')
                .select('-questions.correctAnswer -secretCode')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Test.countDocuments(filter)
        ]);

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
            })),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
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

        await autoExpireIfNeeded(test);

        const isCreator = test.creator._id.toString() === req.user._id.toString();
        const isParticipant = test.isParticipant(req.user._id);
        
        // Hide correct answers for everyone except the creator
        let questions = test.questions;
        if (!isCreator) {
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

// Find a groupwise test by its secret code (used by the "Join a Test" code box)
exports.findTestByCode = async (req, res) => {
    try {
        let { code } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Secret code is required'
            });
        }

        code = code.trim().toUpperCase();

        const test = await Test.findOne({ secretCode: code, type: 'groupwise' }).select('+secretCode');

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'No test found with that code'
            });
        }

        res.json({
            success: true,
            testId: test._id
        });

    } catch (error) {
        console.error('Find test by code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to look up test'
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

        await autoExpireIfNeeded(test);

        // Check if test is active
        if (test.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: test.status === 'completed' ? 'Test has ended' : 'Test is not active'
            });
        }

        // Prevent re-submission from overwriting an already-scored attempt
        const participant = test.getParticipant(req.user._id);
        if (participant && participant.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted this test'
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
                userId: p.user._id,
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
                    p => p.userId.toString() === req.user._id.toString()
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

// Get creator analytics (average score, participation, per-question accuracy)
exports.getTestAnalytics = async (req, res) => {
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
                message: 'Only the creator can view analytics'
            });
        }

        const completedParticipants = test.participants.filter(p => p.status === 'completed');
        const totalQuestions = test.questions.length;

        const averageScore = completedParticipants.length
            ? completedParticipants.reduce((sum, p) => sum + p.score, 0) / completedParticipants.length
            : 0;

        const perQuestion = test.questions.map((q, index) => {
            let correct = 0;
            let attempted = 0;
            completedParticipants.forEach(p => {
                const answer = p.answers.find(a => a.questionIndex === index);
                if (answer) {
                    attempted++;
                    if (answer.isCorrect) correct++;
                }
            });
            return {
                questionIndex: index,
                question: q.question,
                correctCount: correct,
                attemptedCount: attempted,
                correctPercent: attempted ? Math.round((correct / attempted) * 100) : 0
            };
        });

        const hardestQuestion = perQuestion.length
            ? perQuestion.reduce((hardest, q) => (q.correctPercent < hardest.correctPercent ? q : hardest), perQuestion[0])
            : null;

        res.json({
            success: true,
            analytics: {
                title: test.title,
                totalParticipants: test.participants.length,
                completedCount: completedParticipants.length,
                totalQuestions,
                averageScore: Math.round(averageScore * 10) / 10,
                perQuestion,
                hardestQuestion
            }
        });

    } catch (error) {
        console.error('Get test analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics'
        });
    }
};

// Update a test (creator only)
exports.updateTest = async (req, res) => {
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
                message: 'Only creator can update the test'
            });
        }
        
        // Cannot update if test is already active or completed
        if (test.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update an active or completed test'
            });
        }
        
        let { title, description, maxParticipants, duration, subject } = req.body;
        
        if (title) test.title = validator.escape(validator.trim(title));
        if (description) test.description = validator.escape(validator.trim(description));
        if (subject) test.subject = validator.escape(validator.trim(subject));
        if (duration) test.duration = duration;
        
        if (test.type === 'groupwise' && maxParticipants) {
            test.maxParticipants = maxParticipants;
        }
        
        await test.save();
        
        res.json({
            success: true,
            message: 'Test updated successfully',
            test: {
                id: test._id,
                title: test.title,
                description: test.description,
                type: test.type,
                duration: test.duration,
                subject: test.subject
            }
        });
        
    } catch (error) {
        console.error('Update test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update test'
        });
    }
};

// Delete a test (creator only)
exports.deleteTest = async (req, res) => {
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
                message: 'Only creator can delete the test'
            });
        }
        
        await Test.deleteOne({ _id: req.params.id });
        
        res.json({
            success: true,
            message: 'Test deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete test'
        });
    }
};

// Duplicate a test (creator only)
exports.duplicateTest = async (req, res) => {
    try {
        const originalTest = await Test.findById(req.params.id);
        
        if (!originalTest) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        // Verify ownership
        if (originalTest.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only creator can duplicate the test'
            });
        }
        
        // Create cloned data (stripping out participants and IDs)
        const clonedQuestions = originalTest.questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
        }));

        const testData = {
            title: `${originalTest.title} (Copy)`,
            description: originalTest.description,
            type: originalTest.type,
            creator: req.user._id,
            duration: originalTest.duration,
            subject: originalTest.subject,
            questions: clonedQuestions
        };
        
        if (originalTest.type === 'groupwise') {
            testData.maxParticipants = originalTest.maxParticipants;
        }
        
        const duplicatedTest = new Test(testData);
        
        // Generate secret code for groupwise tests
        let secretCode = null;
        if (duplicatedTest.type === 'groupwise') {
            secretCode = duplicatedTest.generateSecretCode();
        }
        
        // Add creator as first participant for personal tests
        if (duplicatedTest.type === 'personal') {
            duplicatedTest.participants.push({ user: req.user._id });
        }
        
        await duplicatedTest.save();
        
        res.status(201).json({
            success: true,
            message: 'Test duplicated successfully',
            test: {
                id: duplicatedTest._id,
                title: duplicatedTest.title,
                type: duplicatedTest.type,
                secretCode: secretCode,
                status: duplicatedTest.status,
                createdAt: duplicatedTest.createdAt
            }
        });
        
    } catch (error) {
        console.error('Duplicate test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to duplicate test'
        });
    }
};

// Save or update a draft test
exports.saveDraft = async (req, res) => {
    try {
        const { id } = req.params;
        let { title, description, type, maxParticipants, questions, duration, subject } = req.body;
        
        if (title) title = validator.escape(validator.trim(title));
        if (description) description = validator.escape(validator.trim(description));
        if (subject) subject = validator.escape(validator.trim(subject));
        
        const draftData = {
            title: title || 'Untitled Quiz',
            description,
            type: type || 'personal',
            creator: req.user._id,
            duration: duration || 30,
            subject: subject || 'Uncategorized',
            status: 'draft',
            questions: questions || []
        };
        
        if (type === 'groupwise' && maxParticipants) {
            draftData.maxParticipants = maxParticipants;
        }

        let test;
        if (id) {
            test = await Test.findById(id);
            if (!test) {
                return res.status(404).json({ success: false, message: 'Draft not found' });
            }
            if (test.creator.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
            
            test.title = draftData.title;
            test.description = draftData.description;
            test.type = draftData.type;
            test.duration = draftData.duration;
            test.subject = draftData.subject;
            test.questions = draftData.questions;
            if (draftData.maxParticipants) test.maxParticipants = draftData.maxParticipants;
            
            await test.save();
        } else {
            test = new Test(draftData);
            await test.save();
        }
        
        res.json({
            success: true,
            message: 'Draft saved successfully',
            testId: test._id
        });
    } catch (error) {
        console.error('Save draft error:', error);
        res.status(500).json({ success: false, message: 'Failed to save draft' });
    }
};

// Finalize a draft into a waiting test
exports.finalizeTest = async (req, res) => {
    try {
        const { id } = req.params;
        const test = await Test.findById(id);
        
        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
        if (test.creator.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
        
        let { title, description, type, maxParticipants, questions, duration, subject } = req.body;
        
        if (!title || !type || !questions || !subject) {
            return res.status(400).json({ success: false, message: 'Title, type, questions, and subject are required' });
        }
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one question is required' });
        }
        
        test.title = validator.escape(validator.trim(title));
        if (description) test.description = validator.escape(validator.trim(description));
        test.subject = validator.escape(validator.trim(subject));
        test.type = type;
        test.duration = duration || 30;
        test.questions = questions;
        if (type === 'groupwise') {
            if (!maxParticipants) return res.status(400).json({ success: false, message: 'Max participants required' });
            test.maxParticipants = maxParticipants;
            if (!test.secretCode) test.generateSecretCode();
        }
        
        test.status = 'waiting';
        
        // Add creator as first participant for personal tests
        if (type === 'personal') {
            if (!test.participants.some(p => p.user.toString() === req.user._id.toString())) {
                test.participants.push({ user: req.user._id });
            }
        }
        
        await test.save();
        
        res.json({
            success: true,
            message: 'Test finalized successfully',
            test: {
                id: test._id,
                secretCode: test.secretCode,
                status: test.status
            }
        });
    } catch (error) {
        console.error('Finalize test error:', error);
        res.status(500).json({ success: false, message: 'Failed to finalize test' });
    }
};

