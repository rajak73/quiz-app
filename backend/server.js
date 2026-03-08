require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Import configurations
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/test'); 

// ============================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// 1. Security (Modified for Inline Scripts)
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false
}));

// 2. CORS (Allows your Frontend to talk to Backend)
const corsOrigins = [
    process.env.FRONTEND_URL,
    'https://majestic-praline-3d0121.netlify.app',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:5000',
    'http://localhost:3000',
    'https://localhost:3000'
].filter(Boolean); // Remove undefined/null

app.use(cors({
    origin: corsOrigins,
    credentials: true, // Allows Cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Static files disabled - Frontend hosted on Netlify 

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// 5. API Rate Limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests. Try again later.' }
});
app.use('/api/', globalLimiter);

// ============================================
// ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);

// ✅ Home Route - API Health Check
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Quiz App API is running!' });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error Trace:', err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Server Running at: http://localhost:${PORT}`);
        console.log(`📡 API Base: http://localhost:${PORT}/api/auth\n`);
    });
}).catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
});