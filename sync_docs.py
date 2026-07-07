import re
import glob

docs_dir = "/Users/rajakumar/.gemini/antigravity-ide/brain/36fd7cf6-2f05-4356-b09f-f4e2763da29b/"

replacements = [
    # Frontend.md
    ("a Single Page Application (SPA).", "a Single Page Application (SPA) driven by modular Javascript."),
    ("State is managed via global JavaScript variables within `index.html`", "State is managed via Javascript modules and global variables"),
    ("### Analysis of `index.html` (The Monolith)", "### Analysis of `index.html` (Shell)"),
    ("`index.html` is exceptionally large (>6000 lines). It contains:", "`index.html` serves as the layout shell (~900 lines). Its logic has been extracted into `js/quiz/`, `js/features/`, and `js/analytics/`."),
    ("The codebase desperately needs modularization. The 6000+ line `index.html` should be split into distinct JS modules", "The codebase has been successfully modularized. Logic now resides in dedicated JS modules."),
    
    # walkthrough.md
    ("The frontend is a monolithic SPA implemented in `index.html`", "The frontend is a modular SPA (shell in `index.html` and logic in `js/`)."),
    ("I highly recommend reviewing the `ContributionGuide.md` for steps on modularizing `index.html`.", "The frontend has been modularized."),
    
    # DeveloperGuide.md
    ("The DOM manipulation approach in `index.html` is extremely fast as it avoids Virtual DOM reconciliation overhead, but it becomes a maintenance nightmare.", "The DOM manipulation approach uses a modular Facade pattern, which remains fast while separating business features from core orchestration."),
    
    # ContributionGuide.md
    ("The monolithic `index.html` (6000+ lines) violates all principles", "The frontend previously suffered from monolithic architecture but is now modularized."),
    ("Break `index.html` into `api.js`, `ui.js`, `utils.js`, etc. Extract CSS into external stylesheets.", "Maintain the modular boundaries established in `js/features/`, `js/quiz/`, and `js/analytics/`."),
    
    # Setup_Deployment.md
    ("Ensure the `API_BASE_URL` in `index.html`, `login.html`, `signup.html`, etc., matches", "Ensure the backend port matches (the frontend determines API_BASE_URL automatically via `js/config.js`)."),
    
    # RiskRegister.md
    ("Monolithic `index.html` relies on manual DOM manipulation, increasing regression risk for any UI update. | High | High | Critical | UX/Frontend Lead | Modularize HTML, extract CSS/JS into dedicated files. | Open |", "Monolithic `index.html` has been refactored into modules, though DOM rendering is still coupled to business logic (T-10). | Medium | Low | Moderate | Engineering | Introduce state management layer. | Open |")
]

for filename in glob.glob(docs_dir + "*.md"):
    with open(filename, 'r') as f:
        content = f.read()
    
    modified = False
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            modified = True
            
    if modified:
        with open(filename, 'w') as f:
            f.write(content)
        print(f"Updated {filename}")

