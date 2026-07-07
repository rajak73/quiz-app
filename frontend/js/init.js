(function() {
    const isAuthLocal = localStorage.getItem("isAuthenticated");
    const isAuthSession = sessionStorage.getItem("isAuthenticated");
    const hasValidToken = (isAuthLocal === 'true') || (isAuthSession === 'true');
    
    if (!hasValidToken) {
        window.location.replace("login.html");
    } else {
        document.documentElement.style.visibility = 'visible';
    }
})();
