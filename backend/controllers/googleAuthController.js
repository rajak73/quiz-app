const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// A placeholder client ID if none is provided. 
// In production, GOOGLE_CLIENT_ID must be set in .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Generate JWT token
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

/**
 * Handle Google Login / Registration
 */
exports.googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential missing' });
        }

        // Verify the token with Google
        // If we are using a placeholder, we might not be able to verify against Google APIs,
        // but let's assume the user has configured GOOGLE_CLIENT_ID properly.
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (error) {
            console.error('Google token verification failed:', error);
            return res.status(401).json({ success: false, message: 'Invalid Google token' });
        }

        const { sub: googleId, email, name, picture } = payload;

        // Check if user already exists by email or googleId
        let user = await User.findOne({ $or: [{ email }, { googleId }] });

        if (user) {
            // If user exists but doesn't have googleId linked yet, link it.
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // User does not exist, create a new one
            user = await User.create({
                name,
                email,
                avatar: picture,
                googleId,
                authProvider: 'google',
                isVerified: true // Google accounts are implicitly email-verified
            });
        }

        // Generate our JWT token
        const token = generateToken(user._id);

        // Update last login
        await user.updateLastLogin();

        // Set JWT in HTTP-Only Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(200).json({
            success: true,
            message: 'Logged in successfully with Google',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during Google login' });
    }
};
