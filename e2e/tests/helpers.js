// Shared helpers for the e2e suite.

async function signupAndLogin(page, email, name, password = 'Password123') {
  await page.goto('/signup.html', { waitUntil: 'networkidle' });
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.check('#terms');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/signup')),
    page.click('#submitBtn'),
  ]);
  await page.waitForURL('**/login.html', { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  await page.fill('#email', email);
  await page.fill('#password', password);
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/login')),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForURL('**/index.html', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

module.exports = { signupAndLogin, uniqueEmail };
