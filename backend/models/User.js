const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    // ================= BASIC INFO =================
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true, // ✅ Unique already creates index
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
        // ✅ removed index:true (duplicate fix)
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },

    // ================= PROFILE =================
    avatar: {
        type: String,
        default: 'https://via.placeholder.com/150'
    },

    phone: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true; // ✅ allow empty
                return /^[0-9+\-\s()]{10,15}$/.test(v);
            },
            message: 'Please enter a valid phone number'
        }
    },

    bio: {
        type: String,
        maxlength: [200, 'Bio cannot exceed 200 characters']
    },

    // ================= ROLE =================
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    isActive: {
        type: Boolean,
        default: true
    },

    // ================= OTP =================
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },

    // ================= RESET TOKEN =================
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiry: { type: Date, select: false },

    lastLogin: {
        type: Date
    }

}, { timestamps: true });


// ================= INDEXES =================
// ✅ email index already created by unique:true
userSchema.index({ createdAt: -1 });
userSchema.index({ isVerified: 1 });


// ================= PRE SAVE =================
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});


// ================= INSTANCE METHODS =================

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP
userSchema.methods.generateOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    this.otp = crypto.createHash('sha256').update(otp).digest('hex');
    this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // ✅ proper Date

    return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(inputOTP) {
    if (!this.otp || !this.otpExpiry) return false;

    const hashed = crypto.createHash('sha256').update(inputOTP).digest('hex');

    return (
        hashed === this.otp &&
        Date.now() < this.otpExpiry.getTime()
    );
};

// Clear OTP
userSchema.methods.clearOTP = function() {
    this.otp = undefined;
    this.otpExpiry = undefined;
};

// Generate Reset Token
userSchema.methods.generateResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken =
        crypto.createHash('sha256').update(resetToken).digest('hex');

    this.resetPasswordExpiry =
        new Date(Date.now() + 30 * 60 * 1000);

    return resetToken;
};

// Verify Reset Token
userSchema.methods.verifyResetToken = function(inputToken) {
    if (!this.resetPasswordToken || !this.resetPasswordExpiry) return false;

    const hashed =
        crypto.createHash('sha256').update(inputToken).digest('hex');

    return (
        hashed === this.resetPasswordToken &&
        Date.now() < this.resetPasswordExpiry.getTime()
    );
};

// Clear Reset Token
userSchema.methods.clearResetToken = function() {
    this.resetPasswordToken = undefined;
    this.resetPasswordExpiry = undefined;
};

// Update Last Login
userSchema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return await this.save({ validateBeforeSave: false });
};


// ================= STATIC METHODS =================

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email }).select('+password');
};

userSchema.statics.findActive = function() {
    return this.find({ isActive: true });
};


// ================= VIRTUAL =================

userSchema.virtual('fullProfile').get(function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        role: this.role,
        isVerified: this.isVerified,
        createdAt: this.createdAt
    };
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);