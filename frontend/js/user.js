export let userName = '';

export async function loadUserProfile() {
    const isAuth = localStorage.getItem('isAuthenticated') || sessionStorage.getItem('isAuthenticated');
    if (!isAuth) {
        // Fallback: try to get name from localStorage or use default
        const savedName = localStorage.getItem('userName');
        userName = savedName || 'User';
        updateUserDisplay(userName);
        return;
    }
    
    try {
        const data = await window.authApi.getMe();
        if (data.success && data.user) {
            userName = data.user.name;
            // Save to localStorage for fallback
            localStorage.setItem('userName', userName);
            updateUserDisplay(userName);
        } else {
            // API returned but no user data - use fallback
            const savedName = localStorage.getItem('userName');
            userName = savedName || 'User';
            updateUserDisplay(userName);
        }
    } catch (e) {
        console.error("Profile sync failed:", e);
        // Use fallback on error
        const savedName = localStorage.getItem('userName');
        userName = savedName || 'User';
        updateUserDisplay(userName);
    }
}

export function updateUserDisplay(name) {
    const title = `${name}'s Quiz 🎯`;
    document.getElementById('app-title').innerText = title;
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay) userNameDisplay.innerText = name;
    const welcomeText = document.getElementById('welcome-text');
    if (welcomeText) welcomeText.innerText = `Welcome to ${name}'s Quiz World 🚀`;
}

// Attach to window for backwards compatibility with inline HTML logic
window.loadUserProfile = loadUserProfile;
window.updateUserDisplay = updateUserDisplay;
window.getUserName = () => userName;
