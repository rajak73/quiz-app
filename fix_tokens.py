import re

for filename in ['frontend/login.html', 'frontend/verify-email.html', 'frontend/index.html']:
    with open(filename, 'r') as f:
        content = f.read()
    
    # Remove token setting but leave user setting
    content = re.sub(r'storage\.setItem\(\'token\',\s*data\.token\);?\s*(//.*)?', '', content)
    content = re.sub(r'localStorage\.setItem\(\'token\',\s*data\.token\);?\s*(//.*)?', '', content)
    
    with open(filename, 'w') as f:
        f.write(content)

# Also fix the index.html auth check which reads localStorage.getItem("token")
with open('frontend/index.html', 'r') as f:
    content = f.read()

# Instead of checking token in localStorage, the backend handles auth via cookies.
# But wait! If the backend handles it via cookies, the frontend can't read httpOnly cookies!
# How does index.html know if we are logged in? 
# In authApi, getMe() returns the user. We can use that or a non-httpOnly cookie 'isAuthenticated=true'.
