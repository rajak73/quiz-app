// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// ============================================
// RATE LIMITERS
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
// ROUTES
// ============================================
router.post('/signup', signupLimiter, authController.signup);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-otp', otpLimiter, authController.resendOTP);
router.post('/login', loginLimiter, authController.login);
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);
router.post('/logout', protect, authController.logout);

// Optional token refresh
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
