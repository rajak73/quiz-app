const mongoose = require('mongoose');
const crypto = require('crypto');

const participantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    score: {
        type: Number,
        default: 0
    },
    answers: [{
        questionIndex: Number,
        selectedOption: Number,
        isCorrect: Boolean,
        timeTaken: Number
    }],
    completedAt: {
        type: Date
    },
    status: {
        type: String,
        enum: ['joined', 'in-progress', 'completed'],
        default: 'joined'
    }
});

const testSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Test title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    type: {
        type: String,
        enum: ['personal', 'groupwise', 'public'],
        required: true
    },
    
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    secretCode: {
        type: String,
        select: false
    },
    
    maxParticipants: {
        type: Number,
        min: [2, 'Minimum 2 participants required for groupwise'],
        max: [100, 'Maximum 100 participants allowed']
    },
    
    participants: [participantSchema],
    
    questions: [{
        question: {
            type: String,
            required: true
        },
        options: [{
            type: String,
            required: true
        }],
        correctAnswer: {
            type: Number,
            required: true
        },
        explanation: {
            type: String
        }
    }],
    
    status: {
        type: String,
        enum: ['waiting', 'active', 'completed'],
        default: 'waiting'
    },
    
    startTime: {
        type: Date
    },
    
    endTime: {
        type: Date
    },
    
    duration: {
        type: Number,
        default: 30
    },
    
    isActive: {
        type: Boolean,
        default: true
    },
    
    subject: {
        type: String,
        required: true
    }
    
}, { timestamps: true });

// Indexes
testSchema.index({ type: 1, status: 1, createdAt: -1 });
testSchema.index({ creator: 1 });
testSchema.index({ secretCode: 1 });

// Generate secret code for groupwise tests
testSchema.methods.generateSecretCode = function() {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.secretCode = code;
    return code;
};

// Verify secret code
testSchema.methods.verifySecretCode = function(code) {
    return this.secretCode === code.toUpperCase();
};

// Add participant
testSchema.methods.addParticipant = function(userId) {
    const alreadyJoined = this.participants.some(
        p => p.user.toString() === userId.toString()
    );
    
    if (alreadyJoined) {
        return { success: false, message: 'Already joined this test' };
    }
    
    if (this.type === 'groupwise' && this.participants.length >= this.maxParticipants) {
        return { success: false, message: 'Test is full' };
    }
    
    this.participants.push({ user: userId });
    return { success: true };
};

// Start test
testSchema.methods.startTest = function() {
    if (this.status !== 'waiting') {
        return { success: false, message: 'Test already started or completed' };
    }
    
    this.status = 'active';
    this.startTime = new Date();
    this.endTime = new Date(Date.now() + this.duration * 60 * 1000);
    return { success: true };
};

// End test
testSchema.methods.endTest = function() {
    this.status = 'completed';
    this.endTime = new Date();
    return { success: true };
};

// Get participant count
testSchema.virtual('participantCount').get(function() {
    return this.participants.length;
});

// Check if user is participant
testSchema.methods.isParticipant = function(userId) {
    return this.participants.some(
        p => p.user.toString() === userId.toString()
    );
};

// Get participant data
testSchema.methods.getParticipant = function(userId) {
    return this.participants.find(
        p => p.user.toString() === userId.toString()
    );
};

// Update participant score
testSchema.methods.updateParticipantScore = function(userId, score, answers) {
    const participant = this.getParticipant(userId);
    if (participant) {
        participant.score = score;
        participant.answers = answers;
        participant.status = 'completed';
        participant.completedAt = new Date();
        return true;
    }
    return false;
};

testSchema.set('toJSON', { virtuals: true });
testSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Test', testSchema);
