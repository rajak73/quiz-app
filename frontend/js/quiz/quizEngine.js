
    
        
        // Helper: Debounce function
        function debounce(func, delay) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), delay);
            };
        }

        // --- Global Variables ---
        let allQuestionsData = [];
        let currentQuiz = {};
        let autoNextTimer = null; // Ye line add karein
        let touchStartX = 0;
        let currentOptionFocusIndex = -1;
        let longPressTimer;
        let rrLongPressTimer;

        let isHistorySelectionMode = false;
        let selectedHistoryIndices = new Set();
        
        let activeLibraryConfig = null;
        let libraryTouchStartX = 0;
        let reviewChart = null;
        let activeSubject = null;
        
        // Settings Variables
        let wakeLockSentinel = null;
        let gFabIdleTimer = null;
        const G_FAB_IDLE_TIMEOUT = 3000; // 3 seconds to dim
        
        const MAX_SAVED_FILES = 5;

        // Quotes
        const positiveQuotes = [
            "Excellent! Your hard work is paying off.", "Great job! Keep it up.", "Outstanding performance!",
            "Amazing! You are shining.", "Impressive dedication.", "Maintain this momentum.",
            "Excellent score. Be proud!", "Success is near!"
        ];
        const motivationalQuotes = [
            "Don't give up. Try again!", "Effort matters more than results.", "Failure is a stepping stone.",
            "Identify weak points and improve.", "Bounce back stronger.", "Refuse to give up.",
            "Mistakes are proof you are trying.", "Keep learning.", "Success will be yours.", "Believe in yourself."
        ];
        
        // Elements References
        const pages = {
            home: document.getElementById('home-page'),
            readRemember: document.getElementById('read-remember-page'),
            quiz: document.getElementById('quiz-page'),
        };
        const popups = {
    upload: document.getElementById('upload-popup'),
    viewSheets: document.getElementById('view-sheets-popup'),
    goToTest: document.getElementById('go-to-test-popup'),
    quizSummary: document.getElementById('quiz-summary-popup'),
    testReview: document.getElementById('test-review-popup'),
    testHistory: document.getElementById('test-history-popup'),
    filteredQuestions: document.getElementById('filtered-questions-popup'),
    simple: document.getElementById('simple-popup'),
    customTestSetup: document.getElementById('custom-test-setup-popup'),
    resumeQuiz: document.getElementById('resume-quiz-popup'),
    pauseExit: document.getElementById('pause-exit-popup'),
    settings: document.getElementById('settings-popup'),
    library: document.getElementById('library-popup'),
    help: document.getElementById('help-popup'),
    quote: document.getElementById('quote-popup'),
    note: document.getElementById('note-popup'),
    universalSearch: document.getElementById('universal-search-popup'),
    smartRevision: document.getElementById('smart-revision-popup'),
    startTestOptions: document.getElementById('start-test-options-popup'),
    aiResult: document.getElementById('ai-result-popup') // <--- YE LINE ADD KARNI HAI
};
        // --- REQUIREMENT 1: Storage Optimization Helper Functions ---
        // Save only { s: SheetName, i: Index }
        function createReferences(questions) {
            if (!allQuestionsData || allQuestionsData.length === 0) return [];
            return questions.map(q => {
                // Find the sheet and index in main memory
                const sheet = allQuestionsData.find(s => s.sheetName === q.sheetName);
                if (sheet) {
                    const idx = sheet.questions.findIndex(sq => sq.question === q.question);
                    if (idx > -1) return { s: q.sheetName, i: idx };
                }
                return null;
            }).filter(ref => ref !== null);
        }

        // Restore full objects from { s, i }
        function resolveReferences(refs) {
            if (!allQuestionsData || allQuestionsData.length === 0) return [];
            return refs.map(ref => {
                const sheet = allQuestionsData.find(s => s.sheetName === ref.s);
                if (sheet && sheet.questions[ref.i]) {
                    // Return a copy of the question with sheetName attached
                    return { ...sheet.questions[ref.i], sheetName: sheet.sheetName };
                }
                return null;
            }).filter(q => q !== null);
        }

        // Library Configurations (Updated for Optimization)
        const listConfigurations = {
            savedTest: {
                type: 'savedTest',
                getQuestions: () => {
                    const refs = JSON.parse(localStorage.getItem(`savedQuestionsBank_${activeSubject}`) || '[]');
                    return resolveReferences(refs);
                },
                saveQuestions: (questions) => {
                    const refs = createReferences(questions);
                    localStorage.setItem(`savedQuestionsBank_${activeSubject}`, JSON.stringify(refs));
                },
                dataAttribute: 'savedQIndex',
                selectionState: { isSelectionMode: false, selectedIndices: new Set() },
                popupTitle: 'Saved Questions (from Test)',
                emptyMessage: 'No questions saved from tests yet.'
            },
            savedRR: {
                type: 'savedRR',
                getQuestions: () => {
                    const refs = JSON.parse(localStorage.getItem(`savedRRQuestions_${activeSubject}`) || '[]');
                    return resolveReferences(refs);
                },
                saveQuestions: (questions) => {
                    const refs = createReferences(questions);
                    localStorage.setItem(`savedRRQuestions_${activeSubject}`, JSON.stringify(refs));
                },
                dataAttribute: 'savedRrQIndex',
                selectionState: { isSelectionMode: false, selectedIndices: new Set() },
                popupTitle: 'Saved Questions (from Q&R)',
                emptyMessage: 'No questions saved from Quick Revision yet.'
            },
            error: {
                type: 'error',
                getQuestions: () => {
                    const refs = JSON.parse(localStorage.getItem(`errorQuestions_${activeSubject}`) || '[]');
                    return resolveReferences(refs);
                },
                saveQuestions: (questions) => {
                    const refs = createReferences(questions);
                    localStorage.setItem(`errorQuestions_${activeSubject}`, JSON.stringify(refs));
                },
                dataAttribute: 'errorQIndex',
                selectionState: { isSelectionMode: false, selectedIndices: new Set() },
                popupTitle: 'Error/Wrong Questions',
                emptyMessage: 'No error questions marked yet.'
            },
            withNotes: {
                type: 'withNotes',
                getQuestions: () => {
                    if (!activeSubject) return [];
                    // Notes are stored in allQuestionsData directly in memory, plus handNotes
                    // We just scan allQuestionsData for any question with a 'note' property
                    const noteQuestions = [];
                    if(allQuestionsData) {
                        allQuestionsData.forEach(sheet => {
                            sheet.questions.forEach(q => {
                                if(q.note) noteQuestions.push({ ...q, sheetName: sheet.sheetName });
                            });
                        });
                    }
                    const handNotes = JSON.parse(localStorage.getItem(`handNotes_${activeSubject}`) || '[]');
                    return [...noteQuestions, ...handNotes];
                },
                saveQuestions: null, // Notes are managed via updateNoteInAllSources
                dataAttribute: 'withNotesIndex',
                selectionState: { isSelectionMode: false, selectedIndices: new Set() },
                popupTitle: 'Notes',
                emptyMessage: 'No notes found.'
            }
        };

        // --- HELPER FUNCTIONS (Fuzzy Search & Markers) ---

        // 1. Visual Markers (Pink Star & Cross)
                // 1. New Helper: Manage Wrong History Separately
        function manageWrongHistory(question, isAdding) {
            const key = `myWrongHistory_${activeSubject}`;
            let list = JSON.parse(localStorage.getItem(key) || '[]');
            
            if (isAdding) {
                if (!list.some(q => q.question === question.question)) {
                    list.push({ 
                        question: question.question, 
                        sheetName: question.sheetName,
                        correctAnswer: question.correctAnswer, 
                        incorrectAnswers: question.incorrectAnswers,
                        explanation: question.explanation,
                        type: 'wrong' 
                    });
                }
            } else {
                list = list.filter(q => q.question !== question.question);
            }
            localStorage.setItem(key, JSON.stringify(list));
        }

        // 2. Updated Markers (Star, Cross, Warning)
        function getVisualMarkers(questionText) {
            if (!questionText) return '';
            let markers = '';
            
            // Saved (Star)
            const savedTest = listConfigurations.savedTest.getQuestions();
            const savedRR = listConfigurations.savedRR.getQuestions();
            if (savedTest.some(q => q.question === questionText) || savedRR.some(q => q.question === questionText)) {
                markers += '<span class="status-star" title="Saved">★</span>';
            }

            // Manual Error (Red Cross - ❌)
            const errors = listConfigurations.error.getQuestions();
            if (errors.some(q => q.question === questionText)) {
                markers += '<span class="status-error" title="Marked as Error Question">❌</span>';
            }

            // Previously Wrong (Warning - ⚠️)
            const wrongHistory = JSON.parse(localStorage.getItem(`myWrongHistory_${activeSubject}`) || '[]');
            if (wrongHistory.some(q => q.question === questionText)) {
                markers += '<span style="margin-left:5px; font-size:1.1em;" title="Previously Answered Wrong">⚠️</span>';
            }

            return markers;
        }

        // 2. Fuzzy Search Logic (Levenshtein Distance)
        function getLevenshteinDistance(a, b) {
            const matrix = [];
            for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
            for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) == a.charAt(j - 1)) { matrix[i][j] = matrix[i - 1][j - 1]; } 
                    else { matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)); }
                }
            }
            return matrix[b.length][a.length];
        }

        function isFuzzyMatch(text, searchTerm) {
            if (!text || !searchTerm) return false;
            const cleanText = text.toLowerCase();
            const cleanTerm = searchTerm.toLowerCase();
            
            // Direct match
            if (cleanText.includes(cleanTerm)) return true;
            
            // Too short for fuzzy
            if (cleanTerm.length < 3) return false;

            // Word by word fuzzy check
            const words = cleanText.split(/\s+/);
            for (let word of words) {
                if (word.length < 3) continue;
                const dist = getLevenshteinDistance(word, cleanTerm);
                const maxLength = Math.max(word.length, cleanTerm.length);
                const similarity = 1 - (dist / maxLength);
                if (similarity >= 0.7) return true; // 70% match
            }
            return false;
        }
        // --- ZOOM & LONG PRESS FUNCTIONS ---
        // --- FIXED ZOOM & LONG PRESS FUNCTIONS ---
        function adjustFontSize(change) {
            // Determine active page
            const isQuizActive = !pages.quiz.classList.contains('hidden');
            const isRRActive = !pages.readRemember.classList.contains('hidden');
            
            let varName = '--main-font-size';
            let storageKey = 'appFontSize';
            
            if (isQuizActive) {
                varName = '--quiz-font-size';
                storageKey = 'quizFontSize';
            } else if (isRRActive) {
                varName = '--rr-font-size';
                storageKey = 'rrFontSize';
            }

            // Get current value cleanly
            const rootStyle = getComputedStyle(document.documentElement);
            let currentValString = rootStyle.getPropertyValue(varName).trim();
            
            // Agar value empty ya invalid hai to default 1.0 maan lo
            if (!currentValString || currentValString === '') currentValString = '1rem';
            
            let currentSize = parseFloat(currentValString);
            if (isNaN(currentSize)) currentSize = 1.0;

            // Math fix: Round to 1 decimal place to avoid 0.7999999 issues
            let newSize = Math.round((currentSize + change) * 10) / 10;
            
            // Strict Limits (0.8 se 3.0 tak)
            if (newSize < 0.8) newSize = 0.8;
            if (newSize > 3.0) newSize = 3.0;

            // Apply
            document.documentElement.style.setProperty(varName, newSize + 'rem');
            localStorage.setItem(storageKey, newSize + 'rem');
        }

        function setupLongPressForFont(btnId, changeAmount) {
            const btn = document.getElementById(btnId);
            if(!btn) return;
            
            let pressTimer;
            let repeatInterval; 
            let isLongPress = false;

            // Handle Start (Touch or Mouse)
            const handleStart = (e) => {
                // Prevent default ghost clicks only on touch
                if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
                
                isLongPress = false;
                if(navigator.vibrate) navigator.vibrate(10);
                
                // Start Timer
                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    if(navigator.vibrate) navigator.vibrate(30); 
                    adjustFontSize(changeAmount);
                    repeatInterval = setInterval(() => adjustFontSize(changeAmount), 100);
                }, 400); 
            };

            // Handle End
            const handleEnd = (e) => {
                clearTimeout(pressTimer); 
                clearInterval(repeatInterval);
                
                // If simple tap/click (not long press)
                if (!isLongPress) {
                     // Zoom buttons ke liye manual action trigger karo
                     if (btn.classList.contains('rr-zoom-btn')) {
                         adjustFontSize(changeAmount);
                     } else {
                         // Quiz Nav buttons ke liye
                         if (btnId === 'next-q-btn') goToNextQuestion();
                         if (btnId === 'prev-q-btn') showQuestion(currentQuiz.currentQuestionIndex - 1);
                     }
                }
                isLongPress = false;
            };

            // Add Listeners (Passive: false needed to preventDefault)
            btn.addEventListener('touchstart', handleStart, {passive: false});
            btn.addEventListener('touchend', handleEnd);
            btn.addEventListener('mousedown', handleStart);
            btn.addEventListener('mouseup', handleEnd);
            btn.addEventListener('mouseleave', handleEnd);
        }

        // --- Initialization ---
        function initialize() {
            resetQuizState();
            loadSubjects(); 
            setupTheme(); 
            loadSettings(); 
            addEventListeners();
            setupHoverActions(); // Renamed from setupTranslationFeature for Req 2
            initializeControlCenter(); 
            updateGFabVisibility();
            // addStartOptionsListeners(); // Function not defined - commented out
            if (typeof loadUserProfile === 'function') loadUserProfile();
        }
        
        function setupTheme() {
            const floatingThemeToggle = document.getElementById('floating-theme-toggle');
            const savedTheme = localStorage.getItem('theme') || 'dark'; 
            document.body.classList.toggle('light-mode', savedTheme === 'light');
            
            floatingThemeToggle.addEventListener('click', () => {
                const isLight = document.body.classList.toggle('light-mode');
                localStorage.setItem('theme', isLight ? 'light' : 'dark');
            });
        }

        function loadSettings() {
            const savedFont = localStorage.getItem('appFontFamily') || '"Times New Roman", serif';
            const savedWeight = localStorage.getItem('appFontWeight') || 'normal';
            
            // Load Global, RR, and Quiz sizes independently
            const savedMainSize = localStorage.getItem('appFontSize') || '1rem';
            const savedRRSize = localStorage.getItem('rrFontSize') || '1rem';
            const savedQuizSize = localStorage.getItem('quizFontSize') || '1rem';

            document.documentElement.style.setProperty('--main-font', savedFont);
            document.documentElement.style.setProperty('--main-font-size', savedMainSize);
            document.documentElement.style.setProperty('--rr-font-size', savedRRSize);
            document.documentElement.style.setProperty('--quiz-font-size', savedQuizSize);
            document.documentElement.style.setProperty('--main-font-weight', savedWeight);
            
            document.getElementById('setting-font-family').value = savedFont;
            document.getElementById('setting-font-size').value = savedMainSize;
            document.getElementById('setting-bold-text').checked = savedWeight === 'bold';

            document.getElementById('setting-auto-save').checked = localStorage.getItem('autoSaveErrors') === 'true';
            document.getElementById('setting-vibration').checked = localStorage.getItem('vibrationEnabled') !== 'false'; 
            document.getElementById('setting-screen-wake').checked = localStorage.getItem('screenWakeLock') === 'true';
            
            document.getElementById('setting-copy-prefix').value = localStorage.getItem('copyPrefix') || '';
            document.getElementById('setting-copy-suffix').value = localStorage.getItem('copySuffix') || '';
        }

        function applySettingsListeners() {
            document.getElementById('setting-font-family').addEventListener('change', (e) => {
                const val = e.target.value;
                document.documentElement.style.setProperty('--main-font', val);
                localStorage.setItem('appFontFamily', val);
            });
            document.getElementById('setting-font-size').addEventListener('change', (e) => {
                const val = e.target.value;
                document.documentElement.style.setProperty('--main-font-size', val);
                localStorage.setItem('appFontSize', val);
            });
            document.getElementById('setting-bold-text').addEventListener('change', (e) => {
                const val = e.target.checked ? 'bold' : 'normal';
                document.documentElement.style.setProperty('--main-font-weight', val);
                localStorage.setItem('appFontWeight', val);
            });
            document.getElementById('setting-auto-save').addEventListener('change', (e) => localStorage.setItem('autoSaveErrors', e.target.checked));
            document.getElementById('setting-vibration').addEventListener('change', (e) => localStorage.setItem('vibrationEnabled', e.target.checked));
            document.getElementById('setting-screen-wake').addEventListener('change', (e) => {
                localStorage.setItem('screenWakeLock', e.target.checked);
                if(e.target.checked) requestWakeLock(); else releaseWakeLock();
            });
            
            // Req 2: Save Prefix/Suffix
            document.getElementById('setting-copy-prefix').addEventListener('input', (e) => localStorage.setItem('copyPrefix', e.target.value));
            document.getElementById('setting-copy-suffix').addEventListener('input', (e) => localStorage.setItem('copySuffix', e.target.value));

            document.getElementById('export-data-btn').addEventListener('click', exportAllData);
            document.getElementById('import-data-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
            document.getElementById('import-file-input').addEventListener('change', importAllData);
            document.getElementById('settings-popup-close-btn').addEventListener('click', () => showPopup('settings', false));
        }

       

       

        async function requestWakeLock() {
            if (!('wakeLock' in navigator)) return;
            try {
                if(document.getElementById('setting-screen-wake').checked && !wakeLockSentinel) {
                    wakeLockSentinel = await navigator.wakeLock.request('screen');
                    wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
                }
            } catch (err) { console.log(`${err.name}, ${err.message}`); }
        }

        function releaseWakeLock() {
            if (wakeLockSentinel) {
                wakeLockSentinel.release();
                wakeLockSentinel = null;
            }
        }
        
        document.addEventListener('visibilitychange', async () => {
            if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        });

        function triggerConfetti() {
            const canvas = document.getElementById('confetti-canvas');
            canvas.style.display = 'block'; 
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const pieces = [];
            const numberOfPieces = 200;
            const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
            
            for (let i = 0; i < numberOfPieces; i++) {
                pieces.push({
                    x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
                    rotation: Math.random() * 360, color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 10 + 5, speed: Math.random() * 5 + 2
                });
            }
            
            let animationId;
            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                pieces.forEach(p => {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180);
                    ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
                    p.y += p.speed; p.rotation += 2;
                    if (p.y > canvas.height) p.y = -10;
                });
                animationId = requestAnimationFrame(draw);
            }
            draw();
            setTimeout(() => { cancelAnimationFrame(animationId); ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }, 2000); 
        }

        function initializeControlCenter() {
            const fab = document.getElementById('g-control-center-fab');
            const menuOverlay = document.getElementById('g-menu-overlay');
            const closeMenuBtn = document.getElementById('g-menu-close-btn');
            
            if (!fab || !menuOverlay || !closeMenuBtn) {
                console.error('G-FAB elements not found');
                return;
            }

            let isMenuOpen = false;

            const openMenu = () => {
                if (isMenuOpen) return;
                isMenuOpen = true;
                menuOverlay.classList.remove('hidden');
                menuOverlay.style.display = 'flex';
                // Force reflow
                void menuOverlay.offsetWidth;
                menuOverlay.classList.add('visible');
                document.body.classList.add('menu-open');
                console.log('Menu opened');
            };

            const closeMenu = () => {
                if (!isMenuOpen) return;
                isMenuOpen = false;
                menuOverlay.classList.remove('visible');
                document.body.classList.remove('menu-open');
                setTimeout(() => { 
                    menuOverlay.classList.add('hidden'); 
                    menuOverlay.style.display = 'none';
                }, 300);
                console.log('Menu closed');
            };

            // Simple click handler - just open menu
            fab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('G-FAB clicked');
                openMenu();
            });
            
            // Also handle touch for mobile
            fab.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('G-FAB touched');
                openMenu();
            });

            closeMenuBtn.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                closeMenu(); 
            });
            
            // Close menu when clicking outside
            menuOverlay.addEventListener('click', (e) => {
                if (e.target === menuOverlay) {
                    closeMenu();
                }
            });

            const linkMenuAction = (id, action) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('click', () => { 
                        closeMenu(); 
                        setTimeout(action, 50); 
                    });
                }
            };
            linkMenuAction('g-menu-library-btn', () => showLibraryPopup('savedTest'));
            linkMenuAction('g-menu-reports-btn', showTestHistory);
            linkMenuAction('g-menu-revision-btn', startReadRemember);
            linkMenuAction('g-menu-weakness-btn', () => { populateSmartRevisionSetup(); showPopup('smartRevision'); });
            linkMenuAction('g-menu-help-btn', () => showPopup('help'));
            linkMenuAction('g-menu-settings-btn', () => showPopup('settings'));
            
            console.log('G-FAB initialized successfully');
        }

        function updateGFabVisibility() {
            const fab = document.getElementById('g-control-center-fab');
            const isHomePage = !pages.home.classList.contains('hidden');
            const isAnyPopupOpen = document.body.classList.contains('popup-is-open');

            // Reset basics
            fab.classList.remove('dimmed');
            fab.style.transition = 'opacity 0.5s';
            
            // Clear purana timer agar koi hai
            if (window.gFabHideTimer) clearTimeout(window.gFabHideTimer);

            if (isAnyPopupOpen) {
                fab.style.display = 'none';
                return;
            }

            if (isHomePage) {
                // Home Page: Always Show
                fab.style.display = 'flex';
                fab.style.opacity = '1';
            } else {
                // Other Pages: Show first, then Hide after 1 second
                fab.style.display = 'flex';
                fab.style.opacity = '1';
                
                window.gFabHideTimer = setTimeout(() => {
                    // Check again: Agar abhi bhi Home pe nahi hain to hide karo
                    if (pages.home.classList.contains('hidden')) {
                        fab.style.opacity = '0';
                        setTimeout(() => { 
                            if (pages.home.classList.contains('hidden')) fab.style.display = 'none'; 
                        }, 500); // Wait for fade out
                    }
                }, 1000); // 1 Second Delay
            }
        }
        
        const showPage = (pageName) => { 
            Object.values(pages).forEach(p => p.classList.add('hidden')); 
            if (pages[pageName]) pages[pageName].classList.remove('hidden'); 
            updateGFabVisibility(); 
            
            const fab = document.getElementById('g-control-center-fab');
            if (pageName === 'home' || !document.body.classList.contains('popup-is-open')) {
                fab.style.display = 'flex';
                fab.style.opacity = '1'; 
                fab.classList.remove('dimmed'); 
            }
            
            if (pageName === 'quiz') requestWakeLock(); else releaseWakeLock();
        };
        
        const showPopup = (popupName, show = true) => { 
            if (popups[popupName]) {
                popups[popupName].classList.toggle('hidden', !show);
                document.body.classList.toggle('popup-is-open', show);
                updateGFabVisibility(); 
            }
        };

        // --- Event Listeners ---
        function addEventListeners() {
            document.getElementById('start-test-btn').addEventListener('click', handleStartTestClick);
            document.getElementById('fab-go-home').addEventListener('click', () => showPage('home'));
            document.getElementById('review-go-home-btn').addEventListener('click', () => { showPopup('testReview', false); showPage('home'); showPopup('quote', false); });
            
            document.getElementById('upload-file-main-btn').addEventListener('click', () => {
                populatePreviouslyUploadedFiles();
                document.getElementById('upload-subject-name').textContent = activeSubject;
                showPopup('upload');
            });
            document.getElementById('upload-popup-close-x').addEventListener('click', () => showPopup('upload', false));
            document.getElementById('upload-popup-close-btn').addEventListener('click', () => showPopup('upload', false));
            
            document.getElementById('upload-universal-btn').addEventListener('click', () => document.getElementById('universal-file-input').click());
            document.getElementById('universal-file-input').addEventListener('change', (e) => handleFileUpload(e.target.files[0]));
            
            document.getElementById('clear-all-data-btn').addEventListener('click', clearAllAppData);

            document.getElementById('view-sheets-btn').addEventListener('click', showViewSheetsPopup);
            document.getElementById('universal-search-btn').addEventListener('click', openUniversalSearch);
            document.getElementById('view-sheets-close-btn').addEventListener('click', () => showPopup('viewSheets', false));
            document.getElementById('fab-go-test').addEventListener('click', () => showPopup('goToTest'));
            document.getElementById('go-to-test-close-btn').addEventListener('click', () => showPopup('goToTest', false));
            document.getElementById('start-test-current-sheet').addEventListener('click', startNormalTestFromRR);
            document.getElementById('start-test-from-home-settings').addEventListener('click', startPracticeTestFromRR);
            document.getElementById('filtered-questions-close-btn').addEventListener('click', () => showPopup('filteredQuestions', false));
            document.getElementById('filtered-questions-summary-btn').addEventListener('click', () => showPopup('filteredQuestions', false));

            document.getElementById('quiz-pause-btn').addEventListener('click', handlePauseClick);
            document.getElementById('quiz-shuffle-btn').addEventListener('click', toggleShuffle);
            document.getElementById('next-q-btn').addEventListener('click', goToNextQuestion);
            document.getElementById('prev-q-btn').addEventListener('click', () => showQuestion(currentQuiz.currentQuestionIndex - 1));
            document.getElementById('mark-review-btn').addEventListener('click', markQuestionForReview);
            document.getElementById('save-q-btn').addEventListener('click', handleSaveQuestionClick);
            document.getElementById('quiz-summary-btn').addEventListener('click', showQuizSummary);
            document.getElementById('summary-close-btn').addEventListener('click', () => showPopup('quizSummary', false));
            document.getElementById('submit-test-btn').addEventListener('click', () => { if (confirm("Are you sure you want to submit the test?")) submitTest(); });

            document.getElementById('test-review-main').addEventListener('click', handleTestReviewClick);
            
            document.getElementById('fab').addEventListener('click', () => document.getElementById('fab-menu').classList.toggle('hidden'));
            // Correct scroll listener for Sticky Header layout
            const rrContentEl = document.getElementById('read-remember-content');
            if(rrContentEl) {
                rrContentEl.addEventListener('scroll', handleFabVisibility);
            }
            
            document.getElementById('rr-shuffle-toggle').addEventListener('change', (e) => {
                rrState.isShuffled = e.target.checked;
                if (rrState.isShuffled) rrState.questions = shuffleArray(rrState.originalOrder);
                renderReadRememberContent();
            });

            // NEW: Sheet Name View Toggle
            document.getElementById('rr-view-sheet-toggle').addEventListener('change', (e) => {
                const contentDiv = document.getElementById('read-remember-content');
                if (e.target.checked) {
                    contentDiv.classList.add('show-sheet-tags');
                } else {
                    contentDiv.classList.remove('show-sheet-tags');
                }
            });
            
            const rrContent = document.getElementById('read-remember-content');
            rrContent.addEventListener('dblclick', handleRRQuestionClick);
            rrContent.addEventListener('mousedown', handleRRMouseDown);
            rrContent.addEventListener('mouseup', handleRRMouseUp);
            rrContent.addEventListener('mouseleave', handleRRMouseUp);
            rrContent.addEventListener('contextmenu', handleRRContextMenu);
            
            pages.quiz.addEventListener('touchstart', handleTouchStart, { passive: true });
            pages.quiz.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('keydown', handleKeyDown);

            document.getElementById('resume-quiz-confirm-btn').addEventListener('click', resumeQuiz);
            document.getElementById('start-new-quiz-btn').addEventListener('click', discardAndStartNew);

            document.getElementById('pause-exit-home-btn').addEventListener('click', exitQuizToHome);
            document.getElementById('pause-exit-close-btn').addEventListener('click', () => showPopup('pauseExit', false));
            
            document.getElementById('timer-up').addEventListener('dblclick', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(e => console.log(e));
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                }
            });

            const historyContent = document.getElementById('history-content');
            historyContent.addEventListener('click', handleHistoryItemClick);
            historyContent.addEventListener('mousedown', handleHistoryMouseDown);
            historyContent.addEventListener('mouseup', handleSelectionMouseUp);
            historyContent.addEventListener('mouseleave', handleSelectionMouseUp);
            historyContent.addEventListener('contextmenu', handleHistoryContextMenu);
            
            document.getElementById('history-close-btn').addEventListener('click', () => { showPopup('testHistory', false); exitHistorySelectionMode(); });
            document.getElementById('history-clear-all-btn').addEventListener('click', () => { if (!isHistorySelectionMode && confirm(`Are you sure you want to delete ALL reports for "${activeSubject}"?`)) { localStorage.removeItem(`testHistory_${activeSubject}`); showTestHistory(); } });
            document.getElementById('history-cancel-selection-btn').addEventListener('click', exitHistorySelectionMode);
            document.getElementById('history-delete-selected-btn').addEventListener('click', deleteSelectedHistory);
            
            document.getElementById('help-popup-close-btn').addEventListener('click', () => showPopup('help', false));
            document.getElementById('quote-popup-close-btn').addEventListener('click', () => showPopup('quote', false));
            document.getElementById('quote-popup-ok-btn').addEventListener('click', () => showPopup('quote', false));
            document.getElementById('add-hand-note-fab').addEventListener('click', createNewHandNote);
            document.getElementById('filter-all-notes').addEventListener('click', () => { renderLibraryContent(activeLibraryConfig, '', 'newest', 'all'); });
            document.getElementById('filter-q-notes').addEventListener('click', () => { renderLibraryContent(activeLibraryConfig, '', 'newest', 'question'); });
            document.getElementById('filter-hand-notes').addEventListener('click', () => { renderLibraryContent(activeLibraryConfig, '', 'newest', 'hand'); });
            
            addLibraryEventListeners();
            addCustomTestSetupListeners();
            addNoteEventListeners();
            addUniversalSearchListeners();
            addSmartRevisionListeners();
            applySettingsListeners();
            // addStartOptionsListeners(); // Function not defined - commented out
            // Activation Code
            // Setup Long Press for Quiz Navigation (which also zooms now independently)
                        
            // Setup Long Press for Quick Review Zoom Buttons
            setupLongPressForFont('rr-zoom-out', -0.1);
            setupLongPressForFont('rr-zoom-in', 0.1);

            const rrSearchTrigger = document.getElementById('rr-universal-search-trigger');
            if(rrSearchTrigger) { rrSearchTrigger.addEventListener('click', openUniversalSearch); } 
            
            popups.simple.addEventListener('click', (e) => {
                if (e.target.id === 'simple-popup') {
                    showPopup('simple', false);
                }
            });
        }

        // --- Updated Ask AI Logic ---
        window.askAI = function(questionText, optionsArray = []) {
            if (!questionText) return;
            let query = `Explain this question: ${questionText}`;
            
            // Add options to query for better AI response
            if(optionsArray && optionsArray.length > 0) {
                query += ` Options: ${optionsArray.join(', ')}. Explain all 4 options in simple Hindi and Technical English words.`;
            } else {
                 query += ` Explain this in simple Hindi and Technical English.`;
            }

            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }

        // --- Core Logic ---
        function shuffleArray(array) { const newArray = [...array]; for (let i = newArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; } return newArray; }
        
        let rrState = { questions: [], isShuffled: false, originalOrder: [], activeSheetNames: [] };
        
       
        
       
        
       
        
       

        // Global variable scroll direction track karne ke liye
        let lastScrollTop = 0; 

        function handleFabVisibility() {
            const container = document.getElementById('read-remember-content');
            if (!container) return;
            
            const fab = document.getElementById('fab');
            const fabMenu = document.getElementById('fab-menu');

            // Agar Quick Review page band hai, to FAB hatao
            if (pages.readRemember.classList.contains('hidden')) { 
                fab.classList.remove('visible'); 
                fabMenu.classList.add('hidden'); 
                return; 
            }

            const st = container.scrollTop;

            // LOGIC:
            // Agar abhi ka scroll (st) purane (lastScrollTop) se jyada hai -> Matlab hum NICHE ja rahe hain -> HIDE
            if (st > lastScrollTop) {
                fab.classList.remove('visible');
                fabMenu.classList.add('hidden'); // Menu bhi band kar do
            } 
            // Agar hum UPAR ja rahe hain -> SHOW
            else {
                fab.classList.add('visible');
            }
            
            // Negative scroll fix (Safari/Mobile bounce effect ke liye)
            lastScrollTop = st <= 0 ? 0 : st;
        }
                // --- NEW VARIABLES FOR START POPUP ---
        let tempStartOptions = { allQs: [], unattemptedQs: [], isPractice: false };

        function getAttemptedQuestionsSet() {
            const history = JSON.parse(localStorage.getItem(`testHistory_${activeSubject}`) || '[]');
            const attemptedSet = new Set();
            history.forEach(record => {
                if(record.questions && record.userAnswers) {
                    record.questions.forEach((q, i) => {
                        if(record.userAnswers[i] !== null) { attemptedSet.add(q.question); }
                    });
                }
            });
            return attemptedSet;
        }

                function openStartTestOptionsPopup(isPractice) {
            let questions = (rrState.isShuffled ? rrState.questions : rrState.originalOrder)
                            .filter(q => rrState.activeSheetNames.includes(q.sheetName));
            
            if (questions.length === 0) { alert('No questions available in selected sheet.'); return; }

            const attemptedSet = getAttemptedQuestionsSet();
            const unattemptedQs = questions.filter(q => !attemptedSet.has(q.question));

            // NEW: Fetch from Wrong History (⚠️)
            const wrongHistory = JSON.parse(localStorage.getItem(`myWrongHistory_${activeSubject}`) || '[]');
            const wrongSet = new Set(wrongHistory.map(w => w.question));
            const wrongQs = questions.filter(q => wrongSet.has(q.question));

            tempStartOptions = { 
                allQs: questions, 
                unattemptedQs: unattemptedQs, 
                wrongQs: wrongQs, 
                isPractice: isPractice 
            };

            const unattemptedToggle = document.getElementById('sto-unattempted-toggle');
            const unattemptedLabel = document.getElementById('sto-unattempted-label');
            const wrongToggle = document.getElementById('sto-wrong-toggle');
            const wrongLabel = document.getElementById('sto-wrong-label');
            const infoText = document.getElementById('sto-info-text');
            const countInput = document.getElementById('sto-q-count');

            const totalCount = questions.length;
            const unattemptedCount = unattemptedQs.length;
            const wrongCount = wrongQs.length;

            unattemptedToggle.disabled = (unattemptedCount === 0);
            unattemptedToggle.checked = (unattemptedCount > 0);
            unattemptedLabel.textContent = `Only Unattempted Qs (${unattemptedCount})`;
            unattemptedLabel.style.opacity = unattemptedCount > 0 ? "1" : "0.5";

            // Updated Label
            wrongToggle.disabled = (wrongCount === 0);
            wrongToggle.checked = false; 
            wrongLabel.textContent = `Include Wrong Qs (⚠️) (${wrongCount})`;
            wrongLabel.style.opacity = wrongCount > 0 ? "1" : "0.5";

            infoText.innerHTML = DOMPurify.sanitize(`Total Sheet Qs: ${totalCount}<br>Unattempted: ${unattemptedCount} | Wrong History: ${wrongCount}`);

            const updateTotalCount = () => {
                let poolSize = 0;
                if (unattemptedToggle.checked && wrongToggle.checked) {
                    const set = new Set();
                    unattemptedQs.forEach(q => set.add(q.question));
                    wrongQs.forEach(q => set.add(q.question));
                    poolSize = set.size;
                } else if (unattemptedToggle.checked) {
                    poolSize = unattemptedCount;
                } else if (wrongToggle.checked) {
                    poolSize = wrongCount;
                } else {
                    poolSize = totalCount;
                }
                countInput.value = poolSize;
                countInput.max = poolSize;
            };

            unattemptedToggle.onchange = updateTotalCount;
            wrongToggle.onchange = updateTotalCount;
            updateTotalCount(); 

            showPopup('goToTest', false);
            showPopup('startTestOptions');
        }

       
       

               function getFilteredPool(useUnattempted, useWrong) {
    let pool = [];
    const attemptedSet = getAttemptedQuestionsSet();
    const wrongHistory = JSON.parse(localStorage.getItem(`myWrongHistory_${activeSubject}`) || '[]');

    if (useUnattempted && useWrong) {
        // Unattempted + Only those from wrong history that exist in current selection
        pool = tempStartOptions.allQs.filter(q => !attemptedSet.has(q.question) || wrongHistory.some(w => w.question === q.question));
    } else if (useUnattempted) {
        pool = tempStartOptions.allQs.filter(q => !attemptedSet.has(q.question));
    } else if (useWrong) {
        pool = tempStartOptions.allQs.filter(q => wrongHistory.some(w => w.question === q.question));
    } else {
        pool = tempStartOptions.allQs;
    }
    return pool;
}
        
        // --- QUIZ LOGIC ---
        function startQuiz(questions, reattempting = false, isPractice = false, timerMode = 'normal') {
            if (!questions || questions.length === 0) { alert("No questions available for this quiz."); return; }
            stopTimers(); resetQuizState();
            currentQuiz.isPracticeMode = isPractice;
            currentQuiz.timerMode = timerMode;
            pages.quiz.classList.toggle('practice-mode', currentQuiz.isPracticeMode);
            currentQuiz.questions = questions.map(q => ({...q, options: null}));
            currentQuiz.userAnswers = new Array(questions.length).fill(null); currentQuiz.markedForReview = new Array(questions.length).fill(false); currentQuiz.visited = new Array(questions.length).fill(false);
            if (reattempting) currentQuiz.historyRecord = reattempting;
            showPage('quiz'); setupQuizUI(); showQuestion(0); startTimers();
            document.getElementById('question-text-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        function setupQuizUI() {
            const navigator = document.getElementById('q-navigator'); navigator.innerHTML = '';
            currentQuiz.questions.forEach((_, i) => {
                const box = document.createElement('div'); box.className = 'q-nav-box'; box.textContent = i + 1; box.dataset.qIndex = i;
                box.addEventListener('click', () => showQuestion(i));
                navigator.appendChild(box);
            });
            updateShuffleButtonUI();
        }
        
        // --- Corrected showQuestion (Fixed Search Button with Event Listener) ---
        function showQuestion(index) {
    // --- NEW: Agar purana timer chal raha hai to use turant roko ---
    if (autoNextTimer) {
        clearTimeout(autoNextTimer);
        autoNextTimer = null;
    }
    // ......

    if (index < 0 || index >= currentQuiz.questions.length) return;
            const questionEl = document.getElementById('question-text-area');
            const explanationEl = document.getElementById('quiz-explanation-area');

            explanationEl.style.display = 'none'; 
            explanationEl.innerHTML = '';
            questionEl.classList.remove('animated');
            
            setTimeout(() => {
                currentQuiz.currentQuestionIndex = index;
                currentOptionFocusIndex = -1;
                if (!currentQuiz.visited[index]) currentQuiz.visited[index] = true;
                const q = currentQuiz.questions[index];
                if (!q.options) { q.options = shuffleArray([q.correctAnswer, ...q.incorrectAnswers]); }
                
                const markers = getVisualMarkers(q.question);
                
                // 1. Set HTML with ID instead of onclick
                questionEl.innerHTML = DOMPurify.sanitize(`<strong>Q.${index + 1}:</strong> ${q.question} ${markers} <span class="ai-icon" id="quiz-ai-search-btn">🔍</span>`);
                questionEl.classList.add('animated');
                
                // 2. Attach Event Listener for AI
                const searchBtn = document.getElementById('quiz-ai-search-btn');
                if(searchBtn) {
                    searchBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.askAI(q.question, q.options);
                    });
                }
                
                const optionsArea = document.getElementById('quiz-options-area'); optionsArea.innerHTML = '';
                q.options.forEach((opt, i) => {
                    const optionDiv = document.createElement('div'); optionDiv.className = 'option';
                    optionDiv.textContent = `${['A', 'B', 'C', 'D'][i]}. ${opt}`; optionDiv.dataset.option = opt;
                    if (currentQuiz.userAnswers[index] === opt && !currentQuiz.isPracticeMode) optionDiv.classList.add('selected');
                    optionDiv.addEventListener('click', () => selectAnswer(optionDiv, opt));
                    optionsArea.appendChild(optionDiv);
                });

                if (currentQuiz.isPracticeMode && currentQuiz.userAnswers[index] !== null && q.explanation) {
                    explanationEl.innerHTML = DOMPurify.sanitize(`<strong>Explanation:</strong><br>${q.explanation}`);
                    explanationEl.style.display = 'block';
                    const opts = optionsArea.querySelectorAll('.option');
                    opts.forEach(o => {
                         o.style.pointerEvents = 'none';
                         if(o.dataset.option === q.correctAnswer) o.classList.add('practice-correct');
                         if(o.dataset.option === currentQuiz.userAnswers[index] && currentQuiz.userAnswers[index] !== q.correctAnswer) o.classList.add('practice-wrong');
                    });
                }

                updateSaveButtonUI(); updateNavigator(); updateQuizNavButtons(); saveQuizState();
            }, 50);
        }
        
                function selectAnswer(selectedEl, option) {
            const index = currentQuiz.currentQuestionIndex;
            const q = currentQuiz.questions[index];
            const isCorrect = option === q.correctAnswer;

            if (currentQuiz.isPracticeMode) {
                if (currentQuiz.userAnswers[index] !== null) return; 
                
                currentQuiz.userAnswers[index] = option; 
                updateNavigator();
                
                document.querySelectorAll('#quiz-options-area .option').forEach(el => { el.style.pointerEvents = 'none'; });
                
                if (q.explanation) {
                    const explEl = document.getElementById('quiz-explanation-area');
                    explEl.innerHTML = DOMPurify.sanitize(`<strong>Explanation:</strong><br>${q.explanation}`);
                    explEl.style.display = 'block';
                }

                if (isCorrect) { 
                    selectedEl.classList.add('practice-correct'); 
                    if (!q.explanation) autoNextTimer = setTimeout(goToNextQuestion, 1500);
                    manageWrongHistory(q, false); // Clean from Warning list
                } 
                else {
                    selectedEl.classList.add('practice-wrong');
                    const correctEl = Array.from(document.querySelectorAll('#quiz-options-area .option')).find(el => el.dataset.option === q.correctAnswer);
                    if (correctEl) correctEl.classList.add('practice-correct');
                    manageWrongHistory(q, true); // Add to Warning list (⚠️)
                }
            } else {
                currentQuiz.userAnswers[index] = (currentQuiz.userAnswers[index] === option) ? null : option;
                showQuestion(index);
            }
            saveQuizState();
        }
        
        function updateNavigator(targetNavigator = 'q-navigator') {
            const container = document.getElementById(targetNavigator); if (!container) return;
            container.querySelectorAll('.q-nav-box').forEach((box, i) => {
                box.className = 'q-nav-box';
                if (currentQuiz.visited[i] && !currentQuiz.userAnswers[i]) { box.classList.add('visited'); }
                if (currentQuiz.markedForReview[i]) { box.classList.add('marked'); }
                if (currentQuiz.userAnswers[i] !== null) { box.classList.add('answered'); }
                if (i === currentQuiz.currentQuestionIndex && targetNavigator === 'q-navigator') { box.classList.add('current'); box.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
                box.innerHTML = i + 1;
                if (box.classList.contains('answered') && box.classList.contains('marked')) { box.innerHTML += DOMPurify.sanitize('<div class="review-star">⭐</div>'); }
            });
        }
        function updateQuizNavButtons() {
            document.getElementById('prev-q-btn').disabled = currentQuiz.currentQuestionIndex === 0;
            if (currentQuiz.isShuffled) { document.getElementById('next-q-btn').disabled = currentQuiz.questions.every((q, i) => currentQuiz.visited[i]); } 
            else { document.getElementById('next-q-btn').disabled = currentQuiz.currentQuestionIndex === currentQuiz.questions.length - 1; }
        }
        function goToNextQuestion() { if (currentQuiz.isShuffled) goToNextShuffledQuestion(); else showQuestion(currentQuiz.currentQuestionIndex + 1); }
        function goToNextShuffledQuestion() {
            const unvisitedIndices = currentQuiz.questions.map((_, i) => i).filter(i => !currentQuiz.visited[i]);
            if (unvisitedIndices.length > 0) showQuestion(unvisitedIndices[Math.floor(Math.random() * unvisitedIndices.length)]);
            else { alert("You have visited all questions."); updateQuizNavButtons(); }
        }
        function markQuestionForReview() {
            if (pages.quiz.classList.contains('hidden') || currentQuiz.isPaused) return;
            const index = currentQuiz.currentQuestionIndex;
            currentQuiz.markedForReview[index] = !currentQuiz.markedForReview[index];
            updateNavigator(); updateNavigator('summary-q-grid'); saveQuizState();
        }
        function startTimers(resume = false) {
            const timerDownEl = document.getElementById('timer-down');
            if (currentQuiz.timerMode === 'none' || currentQuiz.isPracticeMode) { timerDownEl.style.display = 'none'; } else { timerDownEl.style.display = 'inline'; }
            if (!resume) { 
                currentQuiz.startTime = Date.now(); currentQuiz.elapsedSeconds = 0; 
                let secondsPerQ = 15; if (currentQuiz.timerMode === 'relaxed') secondsPerQ = 30;
                currentQuiz.countdownRemaining = currentQuiz.questions.length * secondsPerQ;
            } else { currentQuiz.startTime = Date.now() - (currentQuiz.elapsedSeconds * 1000); }
            if (currentQuiz.elapsedTimer) clearInterval(currentQuiz.elapsedTimer);
            if (currentQuiz.countdownTimer) clearInterval(currentQuiz.countdownTimer);

            currentQuiz.elapsedTimer = setInterval(() => {
                if (currentQuiz.isPaused) return; 
                currentQuiz.elapsedSeconds = Math.floor((Date.now() - currentQuiz.startTime) / 1000);
                const h = String(Math.floor(currentQuiz.elapsedSeconds / 3600)).padStart(2, '0'); 
                const m = String(Math.floor((currentQuiz.elapsedSeconds % 3600) / 60)).padStart(2, '0'); 
                const s = String(currentQuiz.elapsedSeconds % 60).padStart(2, '0');
                document.getElementById('timer-up').textContent = `${h}:${m}:${s}`;
            }, 1000);

            if (currentQuiz.timerMode !== 'none' && !currentQuiz.isPracticeMode) {
                currentQuiz.countdownTimer = setInterval(() => {
                    if (currentQuiz.isPaused) return; 
                    const totalSeconds = currentQuiz.countdownRemaining;
                    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0'); 
                    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'); 
                    const s = String(totalSeconds % 60).padStart(2, '0');
                    timerDownEl.textContent = `${h}:${m}:${s}`;
                    currentQuiz.countdownRemaining--; 
                    if (totalSeconds < 0) { alert('Time is up! The test will be submitted automatically.'); submitTest(); }
                }, 1000);
            }
        }
        function stopTimers() { clearInterval(currentQuiz.elapsedTimer); clearInterval(currentQuiz.countdownTimer); }
        function toggleShuffle() { currentQuiz.isShuffled = !currentQuiz.isShuffled; updateShuffleButtonUI(); updateQuizNavButtons(); }
        function updateShuffleButtonUI() { const btn = document.getElementById('quiz-shuffle-btn'); btn.classList.remove('on', 'off'); btn.classList.add(currentQuiz.isShuffled ? 'on' : 'off'); }
        function saveQuizState() { if (currentQuiz && currentQuiz.questions.length > 0) localStorage.setItem(`activeQuizState_${activeSubject}`, JSON.stringify(currentQuiz)); }
       
        function showQuotePopup(title, message, type) {
            const titleEl = document.getElementById('quote-title'); const messageEl = document.getElementById('quote-message');
            titleEl.textContent = title; messageEl.textContent = message; titleEl.className = type; showPopup('quote');
        }
        
        // --- Updated saveTestToHistory (Limit > 50) ---
       

                function submitTest() {
            stopTimers(); localStorage.removeItem(`activeQuizState_${activeSubject}`); showPopup('quizSummary', false);
            let correct = 0, wrong = 0, attempted = 0;
            
            currentQuiz.questions.forEach((q, i) => { 
                if (currentQuiz.userAnswers[i] !== null) { 
                    attempted++; 
                    if (currentQuiz.userAnswers[i] === q.correctAnswer) { 
                        correct++; 
                        manageWrongHistory(q, false); // Remove from Warning list
                    } 
                    else {
                        wrong++;
                        manageWrongHistory(q, true); // Add to Warning list (⚠️)
                    }
                } 
            });

            const total = currentQuiz.questions.length; const netMark = (correct - (wrong / 3)).toFixed(2); const percentage = total > 0 ? ((correct / total) * 100) : 0;
            const historyRecord = { date: new Date().toLocaleString(), total, attempted, correct, wrong, netMark, percentage: percentage.toFixed(2), questions: currentQuiz.questions, userAnswers: currentQuiz.userAnswers, markedForReview: currentQuiz.markedForReview };
            
            saveTestToHistory(historyRecord); updateDashboard(); showTestReview(historyRecord);
            if (percentage >= 60) { triggerConfetti(); const quote = positiveQuotes[Math.floor(Math.random() * positiveQuotes.length)]; showQuotePopup("Well Done!", quote, "success"); } 
            else { const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]; showQuotePopup("Keep Trying!", quote, "motivation"); }
        }
        function handleTouchStart(e) { if (currentQuiz.isPaused || e.target.closest('.quiz-header')) { touchStartX = 0; return; } touchStartX = e.changedTouches[0].screenX; }
        function handleTouchEnd(e) {
            if (currentQuiz.isPaused || touchStartX === 0) return;
            const deltaX = e.changedTouches[0].screenX - touchStartX;
            if (Math.abs(deltaX) > 50) { if (deltaX < 0) goToNextQuestion(); else showQuestion(currentQuiz.currentQuestionIndex - 1); }
            touchStartX = 0; 
        }
                function handleKeyDown(e) {
            // Rule 1: Agar typing kar rahe hain, to shortcuts mat chalao
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Enter') e.target.blur(); // Enter se typing band
                return;
            }

            const key = e.key.toLowerCase();

            // --- 1. GLOBAL SHORTCUTS (Kahin bhi kaam karenge) ---

            // F: Toggle Full Screen
            if (key === 'f') {
                e.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => console.log(err));
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                }
                return;
            }

            // ESC: Close Popup / Cancel
            if (key === 'escape') {
                e.preventDefault();
                // Sabse upar jo popup khula hai use band karo
                const openPopups = Array.from(document.querySelectorAll('.popup-overlay:not(.hidden)'));
                if (openPopups.length > 0) {
                    const lastPopup = openPopups[openPopups.length - 1]; // Sabse upar wala
                    // Koshish karo close button dabane ki, nahi to force hide karo
                    const closeBtn = lastPopup.querySelector('.popup-close-btn, .btn-secondary');
                    if(closeBtn) closeBtn.click(); else lastPopup.classList.add('hidden');
                } 
                // Agar Translate popup khula hai
                else if (!document.getElementById('translate-popup').classList.contains('hidden')) {
                     document.getElementById('translate-popup').classList.add('hidden');
                }
                return;
            }

            // ENTER: Intelligent OK Button
            if (key === 'enter') {
                e.preventDefault();
                // Agar Popup khula hai -> Uska Green/Blue Button dabao
                const activePopup = document.querySelector('.popup-overlay:not(.hidden) .popup-content, .popup-overlay:not(.hidden) .popup-content-full');
                if (activePopup) {
                    const mainBtn = activePopup.querySelector('.btn-green, .btn-blue, .btn-action, #quote-popup-ok-btn');
                    if (mainBtn && !mainBtn.disabled) { mainBtn.click(); return; }
                }
                // Agar Quiz me hain -> Next Question
                if (!pages.quiz.classList.contains('hidden') && !currentQuiz.isPaused) {
                    goToNextQuestion();
                }
                return;
            }

            // --- 2. QUIZ MODE SHORTCUTS (Sirf Quiz me chalenge) ---
            if (!pages.quiz.classList.contains('hidden')) {
                
                // SPACE: Pause / Resume
                if (e.code === 'Space') {
                    e.preventDefault();
                    handlePauseClick();
                    return;
                }

                // Agar Paused hai -> Sirf 'H' (Home) chalega
                if (currentQuiz.isPaused) {
                    if (key === 'h') { e.preventDefault(); exitQuizToHome(); }
                    return;
                }

                // S: Save Question
                if (key === 's') { handleSaveQuestionClick(); }

                // M: Mark for Review
                if (key === 'm') { markQuestionForReview(); }

                // T: Translate Current Question
                if (key === 't') {
                    e.preventDefault();
                    // Translate icon dhundh kar click karwao
                    const translateIcon = document.querySelector('#question-text-area #translate-icon');
                    if(translateIcon) translateIcon.click();
                    else {
                        // Agar icon nahi mila (rare case), to manually trigger karo
                        // Hum ek fake event banayenge jo translate logic ko chahiye
                        const qTextDiv = document.getElementById('question-text-area');
                        if(qTextDiv) {
                            // Ek fake "icon" element banate hain taaki function confuse na ho
                            const fakeTarget = { target: { closest: () => qTextDiv } };
                            // Ab wo function call karte hain jo aapne 'handleTranslateClick' naam se banaya hai
                            // NOTE: Humein wo function global scope me nahi hai, isliye hum
                            // 'click' event dispatch karenge text area par.
                            const mouseEvent = new MouseEvent('mouseover', { bubbles: true });
                            document.body.dispatchEvent(mouseEvent); // Icons laane ke liye hover
                            setTimeout(() => {
                                const newIcon = document.querySelector('#question-text-area #translate-icon');
                                if(newIcon) newIcon.click();
                            }, 50);
                        }
                    }
                }

                // Arrows: Navigation
                if (key === 'arrowright') goToNextQuestion();
                if (key === 'arrowleft') showQuestion(currentQuiz.currentQuestionIndex - 1);

                // Options Selection (1-4 or A-D)
                if (['1', 'a'].includes(key)) document.querySelector('.quiz-options .option:nth-child(1)')?.click();
                if (['2', 'b'].includes(key)) document.querySelector('.quiz-options .option:nth-child(2)')?.click();
                if (['3', 'c'].includes(key)) document.querySelector('.quiz-options .option:nth-child(3)')?.click();
                if (['4', 'd'].includes(key)) document.querySelector('.quiz-options .option:nth-child(4)')?.click();
            }
        }
        function handleStartTestClick() {
            if (allQuestionsData.length === 0 && getSavedFiles().length === 0) { alert('Please upload a file first.'); return; }
            if (localStorage.getItem(`activeQuizState_${activeSubject}`)) { showPopup('resumeQuiz'); } else { populateCustomTestSetup(); showPopup('customTestSetup'); }
        }
        function handlePauseClick() { if (currentQuiz.isPaused) { togglePause(); } else { togglePause(); showPopup('pauseExit'); } }
        function exitQuizToHome() { showPopup('pauseExit', false); showPage('home'); }
        function discardAndStartNew() {
            if (confirm("Are you sure you want to discard the previous quiz? Your progress will be lost.")) { localStorage.removeItem(`activeQuizState_${activeSubject}`); showPopup('resumeQuiz', false); handleStartTestClick(); }
        }
                        function showViewSheetsPopup() {
            if (allQuestionsData.length === 0) { alert('Please load a file first.'); return; }
            
            // 1. Get History & Build Attempted Set
            const history = JSON.parse(localStorage.getItem(`testHistory_${activeSubject}`) || '[]');
            const attemptedSet = new Set();
            
            history.forEach(record => {
                if (record.questions && record.userAnswers) {
                    record.questions.forEach((q, i) => {
                        if (record.userAnswers[i] !== null) {
                            attemptedSet.add(q.question);
                        }
                    });
                }
            });

            const listContainer = document.getElementById('view-sheets-list'); 
            listContainer.innerHTML = '';
            
            let html = '<div class="sheet-table-container"><div class="popup-scrollable-content"><table class="sheet-table"><thead><tr><th>#</th><th>Sheet Name</th><th>Progress</th></tr></thead><tbody>';
            
            allQuestionsData.forEach((sheet, index) => {
                let sheetAttemptedCount = 0;
                sheet.questions.forEach(q => {
                    if (attemptedSet.has(q.question)) {
                        sheetAttemptedCount++;
                    }
                });

                const totalQs = sheet.questions.length;
                const percentage = totalQs > 0 ? (sheetAttemptedCount / totalQs) * 100 : 0;
                
                // --- COLOR LOGIC FIXED FOR READABILITY ---
                let rowStyle = '';
                let statusIcon = '';
                
                if (percentage === 100) {
                    // Completed: Light Green Background + BLACK Text
                    rowStyle = 'background-color: #81c784; color: #000000; font-weight: bold;'; 
                    statusIcon = '✅';
                } else if (percentage > 0) {
                    // In Progress: Light Yellow Background + BLACK Text
                    rowStyle = 'background-color: #fff176; color: #000000; font-weight: bold;';
                    statusIcon = '⏳';
                }

                html += `<tr style="${rowStyle}">
                            <td>${index + 1}</td>
                            <td>${sheet.sheetName}</td>
                            <td>
                                ${sheetAttemptedCount}/${totalQs} ${statusIcon}
                            </td>
                         </tr>`;
            });
            
            html += '</tbody></table></div></div>';
            listContainer.innerHTML = DOMPurify.sanitize(html); 
            showPopup('viewSheets');
        }
        function togglePause() {
            currentQuiz.isPaused = !currentQuiz.isPaused;
            document.body.classList.toggle('quiz-is-paused', currentQuiz.isPaused);
            pages.quiz.classList.toggle('frozen', currentQuiz.isPaused);
            document.getElementById('quiz-pause-btn').textContent = currentQuiz.isPaused ? '▶️' : '⏸️'; 
            saveQuizState();
        }
        function resumeQuiz() {
            const savedStateJSON = localStorage.getItem(`activeQuizState_${activeSubject}`);
            if (savedStateJSON) {
                try {
                    currentQuiz = JSON.parse(savedStateJSON);
                    showPage('quiz'); pages.quiz.classList.toggle('practice-mode', currentQuiz.isPracticeMode);
                    setupQuizUI(); showQuestion(currentQuiz.currentQuestionIndex); startTimers(true);
                    if(currentQuiz.isPaused) { document.body.classList.add('quiz-is-paused'); pages.quiz.classList.add('frozen'); document.getElementById('quiz-pause-btn').textContent = '▶️'; }
                    showPopup('resumeQuiz', false);
                } catch (e) { console.error("Failed to resume quiz:", e); localStorage.removeItem(`activeQuizState_${activeSubject}`); showPopup('resumeQuiz', false); }
            }
        }
        
        // --- Req 2: Updated setupHoverActions (Includes Copy Feature) ---
        // --- Req 2: Updated setupHoverActions (Includes Click/Touch Support) ---
       // --- COMPLETE HOVER ACTIONS (Translate, Copy, Share) ---
       // --- COMPLETE HOVER ACTIONS (Translate, Copy, Share - FIXED) ---
        function setupHoverActions() {
            const translatePopup = document.getElementById('translate-popup');
            const translatableSelectors = [ '.qa-pair', '.question-text', '.hand-note-card' ];
            
            // Helper to add icons
            const addIconsToBlock = (targetBlock) => {
                if (!targetBlock) return;
                targetBlock.classList.add('translatable');
                
                // 1. Translate Icon
                if (!targetBlock.querySelector('#translate-icon')) {
                    const translateIcon = document.createElement('div'); 
                    translateIcon.id = 'translate-icon'; 
                    translateIcon.innerHTML = '文'; 
                    translateIcon.addEventListener('click', handleTranslateClick); 
                    translateIcon.addEventListener('touchstart', (e) => { e.stopPropagation(); handleTranslateClick(e); });
                    targetBlock.appendChild(translateIcon);
                }
                
                // 2. Copy Icon
                if (!targetBlock.querySelector('.copy-icon')) {
                    const copyIcon = document.createElement('div'); 
                    copyIcon.className = 'copy-icon'; 
                    copyIcon.innerHTML = '📋'; 
                    copyIcon.title = "Copy Text";
                    copyIcon.addEventListener('click', handleCopyClick);
                    copyIcon.addEventListener('touchstart', (e) => { e.stopPropagation(); handleCopyClick(e); });
                    targetBlock.appendChild(copyIcon);
                }

                // 3. Share Icon
                if (!targetBlock.querySelector('.share-icon')) {
                    const shareIcon = document.createElement('div'); 
                    shareIcon.className = 'share-icon'; 
                    shareIcon.innerHTML = '➤'; 
                    shareIcon.title = "Share as Image";
                    shareIcon.addEventListener('click', handleShareClick);
                    shareIcon.addEventListener('touchstart', (e) => { e.stopPropagation(); handleShareClick(e); });
                    targetBlock.appendChild(shareIcon);
                }
            };

            const removeIconsFromBlock = (targetBlock) => {
                if (targetBlock) {
                    targetBlock.classList.remove('translatable');
                    targetBlock.querySelectorAll('#translate-icon, .copy-icon, .share-icon').forEach(i => i.remove());
                }
            };

            // Mouse Hover (PC)
            document.body.addEventListener('mouseover', (e) => {
                if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) return;
                const targetBlock = e.target.closest(translatableSelectors.join(','));
                addIconsToBlock(targetBlock);
            });
            
            document.body.addEventListener('mouseout', (e) => {
                if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) return;
                const targetBlock = e.target.closest(translatableSelectors.join(','));
                if (targetBlock && !targetBlock.contains(e.relatedTarget)) {
                    removeIconsFromBlock(targetBlock);
                }
            });

            // Click/Tap (Mobile)
            document.body.addEventListener('click', (e) => {
                if (e.target.closest('#translate-icon') || e.target.closest('.copy-icon') || e.target.closest('.ai-icon') || e.target.closest('.share-icon')) return;
                const targetBlock = e.target.closest(translatableSelectors.join(','));
                document.querySelectorAll('.translatable').forEach(el => { if (el !== targetBlock) removeIconsFromBlock(el); });
                if (targetBlock) addIconsToBlock(targetBlock);
            });

                        // --- FEATURE 1: SHARE IMAGE FUNCTION (UPDATED - With Explanation & Yellow Box) ---
                        // --- FEATURE 1: SHARE IMAGE FUNCTION (FINAL FIX - Supports All Explanation Types) ---
            async function handleShareClick(e) {
                e.stopPropagation(); e.preventDefault();
                const btn = e.target;
                const originalText = btn.innerHTML;
                btn.innerHTML = '⏳'; 

                const block = e.target.closest(translatableSelectors.join(','));
                if (!block) { btn.innerHTML = originalText; return; }

                try {
                    // 1. Wrapper Setup
                    const wrapper = document.createElement('div');
                    Object.assign(wrapper.style, {
                        position: 'fixed', left: '-9999px', top: '0',
                        width: 'auto', minWidth: '400px', maxWidth: '600px',
                        height: 'auto', display: 'inline-block',
                        padding: '25px', backgroundColor: '#121212', color: '#ffffff',
                        border: '4px solid #6200EE', borderRadius: '15px',
                        fontFamily: '"Times New Roman", serif', fontSize: '18px', lineHeight: '1.6', zIndex: '10000'
                    });

                    const container = document.createElement('div');
                    
                    // --- A. Question ---
                    let qClone;
                    if (block.classList.contains('question-text')) {
                        qClone = block.cloneNode(true);
                    } else {
                        qClone = block.cloneNode(true);
                        const pTags = qClone.querySelectorAll('p');
                        if (pTags.length > 0) pTags[0].style.fontWeight = 'bold';
                    }
                    qClone.style.opacity = '1'; qClone.style.textShadow = 'none'; qClone.style.transform = 'none'; qClone.style.animation = 'none'; qClone.style.marginBottom = '15px'; qClone.style.color = '#ffffff'; 
                    qClone.querySelectorAll('#translate-icon, .copy-icon, .share-icon, .ai-icon, .sheet-name-tag, .status-star, .status-error').forEach(i => i.remove());
                    container.appendChild(qClone);

                    // --- B. Options ---
                    let optionsDiv = null;
                    const parentPopup = block.closest('#simple-popup-content');
                    
                    if (parentPopup) optionsDiv = parentPopup.querySelector('.quiz-options');
                    else if (block.parentElement) optionsDiv = block.parentElement.querySelector('.quiz-options');

                    if (optionsDiv) {
                        const optClone = optionsDiv.cloneNode(true);
                        optClone.querySelectorAll('.option').forEach(opt => {
                            opt.style.color = '#fff'; opt.style.border = '1px solid #444'; opt.style.margin = '8px 0'; opt.style.padding = '12px'; opt.style.borderRadius = '8px'; opt.style.background = 'transparent';
                            
                            const isCorrectClass = opt.classList.contains('correct') || opt.classList.contains('practice-correct') || opt.classList.contains('review-correct-answer') || opt.classList.contains('correct-answer-highlight'); 
                            const isWrongClass = opt.classList.contains('wrong') || opt.classList.contains('practice-wrong');

                            if(isCorrectClass) { opt.style.backgroundColor = '#1b5e20'; opt.style.borderColor = '#4caf50'; opt.style.fontWeight = 'bold'; } 
                            else if (isWrongClass) { opt.style.backgroundColor = '#b71c1c'; opt.style.borderColor = '#ef5350'; } 
                            else { opt.style.backgroundColor = '#1e1e1e'; }
                        });
                        container.appendChild(optClone);
                    }
                    
                    // --- C. Explanation (UPDATED SELECTOR) ---
                    let explDiv = null;
                    // FIX: Look for BOTH 'explanation-box' (Quiz) AND 'translate-expl-box' (Popup)
                    const explSelector = '.explanation-box, .translate-expl-box';

                    if (parentPopup) explDiv = parentPopup.querySelector(explSelector);
                    else if (block.parentElement) explDiv = block.parentElement.querySelector(explSelector);
                    if (!explDiv) explDiv = block.querySelector(explSelector);

                    if (explDiv && getComputedStyle(explDiv).display !== 'none') {
                        const explContainer = document.createElement('div');
                        Object.assign(explContainer.style, {
                            backgroundColor: '#fff9c4', color: '#000000', padding: '15px', marginTop: '20px', borderRadius: '8px', border: '1px solid #fbc02d', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        });
                        explContainer.innerHTML = DOMPurify.sanitize(explDiv.innerHTML);
                        container.appendChild(explContainer);
                    }
                    
                    wrapper.appendChild(container);

                    const footer = document.createElement('div');
                    const shareAppName = (typeof userName !== 'undefined' && userName) ? `${userName}'s Quiz` : 'Quiz';
                    footer.innerHTML = DOMPurify.sanitize(`<div style='margin-top:20px; padding-top:10px; border-top:1px solid #444; text-align:right; font-size:12px; color: #6dd5ed; font-weight:bold;'>✨ Shared via ${shareAppName}</div>`);
                    wrapper.appendChild(footer);

                    document.body.appendChild(wrapper);

                    const canvas = await html2canvas(wrapper, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
                    document.body.removeChild(wrapper);

                    canvas.toBlob(async (blob) => {
                        const cardName = (typeof userName !== 'undefined' && userName) ? `${userName}_quiz_card` : 'quiz_card';
                    const file = new File([blob], `${cardName}.png`, { type: "image/png" });
                        if (navigator.share && navigator.canShare({ files: [file] })) {
                            try { await navigator.share({ files: [file] }); btn.innerHTML = '✅'; } catch (err) { btn.innerHTML = originalText; }
                        } else {
                            const link = document.createElement('a'); link.href = canvas.toDataURL(); link.download = `${cardName}.png`; link.click();
                            alert("Image downloaded!"); btn.innerHTML = '✅';
                        }
                        setTimeout(() => btn.innerHTML = originalText, 1500);
                    }, 'image/png');

                } catch (err) { console.error(err); alert("Error creating image: " + err.message); btn.innerHTML = originalText; }
            }

            // --- FEATURE 2: COPY FUNCTION (SIMPLE & DIRECT) ---
                        // --- FEATURE 2: COPY FUNCTION (SIMPLE & DIRECT - FIXED FOR POPUP) ---
            function handleCopyClick(e) {
                e.stopPropagation(); e.preventDefault();
                const btn = e.target;
                const originalIcon = btn.innerHTML;
                const block = e.target.closest(translatableSelectors.join(','));
                if (!block) return;

                let textToCopy = "";
                
                // Check if we are inside the Simple Popup (Quick Review Double Click)
                const popupContent = document.getElementById('simple-popup-content');
                const isInsidePopup = !popupContent.classList.contains('hidden') && popupContent.contains(block);

                if (isInsidePopup) {
                    // --- Case 1: Copy from Popup (Question + Options + Correct Answer) ---
                    // 1. Get Question Text
                    let qText = popupContent.querySelector('.question-text')?.innerText || "";
                    // Clean up text
                    qText = qText.replace(/[文🔍📋➤]/g, '').trim();
                    qText = qText.includes('👉') ? qText.split('👉')[1].trim() : qText.replace(/^\d+[\.\)]\s*/, '').trim();
                    
                    textToCopy = "Q: " + qText + "\n";

                    // 2. Get Options
                    const options = popupContent.querySelectorAll('.quiz-options .option');
                    if (options.length > 0) {
                        options.forEach((opt, index) => {
                            // Check if this is the correct answer (highlighted class)
                            const isCorrect = opt.classList.contains('correct-answer-highlight');
                            const marker = isCorrect ? " (✅ Correct)" : "";
                            textToCopy += `${['A','B','C','D'][index]}. ${opt.innerText}${marker}\n`;
                        });
                    }

                    // 3. Get Note (if any)
                    const note = popupContent.querySelector('.question-note');
                    if(note) textToCopy += "\nNote: " + note.innerText.replace('My Note:', '').trim();

                } 
                else if (block.classList.contains('question-text')) {
                    // --- Case 2: Copy from Quiz Page ---
                    let rawText = block.innerText.replace(/[文🔍📋➤]/g, '').trim();
                    let cleanQ = rawText.includes('👉') ? rawText.split('👉')[1].trim() : rawText.replace(/^\d+[\.\)]\s*/, '').trim();
                    textToCopy = cleanQ;
                    
                    const optionsArea = document.getElementById('quiz-options-area');
                    if(optionsArea && optionsArea.children.length > 0) {
                        const opts = Array.from(optionsArea.querySelectorAll('.option')).map(o => o.innerText);
                        textToCopy += "\n\n" + opts.join("\n");
                    }
                } 
                else {
                    // --- Case 3: Copy from Quick Review List (Just Q & A) ---
                    const clone = block.cloneNode(true);
                    clone.querySelectorAll('#translate-icon, .copy-icon, .share-icon, .ai-icon, .sheet-name-tag, .status-star, .status-error').forEach(i => i.remove());
                    
                    const pTags = clone.querySelectorAll('p');
                    if(pTags.length >= 2) {
                         let qRaw = pTags[0].innerText.trim();
                         qRaw = qRaw.includes('👉') ? qRaw.split('👉')[1].trim() : qRaw.replace(/^\d+[\.\)]\s*/, '').trim();
                         textToCopy = "Q: " + qRaw + "\n" + pTags[1].innerText.trim();
                    } else { 
                        textToCopy = clone.innerText.trim(); 
                    }
                }

                // Add Prefix/Suffix
                const prefix = localStorage.getItem('copyPrefix') || '';
                const suffix = localStorage.getItem('copySuffix') || '';
                const finalString = `${prefix}\n${textToCopy}\n${suffix}`.trim();

                // Execute Copy
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(finalString)
                        .then(() => showSuccess())
                        .catch(() => fallbackCopy(finalString));
                } else { 
                    fallbackCopy(finalString); 
                }

                function showSuccess() { 
                    btn.innerHTML = '✅'; 
                    setTimeout(() => btn.innerHTML = originalIcon, 1000); 
                }
                
                function fallbackCopy(text) {
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    textArea.style.position = "fixed"; textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus(); textArea.select();
                    try { document.execCommand('copy'); showSuccess(); } catch (err) { }
                    document.body.removeChild(textArea);
                }
            }
                                 // --- FEATURE 3: TRANSLATE FUNCTION (FINAL FIX - Supports Explanation in All Modes) ---
            async function handleTranslateClick(e) {
                e.stopPropagation(); e.preventDefault();
                const blockToTranslate = e.target.closest(translatableSelectors.join(','));
                if (!blockToTranslate) return;
                
                let mainText = '';
                let explanationText = '';
                
                const popupContent = document.getElementById('simple-popup-content');
                
                // 1. Check if inside Popup (Quick Review / Library / Search Detail)
                if (!popupContent.classList.contains('hidden') && popupContent.contains(blockToTranslate)) {
                     // A. Get Question
                     let qText = popupContent.querySelector('.question-text')?.innerText || '';
                     qText = qText.includes('👉') ? qText.split('👉')[1].trim() : qText.replace(/^\d+[\.\)]\s*/, '').trim();
                     
                     // B. Get Options
                     const opts = Array.from(popupContent.querySelectorAll('.quiz-options .option')).map(o => o.innerText);
                     mainText = qText + "\n\n" + opts.join("\n");
                     
                     // C. Get Explanation (UPDATED SELECTOR)
                     // Fix: Look for both old class (just in case) and new yellow box class
                     const explDiv = popupContent.querySelector('.explanation-box, .translate-expl-box');
                     if (explDiv && getComputedStyle(explDiv).display !== 'none') {
                         explanationText = explDiv.innerText.replace('Explanation:', '').trim();
                     }

                } else {
                    // 2. Check if inside Quiz Page
                    if (blockToTranslate.classList.contains('question-text')) {
                        // A. Get Question
                        let rawText = blockToTranslate.innerText.replace(/[文🔍📋➤]/g, '').trim();
                        rawText = rawText.includes('👉') ? rawText.split('👉')[1].trim() : rawText.replace(/^\d+[\.\)]\s*/, '').trim();
                        mainText = rawText + "\n\n";
                        
                        // B. Get Options
                        const optionsArea = document.getElementById('quiz-options-area');
                        if(optionsArea) { 
                            const opts = Array.from(optionsArea.querySelectorAll('.option')).map(o => o.innerText);
                            mainText += opts.join("\n");
                        }

                        // C. Get Explanation
                        const explArea = document.getElementById('quiz-explanation-area');
                        if (explArea && getComputedStyle(explArea).display !== 'none') {
                            explanationText = explArea.innerText.replace('Explanation:', '').trim();
                        }
                    } else { 
                        // 3. Generic List Item
                         const clone = blockToTranslate.cloneNode(true);
                         clone.querySelectorAll('#translate-icon, .copy-icon, .share-icon, .ai-icon, .sheet-name-tag, .status-star, .status-error').forEach(i => i.remove());
                         const pTags = clone.querySelectorAll('p');
                         if(pTags.length >= 2) {
                             let qRaw = pTags[0].innerText;
                             qRaw = qRaw.includes('👉') ? qRaw.split('👉')[1].trim() : qRaw.replace(/^\d+[\.\)]\s*/, '').trim();
                             mainText = qRaw + "\n\n" + pTags[1].innerText;
                         } else { 
                             mainText = clone.innerText; 
                         }
                         
                         // Try to find explanation inside list item
                         const explInList = blockToTranslate.querySelector('.explanation-box, .translate-expl-box');
                         if(explInList) explanationText = explInList.innerText.replace('Explanation:', '').trim();
                    }
                }
                
                // Construct final text using Separator
                let textToTranslate = mainText;
                if(explanationText) {
                    textToTranslate += " ||| " + explanationText;
                }

                textToTranslate = textToTranslate.trim().substring(0, 2000); 
                if (!textToTranslate) return;
                
                translatePopup.innerHTML = 'Loading translation...';
                translatePopup.classList.remove('hidden');
                
                try {
                    // Using MyMemory API
                    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|hi&de=gudduquiz@gmail.com`);
                    const data = await response.json();
                    
                    if (data.responseData && data.responseData.translatedText) {
                        let fullTranslatedText = data.responseData.translatedText;
                        
                        let displayHtml = '';
                        // Split back using separator
                        let parts = fullTranslatedText.split('|||');
                        
                        if (parts.length > 1) {
                            displayHtml = `<div>${parts[0].replace(/\n/g, '<br>')}</div>`;
                            // Show Translated Explanation in Yellow Box
                            displayHtml += `<div class="translate-expl-box"><strong>व्याख्या (Explanation):</strong><br>${parts[1].trim().replace(/\n/g, '<br>')}</div>`;
                        } else {
                            displayHtml = fullTranslatedText.replace(/\n/g, '<br>');
                        }

                        translatePopup.innerHTML = `
                            ${displayHtml}
                            <br><br>
                            <div style="text-align:center;">
                                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('translate-popup').classList.add('hidden')">Close</button>
                            </div>
                        `;
                    } else { throw new Error(); }
                } catch (error) {
                    translatePopup.innerHTML = `
                        Translation failed or limit reached.<br>
                        <a href="https://translate.google.com/?sl=auto&tl=hi&text=${encodeURIComponent(textToTranslate)}&op=translate" target="_blank" style="color: #6dd5ed;">Open in Google Translate</a>
                        <br><br>
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('translate-popup').classList.add('hidden')">Close</button>
                    `;
                }
            }
        }
        function handleSaveQuestionClick() {
            const currentQ = currentQuiz.questions[currentQuiz.currentQuestionIndex];
            if (!currentQ) return;
            const config = listConfigurations.savedTest; let savedQs = config.getQuestions();
            const qIndex = savedQs.findIndex(q => q.question === currentQ.question);
            if (qIndex > -1) { savedQs.splice(qIndex, 1); } else { savedQs.push(currentQ); }
            config.saveQuestions(savedQs); updateSaveButtonUI();
        }
        function updateSaveButtonUI() {
            const saveBtn = document.getElementById('save-q-btn');
            const currentQ = currentQuiz.questions[currentQuiz.currentQuestionIndex];
            if (!currentQ) return;
            const savedQs = listConfigurations.savedTest.getQuestions();
            const isSaved = savedQs.some(q => q.question === currentQ.question);
            saveBtn.classList.toggle('saved', isSaved);
        }
       
                       
        function showFilteredQuestionsPopup(filter, record) {
            const titleEl = document.getElementById('filtered-questions-title');
            const gridDiv = document.getElementById('filtered-q-grid');
            const detailsDiv = document.getElementById('filtered-questions-content');
            titleEl.textContent = `${filter.charAt(0).toUpperCase() + filter.slice(1)} Questions`;
            gridDiv.innerHTML = ''; detailsDiv.innerHTML = '';
            const questionsToShow = record.questions.map((q, i) => {
                const userAnswer = record.userAnswers[i]; const isAttempted = userAnswer !== null;
                const isCorrect = isAttempted && userAnswer === q.correctAnswer; const isWrong = isAttempted && !isCorrect;
                const shouldShow = (filter === 'all') || (filter === 'attempted' && isAttempted) || (filter === 'correct' && isCorrect) || (filter === 'wrong' && isWrong);
                return shouldShow ? { question: q, index: i, userAnswer, isCorrect, isWrong } : null;
            }).filter(Boolean);
            if (questionsToShow.length === 0) { detailsDiv.innerHTML = '<p style="text-align:center; margin-top:20px;">No questions match this filter.</p>'; } 
            else {
                 questionsToShow.forEach(({ question, index, userAnswer, isCorrect, isWrong }) => {
                    const q = question;
                    const box = document.createElement('div'); box.className = 'q-nav-box'; box.textContent = index + 1;
                    if (userAnswer === null) box.classList.add('review-skipped'); else if (isCorrect) box.classList.add('review-correct'); else box.classList.add('review-wrong');
                    box.addEventListener('click', () => { document.getElementById(`review-question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
                    gridDiv.appendChild(box);
                    const questionDiv = document.createElement('div'); questionDiv.className = 'qa-pair'; questionDiv.id = `review-question-${index}`;
                    let optionsHtml = '';
                    let reviewOptions = q.options ? q.options : shuffleArray([q.correctAnswer, ...q.incorrectAnswers]);
                    reviewOptions.forEach((opt, optIndex) => {
                        let optClass = 'option';
                        if (opt === q.correctAnswer) optClass += ' review-correct-answer';
                        if (isWrong && opt === userAnswer) optClass += ' review-wrong-selection';
                        optionsHtml += `<div class="${optClass}">${['A', 'B', 'C', 'D'][optIndex]}. ${opt}</div>`;
                    });
                    const skippedMsg = userAnswer === null ? '<p class="review-skipped-text">Skipped</p>' : '';
                    
                    // Review Explanation
                    let explHtml = '';
                    if(q.explanation) {
                         explHtml = `<div class="explanation-box" style="display:block; margin-top:10px;"><strong>Explanation:</strong><br>${q.explanation}</div>`;
                    }

                    questionDiv.innerHTML = `<p><strong>${index + 1}.</strong> ${q.question}</p><div class="quiz-options">${optionsHtml}</div>${skippedMsg}${explHtml}`;
                    detailsDiv.appendChild(questionDiv);
                });
            }
            showPopup('filteredQuestions');
        }
       
       
       
       
       
       
       
       
       
       
        function switchToList(listType) {
            const config = listConfigurations[listType]; if (!config) return;
            if (activeLibraryConfig && activeLibraryConfig.selectionState.isSelectionMode) { exitLibrarySelectionMode(); }
            activeLibraryConfig = config;
            document.querySelectorAll('#library-tabs .library-tab-btn').forEach(btn => {
                const type = btn.dataset.listType;
                const originalText = { 'savedTest': 'From Test', 'savedRR': 'From Q&R', 'error': 'Error Questions', 'withNotes': '📝 With Notes' }[type];
                const count = listConfigurations[type] ? listConfigurations[type].getQuestions().length : 0;
                btn.textContent = `${originalText} (${count})`; btn.classList.toggle('active', type === listType);
            });
            const fab = document.getElementById('add-hand-note-fab'); const filters = document.getElementById('library-notes-filter');
            if (listType === 'withNotes') { fab.classList.remove('hidden'); filters.classList.remove('hidden'); } else { fab.classList.add('hidden'); filters.classList.add('hidden'); }
            document.getElementById('library-search-input').value = ''; document.getElementById('library-sort-select').value = 'newest';
            renderLibraryContent(config);
        }
        const debouncedLibrarySearch = debounce((config, term, sort) => { renderLibraryContent(config, term, sort); }, 300);
        
        // --- Updated renderLibraryContent (Req: Markers & Sheet Name) ---
       
        
               function showGenericQuestionDetail(config, index) {
            const questions = config.getQuestions(); 
            const q = questions[index]; 
            if (!q || q.type === 'handNote') return;
            
            const options = shuffleArray([q.correctAnswer, ...q.incorrectAnswers]);
            let optionsHtml = '';
            options.forEach((opt, i) => {
                const isCorrect = opt === q.correctAnswer; 
                const highlightClass = isCorrect ? 'correct-answer-highlight' : '';
                optionsHtml += `<div class="option ${highlightClass}">${['A','B','C','D'][i]}. ${opt}</div>`;
            });
            
            let noteHtml = ''; 
            if (q.note) { 
                noteHtml = `<div class="question-note" style="text-align:left; margin-top:20px;"><strong>My Note:</strong> ${q.note}</div>`; 
            }
            
            // --- UPDATED EXPLANATION LOGIC (Yellow Box) ---
            let explHtml = ''; 
            if(q.explanation) { 
                // Using 'translate-expl-box' class for consistent Yellow Theme
                explHtml = `<div class="translate-expl-box"><strong>Explanation:</strong><br>${q.explanation}</div>`; 
            }

            const popupContentEl = document.getElementById('simple-popup-content');
            popupContentEl.innerHTML = DOMPurify.sanitize(`
                <span class="popup-close-btn" onclick="document.getElementById('simple-popup').classList.add('hidden')">&times;</span>
                <div class="question-text">${q.question}</div>
                <div class="quiz-options">${optionsHtml}</div>
                ${explHtml}
                ${noteHtml}
            `);
            showPopup('simple');
        }
       
       
       
       
        function removeFromAllSources(questionText, onlyNote = false) {
            const update = (listKey) => {
                let list = JSON.parse(localStorage.getItem(listKey) || '[]');
                if (onlyNote) { list.forEach(q => { if(q.question === questionText) delete q.note; }); } else { list = list.filter(q => q.question !== questionText); }
                localStorage.setItem(listKey, JSON.stringify(list));
            };
            update(`savedQuestionsBank_${activeSubject}`); update(`savedRRQuestions_${activeSubject}`); update(`errorQuestions_${activeSubject}`);
            if (onlyNote) {
                 allQuestionsData.forEach(sheet => { sheet.questions.forEach(q => { if(q.question === questionText) delete q.note; }); });
                saveCurrentFileToMemory();
            }
        }
       
        function populateCustomTestSetup() {
            const sourceSelect = document.getElementById('custom-test-source');
            const sheetsContainer = document.getElementById('custom-test-sheets-filter');
            sheetsContainer.innerHTML = '';
            if (allQuestionsData.length > 0) {
                 allQuestionsData.forEach((sheet) => {
                    const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" class="custom-sheet-filter" value="${sheet.sheetName}" checked> ${sheet.sheetName}`;
                    sheetsContainer.appendChild(label);
                });
            } else { sheetsContainer.innerHTML = '<p>No sheets found. Please load a file.</p>'; }
            document.getElementById('custom-test-sheets-section').style.display = 'block';
            sourceSelect.value = 'all'; document.getElementById('custom-test-timer-mode').value = 'normal'; document.getElementById('custom-test-q-count').value = '';
            updateAvailableQuestions();
        }
        function updateAvailableQuestions() {
            const source = document.getElementById('custom-test-source').value;
            const qCountInput = document.getElementById('custom-test-q-count');
            const infoP = document.getElementById('custom-test-info');
            const startBtn = document.getElementById('custom-test-setup-start-btn');
            let potentialQuestions = [];
            if (source === 'all') {
                document.getElementById('custom-test-sheets-section').style.display = 'block';
                const selectedSheets = Array.from(document.querySelectorAll('.custom-sheet-filter:checked')).map(cb => cb.value);
                if (selectedSheets.length > 0) {
                    potentialQuestions = allQuestionsData.filter(sheet => selectedSheets.includes(sheet.sheetName)).flatMap(sheet => sheet.questions.map(q => ({...q, sheetName: sheet.sheetName})));
                }
            } else {
                document.getElementById('custom-test-sheets-section').style.display = 'none';
                if (listConfigurations[source]) { potentialQuestions = listConfigurations[source].getQuestions(); }
            }
            const errorQuestions = listConfigurations.error.getQuestions().map(e => e.question);
            potentialQuestions = potentialQuestions.filter(q => !errorQuestions.includes(q.question));
            const availableCount = potentialQuestions.length;
            infoP.textContent = `Available Questions: ${availableCount}`;
            qCountInput.max = availableCount;
            const requestedCount = parseInt(qCountInput.value);
            const isQCountValid = !isNaN(requestedCount) && requestedCount > 0 && requestedCount <= availableCount;
            startBtn.disabled = !isQCountValid;
        }
        function addCustomTestSetupListeners() {
            document.getElementById('custom-test-source').addEventListener('change', updateAvailableQuestions);
            document.getElementById('custom-test-sheets-filter').addEventListener('change', (e) => { if(e.target.classList.contains('custom-sheet-filter')) { updateAvailableQuestions(); } });
            document.getElementById('custom-test-q-count').addEventListener('input', updateAvailableQuestions);
            document.getElementById('custom-test-setup-close-btn').addEventListener('click', () => showPopup('customTestSetup', false));
            document.getElementById('custom-test-setup-cancel-btn').addEventListener('click', () => showPopup('customTestSetup', false));
            document.getElementById('custom-test-setup-start-btn').addEventListener('click', () => {
                const source = document.getElementById('custom-test-source').value;
                const requestedCount = parseInt(document.getElementById('custom-test-q-count').value);
                const timerMode = document.getElementById('custom-test-timer-mode').value;
                let potentialQuestions = [];
                if (source === 'all') {
                    const selectedSheets = Array.from(document.querySelectorAll('.custom-sheet-filter:checked')).map(cb => cb.value);
                    potentialQuestions = allQuestionsData.filter(sheet => selectedSheets.includes(sheet.sheetName)).flatMap(sheet => sheet.questions.map(q => ({...q, sheetName: sheet.sheetName})));
                } else { potentialQuestions = listConfigurations[source].getQuestions(); }
                const errorQuestions = listConfigurations.error.getQuestions().map(e => e.question);
                potentialQuestions = potentialQuestions.filter(q => !errorQuestions.includes(q.question));
                const finalQuestions = shuffleArray(potentialQuestions).slice(0, requestedCount);
                showPopup('customTestSetup', false);
                startQuiz(finalQuestions, false, false, timerMode);
            });
        }
        let currentlyEditingNoteFor = null;
       
        function showNoteEditor(questionObject, listType) {
            currentlyEditingNoteFor = { question: questionObject, type: listType };
            const questionTextEl = document.getElementById('note-question-text');
            const textarea = document.getElementById('note-textarea');
            if (listType === 'handNote') { questionTextEl.textContent = "New Hand Note (Diary Entry)"; } else { questionTextEl.textContent = questionObject.question; }
            textarea.value = questionObject.note || ''; showPopup('note'); textarea.focus();
        }
        function addNoteEventListeners() {
            document.getElementById('note-popup-close-btn').addEventListener('click', () => showPopup('note', false));
            document.getElementById('note-popup-cancel-btn').addEventListener('click', () => showPopup('note', false));
            document.getElementById('note-popup-save-btn').addEventListener('click', () => {
                if (!currentlyEditingNoteFor) return;
                const { question, type } = currentlyEditingNoteFor; const newNote = document.getElementById('note-textarea').value.trim();
                if (type === 'handNote') {
                    let handNotes = JSON.parse(localStorage.getItem(`handNotes_${activeSubject}`) || '[]') || [];
                    if (question.date) { const idx = handNotes.findIndex(h => h.date === question.date && h.note === question.note); if(idx > -1) handNotes[idx].note = newNote; } 
                    else { handNotes.unshift({ note: newNote, date: new Date().toLocaleString(), type: 'handNote' }); }
                    localStorage.setItem(`handNotes_${activeSubject}`, JSON.stringify(handNotes));
                } else {
                    const updateNoteInAllSources = (originalQuestion, noteText) => {
                        allQuestionsData.forEach(sheet => { let qInSheet = sheet.questions.find(q => q.question === originalQuestion.question); if(qInSheet) { if (noteText) qInSheet.note = noteText; else delete qInSheet.note; } });
                        saveCurrentFileToMemory();
                         Object.values(listConfigurations).forEach(config => {
                            if (config.saveQuestions && config.type !== 'withNotes') {
                                let list = config.getQuestions(); let qInList = list.find(q => q.question === originalQuestion.question);
                                if(qInList) { if (noteText) qInList.note = noteText; else delete qInList.note; config.saveQuestions(list); }
                            }
                        });
                        if(rrState.originalOrder) { let qInRR = rrState.originalOrder.find(q => q.question === originalQuestion.question); if(qInRR) { if (noteText) qInRR.note = noteText; else delete qInRR.note; } }
                    };
                    updateNoteInAllSources(question, newNote);
                }
                showPopup('note', false);
                if (!pages.readRemember.classList.contains('hidden')) { renderReadRememberContent(); }
                if (!popups.library.classList.contains('hidden')) { renderLibraryContent(activeLibraryConfig, document.getElementById('library-search-input').value.toLowerCase().trim(), document.getElementById('library-sort-select').value); }
            });
        }
            // --- NEW SEARCH VARIABLES (Page 1 + Yellow Highlight) ---
        let searchResultsGlobal = [];
        let currentSearchPage = 0;
        const SEARCH_RESULTS_PER_PAGE = 20;
        let currentSearchTermGlobal = '';

       

        const debouncedUniversalSearch = debounce(term => { performUniversalSearch(term); }, 300);

              

       

       
       
       
       
       
       
       
       
       
       
       
       
       
       
       
       
        function addSmartRevisionListeners() {
            document.getElementById('smart-revision-source').addEventListener('change', updateSmartRevisionQuestions);
            document.getElementById('smart-revision-q-count').addEventListener('input', updateSmartRevisionQuestions);
            document.getElementById('smart-revision-close-btn').addEventListener('click', () => showPopup('smartRevision', false));
            document.getElementById('smart-revision-cancel-btn').addEventListener('click', () => showPopup('smartRevision', false));
            document.getElementById('smart-revision-start-btn').addEventListener('click', () => {
                const source = document.getElementById('smart-revision-source').value;
                const requestedCount = parseInt(document.getElementById('smart-revision-q-count').value);
                const potentialQuestions = getSmartRevisionQuestions(source);
                const finalQuestions = shuffleArray(potentialQuestions).slice(0, requestedCount);
                showPopup('smartRevision', false); startQuiz(finalQuestions, false, true); 
            });
        }
        function populateSmartRevisionSetup() {
            const sourceSelect = document.getElementById('smart-revision-source'); sourceSelect.value = 'mostWrong';
            document.getElementById('smart-revision-q-count').value = ''; updateSmartRevisionQuestions();
        }
                function getSmartRevisionQuestions(source) {
            const history = JSON.parse(localStorage.getItem(`testHistory_${activeSubject}`) || '[]') || [];
            
            if (source === 'marked') {
                const allMarkedQuestions = [];
                history.forEach(record => { if (record.questions && record.markedForReview) { record.questions.forEach((q, i) => { if(record.markedForReview[i]) { allMarkedQuestions.push(q); } }); } });
                let uniqueMarked = allMarkedQuestions.filter((q, index, self) => index === self.findIndex(t => t.question === q.question));
                return uniqueMarked;
            }
            if (source === 'allWrong') {
                // Fix: Use new Wrong History list
                return JSON.parse(localStorage.getItem(`myWrongHistory_${activeSubject}`) || '[]');
            }
            if (source === 'mostWrong') {
                const wrongCounts = {};
                history.forEach(record => { if (record.questions && record.userAnswers) { record.questions.forEach((q, i) => { if (record.userAnswers[i] && record.userAnswers[i] !== q.correctAnswer) { wrongCounts[q.question] = (wrongCounts[q.question] || 0) + 1; } }); } });
                const sortedWrong = Object.keys(wrongCounts).sort((a, b) => wrongCounts[b] - wrongCounts[a]);
                const allQuestions = history.flatMap(r => r.questions || []);
                let finalQs = sortedWrong.map(qText => allQuestions.find(q => q.question === qText)).filter(Boolean);
                return finalQs.filter(q => wrongCounts[q.question] > 1);
            }
            return [];
        }
        function updateSmartRevisionQuestions() {
            const source = document.getElementById('smart-revision-source').value;
            const qCountInput = document.getElementById('smart-revision-q-count');
            const infoP = document.getElementById('smart-revision-info');
            const startBtn = document.getElementById('smart-revision-start-btn');
            const potentialQuestions = getSmartRevisionQuestions(source);
            const availableCount = potentialQuestions.length;
            infoP.textContent = `Available Questions: ${availableCount}`;
            qCountInput.max = availableCount;
            const requestedCount = parseInt(qCountInput.value);
            const isQCountValid = !isNaN(requestedCount) && requestedCount > 0 && requestedCount <= availableCount;
            startBtn.disabled = !isQCountValid;
        }

        function resetQuizState() {
             currentQuiz = { questions: [], userAnswers: [], markedForReview: [], visited: [], isShuffled: false, startTime: null, elapsedSeconds: 0, countdownRemaining: null, elapsedTimer: null, countdownTimer: null, isPaused: false, currentQuestionIndex: 0, historyRecord: null, isPracticeMode: false };
             currentOptionFocusIndex = -1;
        }
        function loadDataFromStorage() {
            activeSubject = localStorage.getItem('activeSubject');
            if (activeSubject) {
                const activeFile = localStorage.getItem(`activeFile_${activeSubject}`);
                if(activeFile) {
                    const files = getSavedFiles();
                    const fileData = files[activeSubject]?.find(f => f.name === activeFile);
                    if(fileData) {
                        allQuestionsData = fileData.data;
                        updateUIAfterDataLoad(activeFile);
                        updateDashboard();
                        return;
                    }
                }
            }
            updateUIAfterDataLoad(null);
            updateDashboard();
        }
        function updateUIAfterDataLoad(fileName) {
            const mainUploadBtn = document.getElementById('upload-file-main-btn');
            if(fileName){
                mainUploadBtn.classList.remove('btn-red'); mainUploadBtn.classList.add('btn-green'); mainUploadBtn.textContent = `Loaded: ${fileName}`;
            } else {
                mainUploadBtn.classList.remove('btn-green'); mainUploadBtn.classList.add('btn-red'); mainUploadBtn.textContent = `Upload for "${activeSubject}"`;
            }
        }

       

        function clearAllAppData() {
            if (!activeSubject) {
                alert("No subject selected.");
                return;
            }

            if (confirm(`Are you sure you want to clear ONLY data for subject: "${activeSubject}"?\n\nThis will delete:\n- Uploaded Files\n- Test History\n- Saved Questions\n- Notes\n\nOther subjects will remain safe.`)) {
                
                // 1. Delete specific keys for this subject
                const keysToDelete = [
                    `activeFile_${activeSubject}`,
                    `savedQuestionsBank_${activeSubject}`,
                    `savedRRQuestions_${activeSubject}`,
                    `errorQuestions_${activeSubject}`,
                    `testHistory_${activeSubject}`,
                    `handNotes_${activeSubject}`,
                    `lastSelectedRRSheets_${activeSubject}`,
                    `activeQuizState_${activeSubject}`
                ];

                keysToDelete.forEach(key => localStorage.removeItem(key));

                // 2. Remove files from the main file list object
                let allFiles = JSON.parse(localStorage.getItem('savedFilesBySubject') || '{}');
                if (allFiles[activeSubject]) {
                    delete allFiles[activeSubject]; // Sirf is subject ki files udao
                    localStorage.setItem('savedFilesBySubject', JSON.stringify(allFiles));
                }

                // 3. Reset Variables in Memory
                allQuestionsData = []; 
                rrState = { questions: [], isShuffled: false, originalOrder: [], activeSheetNames: [] }; 
                currentQuiz = {}; 
                
                // 4. Update UI
                updateUIAfterDataLoad(null);
                updateDashboard();
                populatePreviouslyUploadedFiles(); // List refresh karo

                alert(`Data cleared successfully for "${activeSubject}".`);
                showPopup('upload', false);
            }
        }
        
       
              
       
       
       
        
        // --- Updated showRRLongPressPopup (Req 1: Toggle) ---
       

       
            // ==================================================
    //  AI SEARCH & HISTORY LOGIC (MISSING PART FIXED)
    // ==================================================

    // 1. BUTTON CLICK (Global Handler)
    window.onAiBtnClick = function(e) {
        if(e) { e.stopPropagation(); e.preventDefault(); }
        
        // Button Animation
        const btn = document.getElementById('ai-search-btn');
        if(btn) {
            btn.style.transform = "translateY(-50%) scale(0.9)";
            setTimeout(() => btn.style.transform = "translateY(-50%) scale(1)", 150);
        }

        const input = document.getElementById('universal-search-input');
        if (!input) return;

        const term = input.value.trim();
        if (term) {
            window.performAIRequest(term);
        } else {
            alert("Please type a question first!");
            input.focus();
        }
    };

    let aiConversationHistory = []; 

    // 1. BUTTON CLICK
    window.onAiBtnClick = function(e) {
        if(e) { e.stopPropagation(); e.preventDefault(); }
        
        const btn = document.getElementById('ai-search-btn');
        if(btn) {
            btn.style.transform = "translateY(-50%) scale(0.9)";
            setTimeout(() => btn.style.transform = "translateY(-50%) scale(1)", 150);
        }

        const input = document.getElementById('universal-search-input');
        if (!input) return;

        const term = input.value.trim();
        if (term) {
            aiConversationHistory = [];
            showPopup('aiResult');
            setupChatUI(term);
            performChatRequest(term);
            
            if(window.updateSearchHistory) window.updateSearchHistory(term);
        } else {
            alert("Please type a question first!");
            input.focus();
        }
    };

    // 2. SETUP UI
    function setupChatUI(initialQuestion) {
        const popupContentFull = document.querySelector('#ai-result-popup .popup-content-full');
        
        popupContentFull.innerHTML = `
            <div class="ai-chat-header">
                <div style="overflow:hidden;">
                    <h3>✨ AI Assistant</h3>
                    <div class="ai-question-preview" title="${initialQuestion}">Topic: ${initialQuestion}</div>
                </div>
                <button class="btn btn-secondary btn-sm" id="ai-popup-close-btn" style="padding: 5px 10px; font-weight:bold;">✕</button>
            </div>
            
            <div id="ai-answer-content"></div>
            
            <div class="ai-chat-footer">
                <input type="text" id="ai-followup-input" class="ai-chat-input" placeholder="Ask a follow-up question..." autocomplete="off">
                <button class="ai-send-btn" id="ai-send-btn">➤</button>
            </div>
        `;

        document.getElementById('ai-popup-close-btn').addEventListener('click', () => showPopup('aiResult', false));

        const sendBtn = document.getElementById('ai-send-btn');
        const chatInput = document.getElementById('ai-followup-input');

        const sendAction = () => {
            const val = chatInput.value.trim();
            if(val) {
                appendMessage('user', val);
                chatInput.value = '';
                performChatRequest(val);
            }
        };

        sendBtn.addEventListener('click', sendAction);
        chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendAction(); });
        
        appendMessage('user', initialQuestion);
    }

    // 3. HELPER: CREATE BUBBLE (Returns the element)
    function createBubble(sender) {
        const contentDiv = document.getElementById('ai-answer-content');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble chat-${sender}`;
        contentDiv.appendChild(bubble);
        contentDiv.scrollTop = contentDiv.scrollHeight;
        return bubble;
    }

    // 4. APPEND MESSAGE (Instant for User, Loader for AI)
    function appendMessage(sender, text) {
        const bubble = createBubble(sender);
        
        // Formatting
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/\* (.*?)(<br>|$)/g, '• $1<br>');
            
        bubble.innerHTML = formattedText;
    }

    // 5. TYPEWRITER EFFECT (The Magic Part ✨)
    async function typeWriterEffect(element, htmlContent) {
        // Regex to split HTML tags from text so tags don't get broken
        // e.g. "<b>Hello</b>" becomes ["<b>", "H", "e", "l", "l", "o", "</b>"]
        const parts = htmlContent.split(/(<[^>]*>)/g); 
        
        const contentDiv = document.getElementById('ai-answer-content');
        
        for (let part of parts) {
            if (part === "") continue;
            
            if (part.startsWith('<')) {
                // Agar HTML tag hai (<br>, <strong>), to turant add karo
                element.innerHTML += part;
            } else {
                // Agar normal text hai, to ek-ek letter type karo
                const letters = part.split('');
                for (let letter of letters) {
                    element.innerHTML += letter;
                    
                    // Auto Scroll (Smooth)
                    contentDiv.scrollTop = contentDiv.scrollHeight;
                    
                    // Typing Speed (10ms = Fast, 30ms = Slow)
                    await new Promise(r => setTimeout(r, 10)); 
                }
            }
        }
    }

    // 6. API REQUEST (With Animation)
    async function performChatRequest(newQuery) {
        // Create a temporary Loading Bubble
        const loadingBubble = createBubble('ai');
        loadingBubble.id = 'ai-loading-bubble';
        loadingBubble.innerHTML = '<span style="animation: blink 1s infinite;">Thinking...</span>';

        try {
            let promptContext = "";
            if (aiConversationHistory.length > 0) {
                const recentHistory = aiConversationHistory.slice(-3); 
                promptContext = "Previous Context:\n" + recentHistory.map(h => `Q: ${h.q}\nA: ${h.a}`).join("\n") + "\n\n";
            }
            const finalPrompt = `${promptContext}Current Question: ${newQuery}\nAnswer in simple Hinglish (Hindi+English mix) clearly. Use bullet points if needed.`;

            const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(finalPrompt)}?model=openai`);
            
            if (!response.ok) throw new Error("API Error");
            const rawText = await response.text();

            // 1. Loading Hatao
            loadingBubble.remove();

            // 2. Empty AI Bubble banao
            const aiBubble = createBubble('ai');

            // 3. Text ko format karo (Bold, Bullets, etc.)
            let formattedText = rawText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>')
                .replace(/\* (.*?)(<br>|$)/g, '• $1<br>');

            // 4. Typewriter Animation chalao
            await typeWriterEffect(aiBubble, formattedText);

            // 5. History Save
            aiConversationHistory.push({ q: newQuery, a: rawText });

        } catch (error) {
            const loadingBubble = document.getElementById('ai-loading-bubble');
            if(loadingBubble) loadingBubble.remove();
            
            // Error ko bhi animate karke dikhao
            const errorBubble = createBubble('ai');
            errorBubble.style.borderColor = '#ff5f6d';
            errorBubble.innerHTML = '<span style="color:#ff5f6d;">Network Error. Please try again.</span>';
        }
    }
    // 3. HISTORY MANAGEMENT
    window.updateSearchHistory = function(term) {
        if (!term || term.trim().length < 2) return;
        term = term.trim();
        let history = [];
        try { history = JSON.parse(localStorage.getItem(`searchHistory_${activeSubject}`) || '[]'); } catch(e){}

        history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
        history.unshift(term);
        if (history.length > 5) history = history.slice(0, 5);
        localStorage.setItem(`searchHistory_${activeSubject}`, JSON.stringify(history));
        window.renderSearchHistory();
    };

    window.renderSearchHistory = function() {
        const container = document.getElementById('search-history-container');
        if(!container) return;
        
        let history = [];
        try { history = JSON.parse(localStorage.getItem(`searchHistory_${activeSubject}`) || '[]'); } catch(e){}

        container.innerHTML = '';
        history.forEach(term => {
            const tag = document.createElement('div');
            tag.className = 'search-history-tag';
            tag.innerHTML = `<span class="history-icon">🕒</span> ${term}`;
            tag.onclick = () => {
                const input = document.getElementById('universal-search-input');
                input.value = term;
                performUniversalSearch(term); // Local Search
            };
            container.appendChild(tag);
        });
    };
    
    // Auto-load history when Search Popup opens
    document.getElementById('universal-search-btn').addEventListener('click', window.renderSearchHistory);
    const rrSearchTrig = document.getElementById('rr-universal-search-trigger');
    if(rrSearchTrig) rrSearchTrig.addEventListener('click', window.renderSearchHistory);
    
