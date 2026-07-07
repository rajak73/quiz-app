export async function apiCall(endpoint, options = {}) {
    // window.API_BASE_URL should be set by config.js
    const url = `${window.API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    };
    
    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        return await response.json();
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

// Bind to window for non-module compatibility
window.apiClient = { apiCall };
