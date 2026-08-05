const generateToken = require('./generateToken');

// Issue JWT, set it as an httpOnly cookie, and send the standard auth JSON response.
// Shared by password login, signup and Google login so both flows behave identically.
const sendTokenResponse = (user, statusCode, res, message) => {
    const token = generateToken(user._id, user.role);

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

module.exports = sendTokenResponse;
