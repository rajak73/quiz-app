import { apiCall } from './apiClient.js';

export const authApi = {
    login: (email, password) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    signup: (name, email, password) => apiCall('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    forgotPassword: (email) => apiCall('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (email, otp, newPassword) => apiCall('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) }),
    getMe: () => apiCall('/auth/me'),
    googleLogin: (credential) => apiCall('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) })
};

window.authApi = authApi;
