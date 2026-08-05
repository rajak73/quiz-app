const { test, expect } = require('@playwright/test');
const { signupAndLogin, uniqueEmail } = require('./helpers');

test.describe('Auth flow', () => {
  test('signup redirects to login, login redirects to index with no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !m.text().includes('GSI_LOGGER') && !m.text().includes('403')) {
        errors.push(m.text());
      }
    });

    await signupAndLogin(page, uniqueEmail('e2e_auth'), 'E2E Auth User');

    expect(page.url()).toContain('/index.html');
    expect(errors, `Unexpected console/page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('login with wrong password shows a real error, not a crash', async ({ page }) => {
    const email = uniqueEmail('e2e_wrongpw');
    await page.goto('/signup.html', { waitUntil: 'networkidle' });
    await page.fill('#name', 'Wrong PW User');
    await page.fill('#email', email);
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Password123');
    await page.check('#terms');
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/signup')),
      page.click('#submitBtn'),
    ]);
    await page.waitForURL('**/login.html');
    await page.waitForLoadState('networkidle');

    await page.fill('#email', email);
    await page.fill('#password', 'WrongPassword1');
    await page.click('button[type="submit"]');

    // Wrong password surfaces as an inline field error, not a generic crash/toast
    await expect(page.locator('#passwordError')).toContainText(/invalid/i, { timeout: 15000 });
    expect(page.url()).toContain('/login.html');
  });

  test('forgot-password flow advances to step 2 for an unknown email without crashing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/forgot-password.html', { waitUntil: 'networkidle' });
    await page.fill('#email', uniqueEmail('e2e_forgot'));
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/forgot-password')),
      page.click('#emailBtn'),
    ]);
    await expect(page.locator('#step2')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
