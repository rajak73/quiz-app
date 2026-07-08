const QuestionBank = require('../models/QuestionBank');
const validator = require('validator');

exports.saveToBank = async (req, res) => {
    try {
        let { question, options, correctAnswer, subject } = req.body;
        
        if (!question || !options || correctAnswer === undefined || !subject) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        if (!Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ success: false, message: 'At least two options are required' });
        }
        
        // Escape inputs
        question = validator.escape(validator.trim(question));
        subject = validator.escape(validator.trim(subject));
        options = options.map(opt => validator.escape(validator.trim(opt)));
        
        const newQuestion = new QuestionBank({
            question,
            options,
            correctAnswer,
            subject,
            creator: req.user._id
        });
        
        await newQuestion.save();
        
        res.status(201).json({
            success: true,
            message: 'Question saved to bank',
            question: newQuestion
        });
    } catch (error) {
        console.error('Save to bank error:', error);
        res.status(500).json({ success: false, message: 'Failed to save question' });
    }
};

exports.getBankQuestions = async (req, res) => {
    try {
        const { subject } = req.query;
        let query = { creator: req.user._id };
        
        if (subject) {
            query.subject = validator.escape(validator.trim(subject));
        }
        
        const questions = await QuestionBank.find(query).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            questions
        });
    } catch (error) {
        console.error('Get bank questions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch questions' });
    }
};

exports.deleteFromBank = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await QuestionBank.findById(id);
        
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found' });
        }
        
        if (question.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        
        await QuestionBank.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: 'Question deleted from bank'
        });
    } catch (error) {
        console.error('Delete from bank error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete question' });
    }
};