// AI Popup Close
const aiCloseBtn = document.getElementById('ai-popup-close-btn');
if(aiCloseBtn) aiCloseBtn.addEventListener('click', () => showPopup('aiResult', false));
    // Copy Answer Button
    const aiCopyBtn = document.getElementById('ai-copy-btn');
    if(aiCopyBtn) aiCopyBtn.addEventListener('click', () => {
        const text = document.getElementById('ai-answer-content').innerText;
        navigator.clipboard.writeText(text).then(() => alert('Copied!'));
    });

// Logout logic moved to js/auth.js
        
        document.addEventListener('DOMContentLoaded', initialize);
    

// User profile logic moved to js/user.js
// ================= TEST FUNCTIONALITY =================

let currentTestType = 'personal';
let questionsList = [];
let currentJoinTestId = null;
let currentDraftId = null;

// Auto Save Draft logic
async function autoSaveDraft() {
    if (!document.getElementById('create-test-modal') || document.getElementById('create-test-modal').classList.contains('hidden') || !currentTestType) {
        return;
    }
    const testData = {
        title: document.getElementById('test-title').value,
        description: document.getElementById('test-description').value,
        type: currentTestType,
        subject: document.getElementById('test-subject').value,
        duration: parseInt(document.getElementById('test-duration').value) || 30,
        maxParticipants: currentTestType === 'groupwise' ? parseInt(document.getElementById('max-participants').value) : undefined,
        questions: questionsList.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer
        }))
    };
    try {
        let result;
        if (currentDraftId) {
            result = await window.testApi.updateDraft(currentDraftId, testData);
        } else {
            result = await window.testApi.saveDraft(testData);
        }
        if (result && result.success && result.testId) {
            currentDraftId = result.testId;
            console.log('Draft auto-saved:', currentDraftId);
        }
    } catch (error) {
        console.error('Auto-save draft error:', error);
    }
}
const debouncedAutoSaveDraft = debounce(autoSaveDraft, 5000);

