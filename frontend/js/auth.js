export function initAuth() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('isAuthenticated'); sessionStorage.removeItem('isAuthenticated'); localStorage.clear();
            sessionStorage.clear();
            window.location.replace('login.html');
        });
    }
}

// Auto-initialize if DOM is already loaded, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
