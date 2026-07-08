import { apiCall } from './apiClient.js';

export const testApi = {
    createTest: (data) => apiCall('/tests', { method: 'POST', body: JSON.stringify(data) }),
    getPublicTests: () => apiCall('/tests/public'),
    getMyTests: () => apiCall('/tests/my'),
    joinTest: (testId, payload) => apiCall(`/tests/${testId}/join`, { method: 'POST', body: JSON.stringify(payload) }),
    startTest: (testId, payload) => apiCall(`/tests/${testId}/start`, { method: 'POST', body: JSON.stringify(payload) }),
    getTestDetails: (testId) => apiCall(`/tests/${testId}`),
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