// API Helper
// apiCall moved to js/api/apiClient.js

// UI functions moved to js/ui.js
// Create Test Modal
function openCreateTestModal(type) {
    currentDraftId = null;
    currentTestType = type;
    document.getElementById('test-type').value = type;
    document.getElementById('modal-title').textContent = `Create ${type.charAt(0).toUpperCase() + type.slice(1)} Test`;
    
    // Show/hide max participants for groupwise
    const maxParticipantsGroup = document.getElementById('max-participants-group');
    maxParticipantsGroup.style.display = type === 'groupwise' ? 'block' : 'none';
    
    // Reset form
    document.getElementById('create-test-form').reset();
    questionsList = [];
    renderQuestionsList();
    
    openModal('create-test-modal');
}

// Add Question
function addQuestion() {
    const questionIndex = questionsList.length;
    questionsList.push({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
    });
    renderQuestionsList();
}

// Remove Question
function removeQuestion(index) {
    questionsList.splice(index, 1);
    renderQuestionsList();
}

// Render Questions List
function renderQuestionsList() {
    const container = document.getElementById('questions-list');
    container.innerHTML = questionsList.map((q, index) => `
        <div class="question-item">
            <div class="question-item-header">
                <span class="question-number">Question ${index + 1}</span>
                <div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="saveQuestionToBank(${index})" style="padding: 2px 8px; font-size: 0.8rem; margin-right: 5px;">💾 Save</button>
                    <button type="button" class="remove-question-btn" onclick="removeQuestion(${index})">Remove</button>
                </div>
            </div>
            <div class="form-group">
                <input type="text" placeholder="Enter question" value="${q.question}" 
                    onchange="updateQuestion(${index}, 'question', this.value)">
            </div>
            ${q.options.map((opt, optIndex) => `
                <div class="option-row">
                    <input type="radio" name="correct-${index}" ${q.correctAnswer === optIndex ? 'checked' : ''}
                        onchange="updateQuestion(${index}, 'correctAnswer', ${optIndex})">
                    <input type="text" placeholder="Option ${String.fromCharCode(65 + optIndex)}" value="${opt}"
                        onchange="updateQuestion(${index}, 'option', ${optIndex}, this.value)">
                </div>
            `).join('')}
        </div>
    `).join('');
}

