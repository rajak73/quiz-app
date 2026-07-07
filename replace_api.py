import glob
import re

def replace_login(content):
    pattern = re.compile(r'await fetch\(`\$\{API_BASE_URL\}/auth/login`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(\{ email, password \}\)\s*\}\);')
    return pattern.sub('await window.authApi.login(email, password);', content)

def replace_signup(content):
    pattern = re.compile(r'await fetch\(`\$\{API_BASE_URL\}/auth/signup`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(\{ name, email, password \}\)\s*\}\);')
    return pattern.sub('await window.authApi.signup(name, email, password);', content)

def replace_forgot(content):
    # forgot password
    pattern1 = re.compile(r'await fetch\(`\$\{API_BASE_URL\}/auth/forgot-password`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(\{ email \}\)\s*\}\);')
    content = pattern1.sub('await window.authApi.forgotPassword(email);', content)
    # reset password
    pattern2 = re.compile(r'await fetch\(`\$\{API_BASE_URL\}/auth/reset-password`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(\{ email, otp, newPassword \}\)\s*\}\);')
    content = pattern2.sub('await window.authApi.resetPassword(email, otp, newPassword);', content)
    return content

def replace_verify(content):
    pattern1 = re.compile(r'await fetch\(`\$\{API_BASE_URL\}/auth/verify-email`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(\{ email, otp \}\)\s*\}\);')
    content = pattern1.sub('await window.authApi.verifyEmail(email, otp);', content)
    pattern2 = re.compile(r'await fetch\(`\$\{API_BASE_URL\}/auth/resend-otp`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(\{ email \}\)\s*\}\);')
    content = pattern2.sub('await window.authApi.resendOtp(email);', content)
    return content

for filepath in glob.glob('frontend/*.html'):
    if filepath == 'frontend/index.html' or filepath == 'frontend/newindex.html':
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = replace_login(content)
    content = replace_signup(content)
    content = replace_forgot(content)
    content = replace_verify(content)

    with open(filepath, 'w') as f:
        f.write(content)

print("Replacement complete")
