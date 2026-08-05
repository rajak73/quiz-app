import { apiCall } from './apiClient.js';

export const testApi = {
    createTest: (data) => apiCall('/tests', { method: 'POST', body: JSON.stringify(data) }),
    getPublicTests: (page = 1, limit = 20) => apiCall(`/tests/public?page=${page}&limit=${limit}`),
    getMyTests: (page = 1, limit = 20) => apiCall(`/tests/my?page=${page}&limit=${limit}`),
    getJoinedTests: (page = 1, limit = 20) => apiCall(`/tests/joined?page=${page}&limit=${limit}`),
    findTestByCode: (code) => apiCall('/tests/find-by-code', { method: 'POST', body: JSON.stringify({ code }) }),
    joinTest: (testId, payload) => apiCall(`/tests/${testId}/join`, { method: 'POST', body: JSON.stringify(payload) }),
    startTest: (testId, payload) => apiCall(`/tests/${testId}/start`, { method: 'POST', body: JSON.stringify(payload) }),
    getTestDetails: (testId) => apiCall(`/tests/${testId}`),
    submitAnswer: (testId, answers) => apiCall(`/tests/${testId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
    getResults: (testId) => apiCall(`/tests/${testId}/results`),
    getTestAnalytics: (testId) => apiCall(`/tests/${testId}/analytics`),
    endTest: (testId) => apiCall(`/tests/${testId}/end`, { method: 'POST' }),
    updateTest: (testId, data) => apiCall(`/tests/${testId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTest: (testId) => apiCall(`/tests/${testId}`, { method: 'DELETE' }),
    duplicateTest: (testId) => apiCall(`/tests/${testId}/duplicate`, { method: 'POST' }),
    saveDraft: (data) => apiCall('/tests/draft', { method: 'POST', body: JSON.stringify(data) }),
    updateDraft: (id, data) => apiCall(`/tests/draft/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    finalizeTest: (id, data) => apiCall(`/tests/${id}/finalize`, { method: 'POST', body: JSON.stringify(data) }),

    // Question Bank
    getBankQuestions: (subject = '') => apiCall(`/question-bank${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`),
    saveToBank: (questionData) => apiCall('/question-bank', { method: 'POST', body: JSON.stringify(questionData) }),
    deleteFromBank: (id) => apiCall(`/question-bank/${id}`, { method: 'DELETE' })
};

window.testApi = testApi;
