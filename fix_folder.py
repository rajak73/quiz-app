with open('/Users/rajakumar/.gemini/antigravity-ide/brain/36fd7cf6-2f05-4356-b09f-f4e2763da29b/FolderStructure.md', 'r') as f:
    content = f.read()

bad_string = """- `server.├── js/
│   ├── api/
│   │   ├── apiClient.js
│   │   ├── authApi.js
│   │   └── testApi.js
│   ├── features/
│   │   ├── history.js
│   │   ├── library.js
│   │   └── search.js
│   ├── analytics/
│   │   └── results.js
│   ├── quiz/
│   │   └── quizEngine.js
│   ├── auth.js
│   ├── ui.js
│   ├── user.js
│   └── config.js/db.js`: Contains the MongoDB connection string logic using `mongoose.connect`."""

good_string = """- `server.js`: The main entry point. Sets up Express, CORS, rate limiting, parses cookies/JSON, and mounts routers.
- `config/db.js`: Contains the MongoDB connection string logic using `mongoose.connect`."""

content = content.replace(bad_string, good_string)

frontend_section = """### Frontend Directory (`/frontend`)

**Purpose**: Houses the client-side HTML, CSS, and JS.

- `js/`: Modularized Javascript source code.
  - `api/`: Centralized API clients (`apiClient.js`, `authApi.js`, `testApi.js`).
  - `features/`: Extracted feature modules (`history.js`, `library.js`, `search.js`).
  - `analytics/`: Chart and results modules (`results.js`).
  - `quiz/`: Quiz engine orchestration (`quizEngine.js`).
  - Core scripts (`config.js`, `ui.js`, `user.js`, `auth.js`).
- `index.html`: The core Single Page Application HTML shell.
- `login.html`, `signup.html`, etc: Auth flow views.
- `css/`: Stylesheets."""

# Replace the old Frontend Directory section
import re
content = re.sub(r'### Frontend Directory \(\`/frontend\`\).*?(?=\*\*Duplicate Logic\*\*)', frontend_section + '\n\n', content, flags=re.DOTALL)

with open('/Users/rajakumar/.gemini/antigravity-ide/brain/36fd7cf6-2f05-4356-b09f-f4e2763da29b/FolderStructure.md', 'w') as f:
    f.write(content)

