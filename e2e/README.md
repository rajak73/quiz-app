# End-to-end tests

Playwright tests that drive the real app in a real browser against the real backend + MongoDB
(not mocks). They cover: signup/login/forgot-password, the Study/Compete mode switcher, and the
full Compete-mode lifecycle (create → join → answer → submit → leaderboard → creator analytics →
edit/end/delete).

## Setup (one-time)

```bash
cd e2e
npm install
npx playwright install chromium
```

Make sure `backend/.env` is filled in (see `backend/.env.example`) and a local MongoDB is
reachable at the `MONGODB_URI` you set there.

## Run

```bash
cd e2e
npm test
```

This automatically starts the backend (`node server.js`) on port 5001 and serves `frontend/` as
a static site on port 5500 (matching the CORS allowlist in `backend/server.js`), unless those
are already running — in which case it reuses them.

## Notes

- Tests run sequentially (`workers: 1`) because they share one backend + database.
- On a slow machine, individual tests may occasionally time out under sustained load (bcrypt
  hashing + MongoDB are CPU-heavy); re-running a failed test in isolation is a good first check
  before assuming it's a real bug.
