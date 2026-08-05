const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const sendTokenResponse = require('../utils/sendTokenResponse');

// A placeholder client ID if none is provided.
// In production, GOOGLE_CLIENT_ID must be set in .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

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

        // Update last login
        await user.updateLastLogin();

        // Same cookie + JSON contract as password login/signup
        sendTokenResponse(user, 200, res, 'Logged in successfully with Google');
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during Google login' });
    }
};
