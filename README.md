# Quiz App

A full-stack quiz web app with two distinct modes:

- **📖 Study Mode** — a personal, offline-first self-study tool. Everything lives in the
  browser's `localStorage`: subjects, question libraries, file uploads, spaced-repetition
  ("Read & Remember"), AI-assisted explanations/translation, and quiz history. No account data
  ever leaves the browser for this mode.
- **🏆 Compete Mode** — a real multiplayer quiz system backed by the API + database: create
  personal/groupwise/public tests, join by secret code, take a timed quiz with a live countdown,
  see a ranked leaderboard, and (as the creator) view per-question analytics and manage your
  tests (edit/end/delete).

Users switch between the two with a tab at the top of the home page; the choice is remembered
per browser.

## Project structure

```
backend/     Node.js + Express + MongoDB API (auth, tests, question bank)
frontend/    Static HTML/CSS/vanilla JS — no build step, no framework
e2e/         Playwright end-to-end tests that drive the real app in a browser
```

- Backend: `backend/README`-worthy bits — MVC-ish layout (`models/`, `controllers/`,
  `routes/`, `middleware/`, `utils/`), JWT auth via httpOnly cookies, `helmet` + rate limiting +
  `express-mongo-sanitize` for baseline security, Jest + Supertest + `mongodb-memory-server` for
  integration tests (`backend/tests/integration/`).
- Frontend: no bundler — plain `<script>` tags. `frontend/js/quiz/quizEngine.js` (Study Mode +
  Compete Mode UI logic) must load *after* `frontend/js/features/{history,library,search}.js`
  and `frontend/js/analytics/results.js`, since it references functions those files define.
  `frontend/js/api/*.js` are ES modules (`apiClient.js`, `authApi.js`, `testApi.js`) that wrap
  backend calls.

## Running locally

You need: Node.js, a local MongoDB (or an Atlas connection string), and Python 3 (just for a
throwaway static file server — nothing else uses it).

1. **Backend**
   ```bash
   cd backend
   cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, FRONTEND_URL, etc.
   npm install
   npm run dev             # or: node server.js
   ```
   Runs on `http://localhost:5001` by default (see `PORT` in `.env`).

2. **Frontend** (separate terminal)
   ```bash
   cd frontend
   python3 -m http.server 5500
   ```
   Open `http://localhost:5500/login.html`. `frontend/js/config.js` auto-points API calls at
   `localhost:5001` when the page itself is served from `localhost`.

   Port 5500 isn't arbitrary — it's one of the origins already allowed in `backend/server.js`'s
   CORS list alongside `localhost:3000`/`5000`. Serving from a different port will hit CORS
   errors unless you add it there too.

## Testing

- **Backend integration tests**: `cd backend && npm test` (uses an in-memory MongoDB, no setup
  needed). Runs in CI on every push/PR via `.github/workflows/ci.yml`.
- **End-to-end tests**: `cd e2e && npm install && npx playwright install chromium && npm test`
  — drives signup/login, the Study/Compete mode switcher, and the full Compete-mode lifecycle
  in a real Chromium browser against your local backend + MongoDB. See `e2e/README.md`.

## Deploying

See `DEPLOYMENT_GUIDE.md`. Short version: backend → Render (`render.yaml`, root dir `backend`),
frontend → Netlify (`netlify.toml`, publishes `frontend/` as a static site).

## Known limitations

- Email verification and password-reset emails require `EMAIL_USER`/`EMAIL_PASS` (Gmail SMTP)
  to be set in `backend/.env` — without them, signup works but skips verification, and
  forgot-password emails will fail to send.
- The Compete-mode quiz-taking UI is functional but intentionally minimal (no rich media,
  question types are single-choice only).
