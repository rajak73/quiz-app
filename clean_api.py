import re
import glob

# Remove const API_BASE_URL logic
api_pattern = re.compile(r'const API_BASE_URL = window\.location\.hostname === \'localhost\'\s*\?\s*\'http://localhost:\d+/api\'\s*:\s*\'https://[^\']+\';\n', re.MULTILINE)

# Fix verify-email
with open('frontend/verify-email.html', 'r') as f:
    content = f.read()
content = api_pattern.sub('', content)
content = re.sub(r'const response = await fetch\(`\$\{API_BASE_URL\}/auth/resend-otp`[^;]+;[\s\S]*?const data = await response\.json\(\);', 'const data = await authApi.resendOtp(email);', content)
with open('frontend/verify-email.html', 'w') as f:
    f.write(content)

# Fix forgot-password
with open('frontend/forgot-password.html', 'r') as f:
    content = f.read()
content = api_pattern.sub('', content)
content = re.sub(r'const response = await fetch\(`\$\{API_BASE_URL\}/auth/forgot-password`[^;]+;[\s\S]*?const data = await response\.json\(\);', 'const data = await authApi.forgotPassword(email);', content)
with open('frontend/forgot-password.html', 'w') as f:
    f.write(content)

# Clean others
for html_file in ['frontend/login.html', 'frontend/signup.html', 'frontend/index.html']:
    with open(html_file, 'r') as f:
        content = f.read()
    content = api_pattern.sub('', content)
    with open(html_file, 'w') as f:
        f.write(content)

print("Cleaned API_BASE_URL definition from HTML files")
