# Project Handoff Report for AI Agents

> [!IMPORTANT]
> **ATTENTION NEW AGENT:** Read this document completely before modifying the codebase. This contains the definitive current state of the `quiz-app` repository, architectural rules, and your immediate objectives.

## 1. Project Overview
This project is a web-based **Quiz Application** where users can create, share, and take quizzes.
- **Backend**: Node.js, Express, MongoDB (Mongoose).
- **Frontend**: Vanilla HTML, CSS, JavaScript (modular architecture).
- **Authentication**: JWT-based (stored in HTTP-only cookies).
- **Testing**: Jest paired with `mongodb-memory-server` for perfectly isolated integration testing.

## 2. Current State of the Codebase
The codebase recently completed **Sprint 1 (Architecture & Security)** and is currently midway through **Sprint 2 (Product Stability & Feature Delivery)**.
- **Backend Architecture is STABLE**: Do NOT perform large architectural refactors unless explicitly instructed. Models, Controllers, and Routes are clearly separated.
- **Frontend is MODULAR**: The frontend scripts reside in `frontend/js/`. API calls use a wrapper `apiClient.js`. 
- **Security is REMEDIATED**: Endpoints are protected via `authMiddleware.js`. Database ownership validation (checking `req.user._id === creator._id`) is required for mutating endpoints.
- **CI/CD is ACTIVE**: A GitHub Actions workflow (`.github/workflows/ci.yml`) runs backend integration tests on push.

## 3. What Has Been Completed Recently
The following engineering tasks (Sprint 2) have been fully completed and tested:
- **T-04 / T-11: Backend Integration Tests**: Created a robust integration testing foundation. Tests are located in `backend/tests/integration/`. We use `beforeEach` to reset data and ensure independent, deterministic tests without polluting a production database.
- **T-12: Continuous Integration**: Configured automated testing on GitHub.
- **T-13: Quiz Duplication Feature**: Implemented `POST /api/tests/:id/duplicate`. Allows creators to duplicate a quiz (cloning `title`, `questions`, etc., but explicitly resetting `participants`, `secretCode`, and `status`). A "Duplicate" button is available in the frontend creator dashboard (`frontend/js/quiz/quizEngine.js`).

## 4. Engineering Guidelines for New Agents
> [!WARNING]
> Follow these rules strictly when executing new tasks.

1. **Write Integration Tests**: Every new feature or endpoint MUST include integration tests in `backend/tests/integration/`. Your tests must run in isolation and pass locally via `npm test` inside the `backend` directory.
2. **Reuse Existing Patterns**: Reuse existing models, API wrappers (`apiClient.js`), and frontend UI elements (e.g., standard modal dialogs and buttons). Do not introduce new libraries or rewrite core structures speculatively.
3. **Security First**: When fetching or modifying data, always enforce authorization (e.g., `test.creator.toString() === req.user._id.toString()`).

## 5. Your Objective: What Needs to be Done Next
The user is focusing on delivering high-value product features. You are to proceed with the remaining tasks in Sprint 2:

### Immediate Task: T-14 — Auto-save Drafts
- **Goal**: Allow quiz creators to safely auto-save quiz creations/edits before finalizing them, preventing data loss.
- **Requirements**:
  - Implement logic to save a quiz with `status: 'draft'`.
  - Frontend should trigger a save operation periodically or on field blurs during quiz creation.

### Upcoming Task: T-15 — Question Bank
- **Goal**: Allow creators to save individual questions to a "bank" and reuse them across different quizzes.
- **Requirements**:
  - Potentially requires a new `QuestionBank` model or a mechanism to search existing questions.
  - New endpoints for fetching/saving questions to the bank.

---
**Agent Execution Note**: Begin by clarifying with the user if they would like to proceed with T-14 (Auto-save Drafts) or T-15 (Question Bank). Once confirmed, research the relevant files (like `quizEngine.js` and `testController.js`) and draft an `implementation_plan.md` before execution.
