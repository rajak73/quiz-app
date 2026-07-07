import re

files = [
    ('frontend/login.html', r"const response = await fetch[^;]+;[\s\S]*?const data = await response\.json\(\);", "const data = await authApi.login(email, password);"),
    ('frontend/signup.html', r"const response = await fetch[^;]+;[\s\S]*?const data = await response\.json\(\);", "const data = await authApi.signup(name, email, password);"),
    ('frontend/verify-email.html', r"const response = await fetch\(`\$\{API_BASE_URL\}/auth/verify-email`[^;]+;[\s\S]*?const data = await response\.json\(\);", "const data = await authApi.verifyEmail(email, otp);"),
    ('frontend/verify-email.html', r"const response = await fetch\(`\$\{API_BASE_URL\}/auth/resend-otp`[^;]+;[\s\S]*?const data = await response\.json\(\);", "const data = await authApi.resendOtp(email);"),
    ('frontend/forgot-password.html', r"const response = await fetch\(`\$\{API_BASE_URL\}/auth/forgot-password`[^;]+;[\s\S]*?const data = await response\.json\(\);", "const data = await authApi.forgotPassword(email);"),
    ('frontend/forgot-password.html', r"const response = await fetch\(`\$\{API_BASE_URL\}/auth/reset-password`[^;]+;[\s\S]*?const data = await response\.json\(\);", "const data = await authApi.resetPassword(email, otp, newPassword);")
]

for filename, pattern, replacement in files:
    with open(filename, 'r') as f:
        content = f.read()
    new_content = re.sub(pattern, replacement, content)
    with open(filename, 'w') as f:
        f.write(new_content)

print("HTML API calls cleaned up.")