// Question Bank Logic
let currentBankQuestions = [];

async function saveQuestionToBank(index) {
    const q = questionsList[index];
    const subject = document.getElementById('test-subject').value;
    
    if (!subject) {
        showToast('Please select a subject for the test first.', 'error');
        return;
    }
    if (!q.question.trim()) {
        showToast('Question text cannot be empty.', 'error');
        return;
    }
    if (q.options.some(opt => !opt.trim())) {
        showToast('All options must be filled before saving.', 'error');
        return;
    }
    
    const questionData = {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        subject: subject
    };
    
    try {
        const result = await window.testApi.saveToBank(questionData);
        if (result.success) {
            showToast('Question saved to bank!');
        } else {
            showToast(result.message || 'Failed to save question', 'error');
        }
    } catch (error) {
        console.error('Error saving to bank:', error);
        showToast('Failed to save question', 'error');
    }
}

async function loadBankQuestions() {
    const subject = document.getElementById('bank-subject-filter').value;
    try {
        const result = await window.testApi.getBankQuestions(subject);
        if (result.success) {
            currentBankQuestions = result.questions;
            const container = document.getElementById('bank-questions-list');
            if (currentBankQuestions.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No questions found in bank.</p>';
                return;
            }
            
            container.innerHTML = currentBankQuestions.map((q, i) => `
                <div class="question-item" style="margin-bottom: 10px;">
                    <div class="question-item-header">
                        <span style="font-weight: bold; color: var(--text-primary);">${q.subject}</span>
                        <button type="button" class="btn btn-green btn-sm" onclick="addQuestionFromBank(${i})" style="padding: 4px 8px;">+ Add to Test</button>
                    </div>
                    <div style="margin-top: 5px; color: var(--text-primary);">${q.question}</div>
                    <div style="margin-top: 5px; font-size: 0.9em; color: var(--text-secondary);">
                        ${q.options.map((opt, optIndex) => `
                            <div>${optIndex === q.correctAnswer ? '✅' : '⚪'} ${opt}</div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading bank questions:', error);
        showToast('Failed to load question bank', 'error');
    }
}

function addQuestionFromBank(index) {
    const q = currentBankQuestions[index];
    questionsList.push({
        question: q.question,
        options: [...q.options],
        correctAnswer: q.correctAnswer
    });
    renderQuestionsList();
    showToast('Question added from bank!');
    debouncedAutoSaveDraft();
}

function openQuestionBankModal() {
    openModal('question-bank-modal');
    loadBankQuestions();
}

// Update Question
function updateQuestion(index, field, value, optionIndex = null) {
    if (field === 'question') {
        questionsList[index].question = value;
    } else if (field === 'correctAnswer') {
        questionsList[index].correctAnswer = value;
    } else if (field === 'option') {
        questionsList[index].options[optionIndex] = value;
    }
}

// Create Test
async function createTest(e) {
    e.preventDefault();
    
    if (questionsList.length === 0) {
        showToast('Please add at least one question', 'error');
        return;
    }
    
    // Validate questions
    for (let i = 0; i < questionsList.length; i++) {
        const q = questionsList[i];
        if (!q.question.trim()) {
            showToast(`Question ${i + 1} is empty`, 'error');
            return;
        }
        if (q.options.some(opt => !opt.trim())) {
            showToast(`All options must be filled for Question ${i + 1}`, 'error');
            return;
        }
    }
    
    const testData = {
        title: document.getElementById('test-title').value,
        description: document.getElementById('test-description').value,
        type: currentTestType,
        subject: document.getElementById('test-subject').value,
        duration: parseInt(document.getElementById('test-duration').value),
        maxParticipants: currentTestType === 'groupwise' ? parseInt(document.getElementById('max-participants').value) : undefined,
        questions: questionsList.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer
        }))
    };
    
    try {
        let result;
        if (currentDraftId) {
            result = await window.testApi.finalizeTest(currentDraftId, testData);
        } else {
            result = await window.testApi.createTest(testData);
        }
        
        if (result.success) {
            showToast('Test created successfully!');
            if (result.test.secretCode) {
                showToast(`Secret Code: ${result.test.secretCode}`, 'success');
            }
            closeModal('create-test-modal');
            loadMyTests();
            if (currentTestType === 'public') {
                loadPublicTests();
            }
        } else {
            showToast(result.message || 'Failed to create test', 'error');
        }
    } catch (error) {
        console.error('Create test error:', error);
        showToast('Failed to create test', 'error');
    }
}

