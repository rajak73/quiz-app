import re

# Fix index.html
with open('frontend/index.html', 'r') as f:
    content = f.read()
# Replace the auth check logic
auth_check_old = """        const token = localStorage.getItem("token");
        const sessionToken = sessionStorage.getItem("token");
        const hasValidToken = (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') ||
                              (sessionToken && sessionToken !== 'null' && sessionToken !== 'undefined' && sessionToken.trim() !== '');"""
auth_check_new = """        const isAuthLocal = localStorage.getItem("isAuthenticated");
        const isAuthSession = sessionStorage.getItem("isAuthenticated");
        const hasValidToken = (isAuthLocal === 'true') || (isAuthSession === 'true');"""
content = content.replace(auth_check_old, auth_check_new)
with open('frontend/index.html', 'w') as f:
    f.write(content)

# Fix user.js
with open('frontend/js/user.js', 'r') as f:
    content = f.read()
content = content.replace("const token = localStorage.getItem('token');", "const isAuth = localStorage.getItem('isAuthenticated') || sessionStorage.getItem('isAuthenticated');")
content = content.replace("if (!token)", "if (!isAuth)")
with open('frontend/js/user.js', 'w') as f:
    f.write(content)

# Fix login.html
with open('frontend/login.html', 'r') as f:
    content = f.read()
# Add storage.setItem('isAuthenticated', 'true') where login succeeds
# But I removed it earlier. Let's re-add it.
# find: if (data.success) {
content = content.replace("if (data.success) {", "if (data.success) {\n            const storage = rememberMe ? localStorage : sessionStorage;\n            storage.setItem('user', JSON.stringify(data.user));\n            storage.setItem('isAuthenticated', 'true');")
with open('frontend/login.html', 'w') as f:
    f.write(content)

# Fix verify-email.html
with open('frontend/verify-email.html', 'r') as f:
    content = f.read()
content = content.replace("localStorage.setItem('user', JSON.stringify(data.user));", "localStorage.setItem('user', JSON.stringify(data.user));\n                    localStorage.setItem('isAuthenticated', 'true');")
with open('frontend/verify-email.html', 'w') as f:
    f.write(content)

# Fix auth.js logout
with open('frontend/js/auth.js', 'r') as f:
    content = f.read()
content = content.replace("localStorage.clear();", "localStorage.removeItem('isAuthenticated'); sessionStorage.removeItem('isAuthenticated'); localStorage.clear();")
content = content.replace("sessionStorage.clear();", "sessionStorage.clear();")
with open('frontend/js/auth.js', 'w') as f:
    f.write(content)

print("Auth check logic updated to use isAuthenticated boolean")
