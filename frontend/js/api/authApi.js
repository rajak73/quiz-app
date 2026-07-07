import { apiCall } from './apiClient.js';

export const authApi = {
    login: (email, password) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    signup: (name, email, password) => apiCall('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    forgotPassword: (email) => apiCall('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (email, otp, newPassword) => apiCall('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) }),
    verifyEmail: (email, otp) => apiCall('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, otp }) }),
    resendOtp: (email) => apiCall('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }),
    getMe: () => apiCall('/auth/me')
};

window.authApi = authApi;