// Load Public Tests
async function loadPublicTests() {
    try {
        const result = await window.testApi.getPublicTests();
        const container = document.getElementById('public-tests-list');
        
        if (result.success && result.tests.length > 0) {
            container.innerHTML = result.tests.map(test => `
                <div class="test-item">
                    <div class="test-item-info">
                        <div class="test-item-title">${test.title}</div>
                        <div class="test-item-meta">
                            ${test.subject} • ${test.creator} • ${test.participantCount} participants • ${test.duration} min
                        </div>
                    </div>
                    <div class="test-item-actions">
                        <button class="btn btn-green" onclick="joinPublicTest('${test.id}')">Join</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">No public tests available</p>';
        }
    } catch (error) {
        console.error('Load public tests error:', error);
    }
}

// Load My Tests
async function loadMyTests() {
    try {
        const result = await window.testApi.getMyTests();
        const container = document.getElementById('my-tests-list');
        
        if (result.success && result.tests.length > 0) {
            container.innerHTML = result.tests.map(test => `
                <div class="test-item">
                    <div class="test-item-info">
                        <div class="test-item-title">${test.title}</div>
                        <div class="test-item-meta">
                            ${test.type} • ${test.subject} • ${test.participantCount}${test.maxParticipants ? '/' + test.maxParticipants : ''} participants
                            ${test.secretCode ? `<span class="secret-code-badge">${test.secretCode}</span>` : ''}
                        </div>
                    </div>
                    <div class="test-item-actions">
                        ${test.status === 'draft' ? `<button class="btn btn-green" onclick="editDraftTest('${test.id}')">Resume Draft</button>` : ''}
                        ${test.status === 'waiting' ? `<button class="btn btn-green" onclick="startTest('${test.id}')">Start</button>` : ''}
                        <button class="btn btn-secondary" onclick="viewTestDetails('${test.id}')">View</button>
                        <button class="btn btn-secondary" onclick="duplicateTest('${test.id}')">Duplicate</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">No tests created yet</p>';
        }
    } catch (error) {
        console.error('Load my tests error:', error);
    }
}

// Duplicate Test
async function duplicateTest(testId) {
    try {
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Duplicating...';
        btn.disabled = true;

        const result = await window.testApi.duplicateTest(testId);
        
        if (result.success) {
            alert('Test duplicated successfully!');
            await loadMyTests(); // Refresh the list
        } else {
            alert(result.message || 'Failed to duplicate test');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Duplicate test error:', error);
        alert('An error occurred while duplicating the test.');
        const btn = event.currentTarget;
        if (btn) {
            btn.innerHTML = 'Duplicate';
            btn.disabled = false;
        }
    }
}

// Join Public Test
async function joinPublicTest(testId) {
    try {
        const result = await apiCall(`/tests/${testId}/join`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        
        if (result.success) {
            showToast('Joined test successfully!');
            viewTestDetails(testId);
        } else {
            showToast(result.message || 'Failed to join test', 'error');
        }
    } catch (error) {
        console.error('Join test error:', error);
        showToast('Failed to join test', 'error');
    }
}

// Join Test with Code
async function joinTestWithCode() {
    const code = document.getElementById('join-test-code').value.trim().toUpperCase();
    if (!code) {
        showToast('Please enter a secret code', 'error');
        return;
    }
    
    // Find test by code - we'll need to implement this
    // For now, we'll show a message
    showToast('Searching for test...', 'success');
}

// Start Test
async function startTest(testId) {
    try {
        const result = await apiCall(`/tests/${testId}/start`, {
            method: 'POST'
        });
        
        if (result.success) {
            showToast('Test started!');
            loadMyTests();
        } else {
            showToast(result.message || 'Failed to start test', 'error');
        }
    } catch (error) {
        console.error('Start test error:', error);
        showToast('Failed to start test', 'error');
    }
}

// Resume Draft Test
async function editDraftTest(testId) {
    try {
        showToast('Loading draft...', 'info');
        const result = await apiCall(`/tests/${testId}`);
        
        if (result.success) {
            const test = result.test;
            
            currentDraftId = test.id;
            currentTestType = test.type;
            
            document.getElementById('test-type').value = test.type;
            document.getElementById('test-title').value = test.title === 'Untitled Quiz' ? '' : test.title;
            document.getElementById('test-description').value = test.description || '';
            document.getElementById('test-subject').value = test.subject || '';
            document.getElementById('test-duration').value = test.duration || 30;
            
            if (test.type === 'groupwise') {
                document.getElementById('max-participants-group').style.display = 'block';
                document.getElementById('max-participants').value = test.maxParticipants || '';
            } else {
                document.getElementById('max-participants-group').style.display = 'none';
            }
            
            questionsList = test.questions.map(q => ({
                question: q.question,
                options: [...q.options],
                correctAnswer: q.correctAnswer
            }));
            
            renderQuestionsList();
            
            document.getElementById('modal-title').textContent = `Resume ${test.type.charAt(0).toUpperCase() + test.type.slice(1)} Test`;
            openModal('create-test-modal');
        } else {
            showToast(result.message || 'Failed to load draft', 'error');
        }
    } catch (error) {
        console.error('Resume draft error:', error);
        showToast('Failed to load draft', 'error');
    }
}

// View Test Details
async function viewTestDetails(testId) {
    try {
        const result = await apiCall(`/tests/${testId}`);
        
        if (result.success) {
            const test = result.test;
            const content = document.getElementById('test-detail-content');
            content.innerHTML = `
                <div class="test-detail-header">
                    <h2>${test.title}</h2>
                    <div class="test-detail-meta">${test.subject} • ${test.duration} minutes • ${test.questions.length} questions</div>
                </div>
                
                ${test.secretCode ? `<p style="text-align: center; margin-bottom: 16px;"><span class="secret-code-badge">Code: ${test.secretCode}</span></p>` : ''}
                
                <div class="participants-list">
                    <h4 style="margin-bottom: 12px;">Participants (${test.participants.length})</h4>
                    ${test.participants.map(p => `
                        <div class="participant-row">
                            <span class="participant-name">${p.name}</span>
                            <span class="participant-status status-${p.status}">${p.status}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="modal-actions" style="margin-top: 20px;">
                    ${test.isCreator && test.status === 'waiting' ? `<button class="btn btn-green" onclick="startTest('${test.id}'); closeModal('test-detail-modal');">Start Test</button>` : ''}
                    <button class="btn btn-secondary" onclick="closeModal('test-detail-modal')">Close</button>
                </div>
            `;
            openModal('test-detail-modal');
        }
    } catch (error) {
        console.error('View test details error:', error);
        showToast('Failed to load test details', 'error');
    }
}

// Initialize Test Functionality

    // Create test buttons
    document.querySelectorAll('.create-test-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openCreateTestModal(this.dataset.type);
        });
    });
    
    // Modal close buttons
    document.getElementById('modal-close-btn').addEventListener('click', () => closeModal('create-test-modal'));
    document.getElementById('cancel-create-btn').addEventListener('click', () => closeModal('create-test-modal'));
    document.getElementById('test-detail-close').addEventListener('click', () => closeModal('test-detail-modal'));
    document.getElementById('join-modal-close').addEventListener('click', () => closeModal('join-test-modal'));
    document.getElementById('cancel-join-btn').addEventListener('click', () => closeModal('join-test-modal'));
    
    // Add question button
    document.getElementById('add-question-btn').addEventListener('click', addQuestion);
    
    // Create test form
    document.getElementById('create-test-form').addEventListener('submit', createTest);
    
    // Refresh public tests
    document.getElementById('refresh-public-tests').addEventListener('click', loadPublicTests);
    
    // Join test button
    document.getElementById('join-test-btn').addEventListener('click', joinTestWithCode);
    
    // Load initial data
    document.addEventListener('DOMContentLoaded', () => {
        loadPublicTests();
        loadMyTests();
        
        // Setup draft auto-save on input change
        const createTestModal = document.getElementById('create-test-modal');
        if (createTestModal) {
            createTestModal.addEventListener('input', debouncedAutoSaveDraft);
        }
        
        // Setup question bank listeners
        const openBankBtn = document.getElementById('open-bank-btn');
        if (openBankBtn) {
            openBankBtn.addEventListener('click', openQuestionBankModal);
        }
        const bankModalClose = document.getElementById('bank-modal-close');
        if (bankModalClose) {
            bankModalClose.addEventListener('click', () => closeModal('question-bank-modal'));
        }
        const bankSubjectFilter = document.getElementById('bank-subject-filter');
        if (bankSubjectFilter) {
            bankSubjectFilter.addEventListener('change', loadBankQuestions);
        }
    });


// --- FACADE BINDINGS (Autogenerated) ---
window.submitTest = submitTest;
window.saveSubjects = saveSubjects;
window.typeWriterEffect = typeWriterEffect;
window.openUniversalSearch = openUniversalSearch;
window.loadDataFromStorage = loadDataFromStorage;
window.selectAnswer = selectAnswer;
window.handleTouchStart = handleTouchStart;
window.exportAllData = exportAllData;
window.joinPublicTest = joinPublicTest;
window.showFilteredQuestionsPopup = showFilteredQuestionsPopup;
window.handlePauseClick = handlePauseClick;
window.getSmartRevisionQuestions = getSmartRevisionQuestions;
window.viewTestDetails = viewTestDetails;
window.editDraftTest = editDraftTest;
window.showGenericQuestionDetail = showGenericQuestionDetail;
window.populateRRSheetFilter = populateRRSheetFilter;
window.handleRRQuestionClick = handleRRQuestionClick;
window.requestWakeLock = requestWakeLock;
window.loadMyTests = loadMyTests;
window.startTimers = startTimers;
window.updateSmartRevisionQuestions = updateSmartRevisionQuestions;
window.stopTimers = stopTimers;
window.loadPublicTests = loadPublicTests;
window.showLibraryPopup = showLibraryPopup;
window.showNoteEditor = showNoteEditor;
window.setupLongPressForFont = setupLongPressForFont;
window.togglePause = togglePause;
window.addSmartRevisionListeners = addSmartRevisionListeners;
window.manageWrongHistory = manageWrongHistory;
window.getLevenshteinDistance = getLevenshteinDistance;
window.handleRRFilterChange = handleRRFilterChange;
window.renderQuestionsList = renderQuestionsList;
window.saveQuestionToBank = saveQuestionToBank;
window.addQuestionFromBank = addQuestionFromBank;
window.toggleShuffle = toggleShuffle;
window.updateNavigator = updateNavigator;
window.isFuzzyMatch = isFuzzyMatch;
window.enterLibrarySelectionMode = enterLibrarySelectionMode;
window.switchToList = switchToList;
window.updateUIAfterDataLoad = updateUIAfterDataLoad;
window.handleSelectionMouseUp = handleSelectionMouseUp;
window.fallbackCopy = fallbackCopy;
window.debounce = debounce;
window.startTest = startTest;
window.getSavedFiles = getSavedFiles;
window.openCreateTestModal = openCreateTestModal;
window.initialize = initialize;
window.resumeQuiz = resumeQuiz;
window.saveAndLoadFile = saveAndLoadFile;
window.applySettingsListeners = applySettingsListeners;
window.addCustomTestSetupListeners = addCustomTestSetupListeners;
window.handleTouchEnd = handleTouchEnd;
window.setupHoverActions = setupHoverActions;
window.startQuiz = startQuiz;
window.handleHistoryMouseDown = handleHistoryMouseDown;
window.updateQuestion = updateQuestion;
window.shuffleArray = shuffleArray;
window.showTestReview = showTestReview;
window.handleHistoryItemClick = handleHistoryItemClick;
window.startNormalTestFromRR = startNormalTestFromRR;
window.handleFabVisibility = handleFabVisibility;
window.showTestHistory = showTestHistory;
window.addEventListeners = addEventListeners;
window.saveQuizState = saveQuizState;
window.markQuestionForReview = markQuestionForReview;
window.resetQuizState = resetQuizState;
window.exitQuizToHome = exitQuizToHome;
window.startReadRemember = startReadRemember;
window.exitHistorySelectionMode = exitHistorySelectionMode;
window.updateDashboard = updateDashboard;
window.createReferences = createReferences;
window.openStartTestOptionsPopup = openStartTestOptionsPopup;
window.addNoteEventListeners = addNoteEventListeners;
window.getVisualMarkers = getVisualMarkers;
window.removeQuestion = removeQuestion;
window.handleRRMouseUp = handleRRMouseUp;
window.deleteSubject = deleteSubject;
window.handleKeyDown = handleKeyDown;
window.populateSmartRevisionSetup = populateSmartRevisionSetup;
window.saveTestToHistory = saveTestToHistory;
window.populatePreviouslyUploadedFiles = populatePreviouslyUploadedFiles;
window.updateSaveButtonUI = updateSaveButtonUI;
window.loadDataForSubject = loadDataForSubject;
window.joinTestWithCode = joinTestWithCode;
window.addUniversalSearchListeners = addUniversalSearchListeners;
window.createBubble = createBubble;
window.loadFileFromMemory = loadFileFromMemory;
window.renderLibraryContent = renderLibraryContent;
window.deleteSelectedLibraryItems = deleteSelectedLibraryItems;
window.handleRRMouseDown = handleRRMouseDown;
window.handleTestReviewClick = handleTestReviewClick;
window.addNewSubject = addNewSubject;
window.handleFileUpload = handleFileUpload;
window.saveCurrentFileToMemory = saveCurrentFileToMemory;
window.clearAllAppData = clearAllAppData;
window.toggleHistorySelection = toggleHistorySelection;
window.draw = draw;
window.showQuotePopup = showQuotePopup;
window.updateQuizNavButtons = updateQuizNavButtons;
window.getFilteredPool = getFilteredPool;
window.enterHistorySelectionMode = enterHistorySelectionMode;
window.updateShuffleButtonUI = updateShuffleButtonUI;
window.createNewHandNote = createNewHandNote;
window.selectSubject = selectSubject;
window.populateCustomTestSetup = populateCustomTestSetup;
window.performUniversalSearch = performUniversalSearch;
window.addQuestion = addQuestion;
window.deleteSelectedHistory = deleteSelectedHistory;
window.setupTheme = setupTheme;
window.renderReadRememberContent = renderReadRememberContent;
window.getAttemptedQuestionsSet = getAttemptedQuestionsSet;
window.deleteFileFromMemory = deleteFileFromMemory;
window.releaseWakeLock = releaseWakeLock;
window.setupChatUI = setupChatUI;
window.adjustFontSize = adjustFontSize;
window.discardAndStartNew = discardAndStartNew;
window.renderSearchResultsPage = renderSearchResultsPage;
window.handleRRContextMenu = handleRRContextMenu;
window.goToNextQuestion = goToNextQuestion;
window.handleHistoryContextMenu = handleHistoryContextMenu;
window.updateAvailableQuestions = updateAvailableQuestions;
window.triggerConfetti = triggerConfetti;
window.addLibraryEventListeners = addLibraryEventListeners;
window.handleTranslateClick = handleTranslateClick;
window.handleRRLongPressPopup = handleRRLongPressPopup;
window.showRRLongPressPopup = showRRLongPressPopup;
window.showSuccess = showSuccess;
window.loadSubjects = loadSubjects;
window.initializeControlCenter = initializeControlCenter;
window.toggleLibrarySelection = toggleLibrarySelection;
window.renameSubject = renameSubject;
window.importAllData = importAllData;
window.performChatRequest = performChatRequest;
window.handleStartTestClick = handleStartTestClick;
window.showQuestion = showQuestion;
window.showQuizSummary = showQuizSummary;
window.handleCopyClick = handleCopyClick;
window.exitLibrarySelectionMode = exitLibrarySelectionMode;
window.resolveReferences = resolveReferences;
window.startPracticeTestFromRR = startPracticeTestFromRR;
window.goToNextShuffledQuestion = goToNextShuffledQuestion;
window.handleSaveQuestionClick = handleSaveQuestionClick;
window.updateGFabVisibility = updateGFabVisibility;
window.removeFromAllSources = removeFromAllSources;
window.getSubjects = getSubjects;
window.appendMessage = appendMessage;
window.createTest = createTest;
window.showSubjectMenu = showSubjectMenu;
window.handleShareClick = handleShareClick;
window.setupQuizUI = setupQuizUI;
window.showViewSheetsPopup = showViewSheetsPopup;
window.loadSettings = loadSettings;
