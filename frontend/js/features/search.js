 function performUniversalSearch(term) {
            const resultsContainer = document.getElementById('universal-search-results');
            currentSearchTermGlobal = term;
            currentSearchPage = 0; // Reset page on new search

            if (!term) { 
                resultsContainer.innerHTML = DOMPurify.sanitize('<p style="text-align:center;">Start typing to see results.</p>'); 
                return; 
            }

            // 1. Gather ALL questions from ALL sheets + Library
            const allFileQs = allQuestionsData.flatMap(s => s.questions.map(q => ({...q, sheetName: s.sheetName})));
            const allLibraryQs = [ ...listConfigurations.savedTest.getQuestions(), ...listConfigurations.savedRR.getQuestions(), ...listConfigurations.error.getQuestions() ];
            const combined = [...allLibraryQs, ...allFileQs];
            
            // 2. Filter Logic (Duplicate hatane wala logic hata diya hai)
            // Ab ye 'combined' array se seedha search karega
            const lowerTerm = term.toLowerCase();
            let results = combined.filter(q => {
                const qText = q.question.toLowerCase();
                const noteText = q.note ? q.note.toLowerCase() : '';
                return qText.includes(lowerTerm) || noteText.includes(lowerTerm) || isFuzzyMatch(q.question, term);
            });

            // 3. Sorting: Exact Match Top -> Starts With -> Alphabetical
            results.sort((a, b) => {
                const aText = a.question.toLowerCase();
                const bText = b.question.toLowerCase();
                
                // Exact match check
                if (aText === lowerTerm && bText !== lowerTerm) return -1;
                if (bText === lowerTerm && aText !== lowerTerm) return 1;

                // Starts with check
                const aStarts = aText.startsWith(lowerTerm);
                const bStarts = bText.startsWith(lowerTerm);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                // Alphabetical
                return aText.localeCompare(bText);
            });

            searchResultsGlobal = results; // Store for pagination
            resultsContainer.innerHTML = ''; // Clear previous

            if (results.length === 0) { 
                resultsContainer.innerHTML = DOMPurify.sanitize('<p style="text-align:center;">No matching questions found.</p>'); 
            } else {
                renderSearchResultsPage();
            }
        }

 function openUniversalSearch() {
            const input = document.getElementById('universal-search-input'); 
            const resultsContainer = document.getElementById('universal-search-results');
            input.value = ''; 
            resultsContainer.innerHTML = DOMPurify.sanitize('<p style="text-align:center;">Start typing to see results.</p>');
            searchResultsGlobal = [];
            currentSearchPage = 0;
            currentSearchTermGlobal = '';
            showPopup('universalSearch'); 
            setTimeout(() => input.focus(), 100);
        }

 function renderSearchResultsPage() {
            const resultsContainer = document.getElementById('universal-search-results');
            
            // Remove "Next" button if it exists from previous render
            const existingNextBtn = document.getElementById('search-next-btn');
            if(existingNextBtn) existingNextBtn.remove();

            const start = currentSearchPage * SEARCH_RESULTS_PER_PAGE;
            const end = start + SEARCH_RESULTS_PER_PAGE;
            const pageResults = searchResultsGlobal.slice(start, end);

            if (pageResults.length === 0 && currentSearchPage > 0) return;

            pageResults.forEach((q, i) => {
                const globalIndex = start + i;
                const qaPair = document.createElement('div'); 
                qaPair.className = 'qa-pair'; 
                qaPair.title = 'Double-click for details';
                
                const markers = getVisualMarkers(q.question);
                const sheetInfo = q.sheetName ? `<span class="library-sheet-info">(${q.sheetName})</span>` : '';

                // HIGHLIGHT LOGIC
                // Escape special characters in search term for Regex
                const safeTerm = currentSearchTermGlobal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${safeTerm})`, 'gi');
                const highlightedQuestion = q.question.replace(regex, '<span style="background-color: yellow; color: black; font-weight: bold;">$1</span>');

                let html = `<p><strong>${globalIndex + 1}.</strong> ${highlightedQuestion} ${markers} ${sheetInfo}</p><p class="answer-text"><strong>Answer:</strong> ${q.correctAnswer}</p>`;
                if (q.note) { html += `<div class="question-note"><strong>My Note:</strong> ${q.note}</div>`; }
                
                qaPair.innerHTML = DOMPurify.sanitize(html);
                qaPair.addEventListener('dblclick', () => { showGenericQuestionDetail({ getQuestions: () => searchResultsGlobal }, globalIndex); });
                resultsContainer.appendChild(qaPair);
            });

            // Show "Next" Button if more results exist
            if (end < searchResultsGlobal.length) {
                const nextBtn = document.createElement('button');
                nextBtn.id = 'search-next-btn';
                nextBtn.className = 'btn btn-blue';
                nextBtn.style.width = '100%';
                nextBtn.style.marginTop = '10px';
                nextBtn.textContent = `Load More (${searchResultsGlobal.length - end} remaining) 👇`;
                nextBtn.onclick = () => {
                    currentSearchPage++;
                    renderSearchResultsPage();
                };
                resultsContainer.appendChild(nextBtn);
            }
        }

 function addUniversalSearchListeners() {
            const input = document.getElementById('universal-search-input');
            input.addEventListener('input', () => debouncedUniversalSearch(input.value.trim()));
            document.getElementById('universal-search-close-btn').addEventListener('click', () => showPopup('universalSearch', false));
        }

// --- BINDINGS ---
window.performUniversalSearch = performUniversalSearch;
window.openUniversalSearch = openUniversalSearch;
window.renderSearchResultsPage = renderSearchResultsPage;
window.addUniversalSearchListeners = addUniversalSearchListeners;
