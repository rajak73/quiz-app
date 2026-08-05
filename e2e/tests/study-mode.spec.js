const { test, expect } = require('@playwright/test');
const { signupAndLogin, uniqueEmail } = require('./helpers');

test.describe('Study / Compete mode switcher', () => {
  test('defaults to Study mode, switches to Compete, persists across reload', async ({ page }) => {
    await signupAndLogin(page, uniqueEmail('e2e_mode'), 'Mode Tester');

    await expect(page.locator('#study-mode-section')).toBeVisible();
    await expect(page.locator('#compete-mode-section')).toBeHidden();

    await page.click('#mode-tab-compete');
    await expect(page.locator('#compete-mode-section')).toBeVisible();
    await expect(page.locator('#study-mode-section')).toBeHidden();

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#compete-mode-section')).toBeVisible();

    await page.click('#mode-tab-study');
    await expect(page.locator('#study-mode-section')).toBeVisible();
    await expect(page.locator('#compete-mode-section')).toBeHidden();
  });

  test('adding and selecting a subject reveals the study dashboard', async ({ page }) => {
    await signupAndLogin(page, uniqueEmail('e2e_subject'), 'Subject Tester');

    page.once('dialog', d => d.accept('E2E Subject'));
    await page.click('.subject-btn.add-new');
    await page.waitForTimeout(300);

    await expect(page.locator('#study-content-area')).toBeHidden();

    await page.click('.subject-btn[data-subject="E2E Subject"]');
    await expect(page.locator('#study-content-area')).toBeVisible();
  });
});
