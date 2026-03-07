// backend/utils/generateToken.js
const jwt = require('jsonwebtoken');

const generateToken = (userId, role = 'user') => {
    return jwt.sign(
        { 
            id: userId,
            role: role // Include role in token
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRE || '7d',
            issuer: 'guddu-quiz' // Optional: token issuer
        }
    );
};

module.exports = generateToken;