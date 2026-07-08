const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    options: [{
        type: String,
        trim: true
    }],
    correctAnswer: {
        type: Number,
        required: [true, 'Correct answer is required']
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('QuestionBank', questionBankSchema);
