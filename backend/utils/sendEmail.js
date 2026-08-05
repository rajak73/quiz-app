// backend/utils/sendEmail.js
const nodemailer = require('nodemailer');

// ============================================
// 1. CREATE TRANSPORT
// ============================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: {
        // ✅ FIXED: Use the variable names from your .env file
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    },
    tls: {
        rejectUnauthorized: false 
    },
    debug: true, 
    logger: true 
});

// Verify connection configuration on startup
transporter.verify(function (error, success) {
    if (error) {
        console.log('❌ Email Server Connection Error:', error);
    } else {
        console.log('✅ Email Server is ready to take our messages');
    }
});

// ============================================
// EMAIL TEMPLATES
// ============================================
const emailStyles = `
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; }
    .otp-box { padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
    .otp-code { color: #fff; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; }
    .info { color: #666; font-size: 14px; text-align: center; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
    .btn { display: inline-block; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; }
`;

// ============================================
// SEND PASSWORD RESET EMAIL
// ============================================
const sendPasswordResetEmail = async (email, name, otp) => {
    try {
        const mailOptions = {
            from: `"Guddu's Quiz" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔑 Password Reset - Guddu\'s Quiz',
            html: `
                <!DOCTYPE html>
                <html>
                <head><style>${emailStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="color: #ff5f6d;">🔑 Password Reset</h1>
                        </div>
                        <p>Hello <strong>${name}</strong>,</p>
                        <div class="otp-box" style="background: linear-gradient(135deg, #ff5f6d, #ffc371);">
                            <p class="otp-code">${otp}</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Guddu's Quiz</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('❌ Send Password Reset Error:', error);
        throw new Error('Failed to send password reset email');
    }
};

module.exports = { sendPasswordResetEmail };