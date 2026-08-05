# Project Handoff Report for AI Agents

> [!IMPORTANT]
> **ATTENTION NEW AGENT:** Read this document completely before modifying the codebase. This
> contains the current state of the `quiz-app` repository as of the last major session. See also
> `README.md` for a user-facing overview and `e2e/README.md` for the end-to-end test suite.

## 1. Project Overview

A web-based **Quiz Application** with two distinct modes users switch between via a tab in the
top bar (persisted in `localStorage.homeMode`):

- **Study Mode**: personal, `localStorage`-only self-study tool (subjects, question library,
  spaced revision, AI explain/translate, quiz history). Owned by `frontend/js/quiz/quizEngine.js`
  + `frontend/js/features/{history,library,search}.js` + `frontend/js/analytics/results.js`.
- **Compete Mode**: real multiplayer quiz system backed by MongoDB (`Test` model). Create
  personal/groupwise/public tests, join by secret code, take a timed quiz, see a ranked
  leaderboard, and (creator-only) view per-question analytics and edit/end/delete tests.

- **Backend**: Node.js, Express, MongoDB (Mongoose).
- **Frontend**: Vanilla HTML/CSS/JS, no bundler, no framework. `frontend/js/api/*.js` are ES
  modules; everything else (`quizEngine.js`, `history.js`, `library.js`, `search.js`,
  `results.js`) are classic scripts that rely on script *load order* in `index.html` — see §4.
- **Authentication**: JWT in an httpOnly cookie (`sendTokenResponse` in
  `backend/utils/sendTokenResponse.js`, shared by password login/signup and Google login).
- **Testing**: `backend/tests/integration/` (Jest + Supertest + `mongodb-memory-server`) and
  `e2e/tests/` (Playwright, drives the real app in a real browser against a real backend + DB).

## 2. Current State

The codebase went through a full audit-and-fix pass covering: security/auth bugs, a
script-load-order bug that silently broke ~150 global function bindings in `quizEngine.js`, the
Study/Compete mode split, and building out the entire Compete-mode feature surface (it previously
had only test creation/listing — no actual quiz-taking, results, or analytics UI existed).
Everything below is implemented, wired to the backend, and verified end-to-end (both Playwright
and the `e2e/` suite):

- Auth: signup/login/Google login/forgot-password/reset-password. Email verification is
  currently a no-op (accounts are auto-verified) since no SMTP credentials are configured by
  default — see `backend/utils/sendEmail.js` and the "Known gaps" section below.
- Compete mode: create (personal/groupwise/public), list (paginated), join (by button or secret
  code via `POST /tests/find-by-code`), start, timed quiz-taking with a question palette +
  progress bar (`startCompeteQuiz` in `quizEngine.js`), submit (server blocks re-submission and
  enforces expiry), ranked leaderboard (`showCompeteResults`), creator analytics
  (`showTestAnalytics`, `GET /tests/:id/analytics`), and creator management (edit/end/delete).
- Study mode: unaffected by any of the above — same localStorage-based flow as before, just now
  cleanly separated behind its own tab instead of being interleaved with Compete markup in
  `#home-page`.

## 3. Critical gotchas for new agents

> [!WARNING]
> These aren't obvious from reading a single file — read this before touching related code.

1. **Script load order in `index.html` matters.** `quizEngine.js` must load *after*
   `history.js`, `library.js`, `search.js`, and `results.js` — it references top-level functions
   those files define (e.g. `saveSubjects`, `showTestHistory`). Its own end-of-file "facade
   bindings" (`if (typeof x !== 'undefined') window.x = x;`) are deliberately guarded so one
   missing/nested function doesn't halt every binding after it — don't remove that guard pattern
   when adding new bindings.
2. **`apiClient.js`'s `apiCall()` returns the already-parsed JSON body, not a raw fetch
   `Response`.** Check `!data.success`, never `!response.ok` / `response.status` — several pages
   had this exact bug (login/signup/forgot-password) before it was fixed. If you see
   `response.ok` anywhere touching an `authApi`/`testApi` call, it's a bug.
3. **Always call backend test endpoints through `window.testApi`** (`frontend/js/api/testApi.js`),
   not a bare `apiCall(...)` — a bare call is a `ReferenceError` in a classic script (`apiCall` is
   only exposed as `window.apiClient.apiCall`, not `window.apiCall`). This broke join/start/
   resume-draft/view-details for a long time before being fixed.
4. **Backend `updateTest` intentionally cannot change `questions`** once a test leaves draft
   status — only `title`/`description`/`subject`/`duration`/`maxParticipants`. The frontend's
   `editWaitingTestUI` reflects this constraint (lightweight prompts, not the full question
   editor). Don't wire the full create-test-modal to `updateTest` expecting it to save question
   edits — it won't.
5. **Ownership checks, not `authorize()`.** `backend/middleware/authMiddleware.js`'s `authorize()`
   is role-based (`req.user.role`) and unused in `routes/test.js`. Creator-only endpoints
   (`endTest`, `updateTest`, `deleteTest`, `getTestAnalytics`) all use an inline
   `test.creator.toString() !== req.user._id.toString()` check instead — follow that pattern for
   new creator-only routes.

## 4. Known gaps / good next tasks

- No email is actually sent (signup auto-verifies; forgot-password will fail without
  `EMAIL_USER`/`EMAIL_PASS` in `backend/.env`).
- No admin role / admin panel exists (the `role` field on `User` is unused beyond being present
  in the schema).
- `backend/tests/integration/googleAuth.test.js` has 2 pre-existing failing tests unrelated to
  any of the above work (a Jest mock issue with `google-auth-library`, not a real app bug).
- This dev sandbox's MongoDB/bcrypt performance is occasionally slow enough to cause test
  timeouts under sustained sequential load (both Jest and Playwright) — if a test times out,
  re-run it in isolation before assuming it's a real regression.
