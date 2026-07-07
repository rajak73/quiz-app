import { apiCall } from './apiClient.js';

export const testApi = {
    createTest: (data) => apiCall('/tests', { method: 'POST', body: JSON.stringify(data) }),
    getPublicTests: () => apiCall('/tests/public'),
    getMyTests: () => apiCall('/tests/my'),
    joinTest: (testId, payload) => apiCall(`/tests/${testId}/join`, { method: 'POST', body: JSON.stringify(payload) }),
    startTest: (testId, payload) => apiCall(`/tests/${testId}/start`, { method: 'POST', body: JSON.stringify(payload) }),
    getTestDetails: (testId) => apiCall(`/tests/${testId}`),
    duplicateTest: (testId) => apiCall(`/tests/${testId}/duplicate`, { method: 'POST' })
};

window.testApi = testApi;
