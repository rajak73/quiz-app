const Test = require('../models/Test');

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
        
        const validator = require('validator');
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
        
        const validator = require('validator');
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
        
        const validator = require('validator');
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
        
        const validator = require('validator');
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

