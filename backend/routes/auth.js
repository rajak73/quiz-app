// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/sendEmail');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

// ============================================
// RATE LIMITERS (Different limits for different routes)
// ============================================
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Increased for testing
    message: { success: false, message: 'Too many signup attempts. Try again after 1 hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, message: 'Too many login attempts. Try again after 15 minutes.' },
    skipSuccessfulRequests: true, // Don't count successful logins
});

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many OTP requests. Try again later.' }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Sanitize input
const sanitizeInput = (str) => {
    return validator.escape(validator.trim(str));
};

// Validate email
const isValidEmail = (email) => {
    return validator.isEmail(email);
};

// Send token response (with cookie)
const sendTokenResponse = (user, statusCode, res, message) => {
    const token = generateToken(user._id);

    // Cookie options
    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true, // Prevent XSS
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict' // CSRF protection
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            message,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                isVerified: user.isVerified
            }
        });
};

// ============================================
// 1. SIGNUP
// ============================================
router.post('/signup', signupLimiter, async (req, res) => {
    console.log('📝 Signup request received:', req.body);
    try {
        let { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            console.log('❌ Missing fields');
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        // Sanitize inputs
        name = sanitizeInput(name);
        email = email.toLowerCase().trim();
        console.log('✅ Sanitized:', { name, email });

        // Validate email
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email'
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Password strength check (optional)
        if (!validator.isStrongPassword(password, {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 0,
            minNumbers: 1,
            minSymbols: 0
        })) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one lowercase letter and one number'
            });
        }

        // Check if user exists
        console.log('🔍 Checking if user exists...');
        const existingUser = await User.findOne({ email });
        console.log('✅ User check complete:', existingUser ? 'Found' : 'Not found');

        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered. Please login.'
                });
            } else {
                // Resend OTP
                const otp = existingUser.generateOTP();
                await existingUser.save();
                await sendVerificationEmail(email, existingUser.name, otp);

                return res.status(200).json({
                    success: true,
                    message: 'Verification code resent. Please check your email.',
                    email
                });
            }
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password
        });

        // Generate OTP
        const otp = user.generateOTP();
        await user.save();

        // Send verification email
        await sendVerificationEmail(email, name, otp);

        res.status(201).json({
            success: true,
            message: 'Account created! Please verify your email.',
            email
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 2. VERIFY EMAIL
// ============================================
router.post('/verify-email', async (req, res) => {
    try {
        let { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        email = email.toLowerCase().trim();
        otp = otp.trim();

        // Find user with OTP
        const user = await User.findOne({ email }).select('+otp +otpExpiry');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified. Please login.'
            });
        }

        // Verify OTP
        if (!user.verifyOTP(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        // Update user
        user.isVerified = true;
        user.clearOTP();
        await user.save();

        // Send welcome email
        await sendWelcomeEmail(email, user.name);

        // Send token response
        sendTokenResponse(user, 200, res, 'Email verified successfully!');

    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 3. RESEND OTP
// ============================================
router.post('/resend-otp', otpLimiter, async (req, res) => {
    try {
        let { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        email = email.toLowerCase().trim();

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Generate new OTP
        const otp = user.generateOTP();
        await user.save();

        // Send email
        await sendVerificationEmail(email, user.name, otp);

        res.status(200).json({
            success: true,
            message: 'Verification code sent!'
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 4. LOGIN
// ============================================
router.post('/login', loginLimiter, async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        email = email.toLowerCase().trim();

        // Validate email
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email'
            });
        }

        // Find user with password
        const user = await User.findByEmail(email); // Using static method

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Contact support.'
            });
        }

        // Check if verified
        if (!user.isVerified) {
            const otp = user.generateOTP();
            await user.save();
            await sendVerificationEmail(email, user.name, otp);

            return res.status(403).json({
                success: false,
                message: 'Email not verified. New verification code sent.',
                requiresVerification: true,
                email
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login (without validation)
        await user.updateLastLogin();

        // Send token response
        sendTokenResponse(user, 200, res, 'Login successful!');

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 5. FORGOT PASSWORD
// ============================================
router.post('/forgot-password', otpLimiter, async (req, res) => {
    try {
        let { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        email = email.toLowerCase().trim();

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Security: Don't reveal if email exists
            return res.status(200).json({
                success: true,
                message: 'If that email exists, a reset code has been sent.'
            });
        }

        // Generate reset OTP
        const otp = user.generateOTP();
        await user.save();

        // Send reset email
        await sendPasswordResetEmail(email, user.name, otp);

        res.status(200).json({
            success: true,
            message: 'Password reset code sent to your email'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 6. RESET PASSWORD
// ============================================
router.post('/reset-password', async (req, res) => {
    try {
        let { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        email = email.toLowerCase().trim();
        otp = otp.trim();

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Password strength check
        if (!validator.isStrongPassword(newPassword, {
            minLength: 6,
            minLowercase: 1,
            minNumbers: 1,
            minSymbols: 0
        })) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one lowercase letter and one number'
            });
        }

        // Find user with OTP
        const user = await User.findOne({ email }).select('+otp +otpExpiry');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify OTP
        if (!user.verifyOTP(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code'
            });
        }

        // Update password
        user.password = newPassword;
        user.clearOTP();
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful! You can now login.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 7. GET CURRENT USER (Protected)
// ============================================
router.get('/me', protect, async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                avatar: req.user.avatar,
                phone: req.user.phone,
                bio: req.user.bio,
                role: req.user.role,
                isVerified: req.user.isVerified,
                createdAt: req.user.createdAt,
                lastLogin: req.user.lastLogin
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 8. UPDATE PROFILE (Protected)
// ============================================
router.put('/update-profile', protect, async (req, res) => {
    try {
        let { name, phone, bio } = req.body;

        const updateFields = {};

        if (name) {
            name = sanitizeInput(name);
            if (name.length < 2 || name.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: 'Name must be between 2-50 characters'
                });
            }
            updateFields.name = name;
        }

        if (phone) {
            phone = phone.trim();
            if (!validator.isMobilePhone(phone, 'any')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid phone number'
                });
            }
            updateFields.phone = phone;
        }

        if (bio) {
            bio = sanitizeInput(bio);
            if (bio.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'Bio cannot exceed 200 characters'
                });
            }
            updateFields.bio = bio;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateFields,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                bio: user.bio,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 9. CHANGE PASSWORD (Protected)
// ============================================
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// 10. LOGOUT
// ============================================
router.post('/logout', protect, (req, res) => {
    // Clear cookie
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

// ============================================
// 11. REFRESH TOKEN (Optional - for auto login)
// ============================================
router.post('/refresh-token', async (req, res) => {
    try {
        const token = req.cookies.token || req.body.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Verify old token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.isVerified || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Generate new token
        sendTokenResponse(user, 200, res, 'Token refreshed');

    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
});

module.exports = router;
