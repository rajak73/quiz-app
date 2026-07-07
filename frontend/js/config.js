// frontend/js/config.js
// API Base URL - Automatically detects local vs production
window.API_BASE_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
    ? 'http://localhost:5001/api' 
    : 'https://quiz-app-0flj.onrender.com/api';

var API_BASE_URL = window.API_BASE_URL; // For backward compatibility with inline scripts that expect it as a global var.
