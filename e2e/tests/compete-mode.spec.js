const { test, expect } = require('@playwright/test');
const { signupAndLogin, uniqueEmail } = require('./helpers');

// These console messages are expected noise (Google Sign-In rejects localhost as an
// unauthorized origin in local dev) and are not app bugs.
const IGNORED_CONSOLE_SNIPPETS = ['GSI_LOGGER', 'status of 403', 'status of 404'];

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !IGNORED_CONSOLE_SNIPPETS.some(s => m.text().includes(s))) {
      errors.push(m.text());
    }
  });
  return errors;
}

test.describe('Compete mode: public test create -> join -> answer -> results -> analytics', () => {
  test('full lifecycle with no console/page errors', async ({ browser }) => {
    // Two independent signups + a full quiz-taking flow in one test; give it more room
    // than the suite default, especially on slower/CI machines.
    test.setTimeout(120000);

    const creatorCtx = await browser.newContext();
    const joinerCtx = await browser.newContext();
    const creator = await creatorCtx.newPage();
    const joiner = await joinerCtx.newPage();
    const creatorErrors = trackErrors(creator);
    const joinerErrors = trackErrors(joiner);

    // Run both signups concurrently to save wall time.
    await Promise.all([
      signupAndLogin(creator, uniqueEmail('e2e_creator'), 'E2E Creator'),
      signupAndLogin(joiner, uniqueEmail('e2e_joiner'), 'E2E Joiner'),
    ]);

    // Create a 2-question public test directly via the API wrapper (modal question-builder
    // UI is covered by manual/exploratory testing, not this spec).
    const createResult = await creator.evaluate(() => window.testApi.createTest({
      title: 'E2E Public Quiz',
      type: 'public',
      subject: 'General',
      duration: 30,
      questions: [
        { question: '2+2?', options: ['3', '4', '5'], correctAnswer: 1 },
        { question: 'Capital of France?', options: ['Berlin', 'Madrid', 'Paris'], correctAnswer: 2 },
      ],
    }));
    expect(createResult.success).toBe(true);
    const testId = createResult.test.id;

    // Joiner joins via the real UI function (exercises the join-fix)
    await joiner.evaluate(id => window.joinPublicTest(id), testId);
    await expect(joiner.locator('#test-detail-modal')).toHaveClass(/active/);
    await joiner.evaluate(() => window.closeModal('test-detail-modal'));

    // Creator starts the test
    const startResult = await creator.evaluate(id => window.testApi.startTest(id), testId);
    expect(startResult.success).toBe(true);

    // Joiner opens details and sees the Answer Questions action
    await joiner.evaluate(id => window.viewTestDetails(id), testId);
    const answerBtn = joiner.locator('#test-detail-content button:has-text("Answer Questions")');
    await expect(answerBtn).toHaveCount(1);
    await answerBtn.click();

    await expect(joiner.locator('#compete-quiz-modal')).toHaveClass(/active/);

    // Answer both questions correctly and submit
    await joiner.locator('#compete-quiz-content .compete-options-list button').nth(1).click(); // "4"
    await joiner.click('#compete-quiz-next-btn');
    await joiner.locator('#compete-quiz-content .compete-options-list button').nth(2).click(); // "Paris"

    joiner.once('dialog', d => d.accept());
    await joiner.click('#compete-quiz-submit-btn');

    await expect(joiner.locator('#compete-results-modal')).toHaveClass(/active/);
    await expect(joiner.locator('#compete-results-content')).toContainText('2/2');
    await expect(joiner.locator('#compete-results-content')).toContainText('Your Rank: #1');

    // Creator views analytics
    await creator.evaluate(id => window.showTestAnalytics(id), testId);
    await expect(creator.locator('#compete-analytics-modal')).toHaveClass(/active/);
    await expect(creator.locator('#compete-analytics-content')).toContainText('100% (1/1)'); // Q1 all correct

    // Joiner is forbidden from viewing analytics (creator-only)
    const forbidden = await joiner.evaluate(id => window.testApi.getTestAnalytics(id), testId);
    expect(forbidden.success).toBe(false);

    expect(creatorErrors, creatorErrors.join(' | ')).toEqual([]);
    expect(joinerErrors, joinerErrors.join(' | ')).toEqual([]);

    await creatorCtx.close();
    await joinerCtx.close();
  });
});

test.describe('Compete mode: groupwise join-by-code', () => {
  test('wrong code is rejected, correct code joins', async ({ page }) => {
    await signupAndLogin(page, uniqueEmail('e2e_code_creator'), 'Code Creator');
    const created = await page.evaluate(() => window.testApi.createTest({
      title: 'E2E Secret Code Quiz',
      type: 'groupwise',
      subject: 'General',
      duration: 30,
      maxParticipants: 5,
      questions: [{ question: 'Q?', options: ['A', 'B'], correctAnswer: 0 }],
    }));
    const code = created.test.secretCode;
    expect(code).toBeTruthy();

    const badLookup = await page.evaluate(() => window.testApi.findTestByCode('ZZZZZZ'));
    expect(badLookup.success).toBe(false);

    const goodLookup = await page.evaluate(c => window.testApi.findTestByCode(c), code);
    expect(goodLookup.success).toBe(true);
    expect(goodLookup.testId).toBe(created.test.id);
  });
});

test.describe('Compete mode: creator test management', () => {
  test('edit, end, and delete all work', async ({ page }) => {
    await signupAndLogin(page, uniqueEmail('e2e_manager'), 'E2E Manager');

    // editWaitingTestUI/endTestUI/deleteTestUI all use native prompt()/confirm() dialogs;
    // accept every dialog for the rest of this test, overriding the title prompt's value.
    page.on('dialog', d => d.accept(d.message().startsWith('Title') ? 'Renamed' : undefined));

    // Edit a waiting test
    const t1 = await page.evaluate(() => window.testApi.createTest({
      title: 'Editable', type: 'personal', subject: 'General', duration: 20,
      questions: [{ question: 'Q?', options: ['A', 'B'], correctAnswer: 0 }],
    }));
    await page.evaluate(id => window.editWaitingTestUI(id), t1.test.id);
    await page.waitForTimeout(500);
    const t1After = await page.evaluate(id => window.testApi.getTestDetails(id), t1.test.id);
    expect(t1After.test.title).toBe('Renamed');

    // End an active test
    const t2 = await page.evaluate(() => window.testApi.createTest({
      title: 'End Me', type: 'personal', subject: 'General', duration: 30,
      questions: [{ question: 'Q?', options: ['A', 'B'], correctAnswer: 0 }],
    }));
    await page.evaluate(id => window.testApi.startTest(id), t2.test.id);
    await page.evaluate(id => window.endTestUI(id), t2.test.id);
    await page.waitForTimeout(300);
    const t2After = await page.evaluate(id => window.testApi.getTestDetails(id), t2.test.id);
    expect(t2After.test.status).toBe('completed');

    // Delete a test
    const t3 = await page.evaluate(() => window.testApi.createTest({
      title: 'Delete Me', type: 'personal', subject: 'General', duration: 10,
      questions: [{ question: 'Q?', options: ['A', 'B'], correctAnswer: 0 }],
    }));
    await page.evaluate(id => window.deleteTestUI(id), t3.test.id);
    await page.waitForTimeout(300);
    const t3After = await page.evaluate(id => window.testApi.getTestDetails(id), t3.test.id);
    expect(t3After.success).toBe(false);
  });
});
