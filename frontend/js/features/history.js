 function showTestHistory() {
            const history = JSON.parse(localStorage.getItem(`testHistory_${activeSubject}`) || '[]') || [];
            const contentDiv = document.getElementById('history-content');
            if (history.length === 0) { contentDiv.innerHTML = '<p>No reports found.</p>'; } 
            else {
                let tableHtml = `<table class="results-table"><thead><tr><th>Test Date</th><th>Total Qs</th><th>Net Mark</th><th>% Marks</th><th>Action</th></tr></thead><tbody>`;
                history.forEach((record, index) => { tableHtml += `<tr data-history-index="${index}"><td>${record.date}</td><td class="clickable-result">${record.total}</td><td>${record.netMark}</td><td>${record.percentage}%</td><td><button class="btn btn-blue">Review</button></td></tr>`; });
                contentDiv.innerHTML = DOMPurify.sanitize(tableHtml + '</tbody></table>');
            }
            showPopup('testHistory');
        }

 function handleHistoryItemClick(e) {
            const tr = e.target.closest('tr'); if (!tr) return;
            if (isHistorySelectionMode) { toggleHistorySelection(tr); } 
            else {
                if (e.target.tagName === 'BUTTON') {
                    const index = parseInt(tr.dataset.historyIndex); const history = JSON.parse(localStorage.getItem(`testHistory_${activeSubject}`));
                    if(history && history[index] !== undefined) { showPopup('testHistory', false); showTestReview(history[index]); }
                }
            }
        }

 function toggleHistorySelection(tr) {
            const index = parseInt(tr.dataset.historyIndex);
            if (selectedHistoryIndices.has(index)) { selectedHistoryIndices.delete(index); tr.classList.remove('selected'); } 
            else { selectedHistoryIndices.add(index); tr.classList.add('selected'); }
            document.getElementById('history-delete-selected-btn').disabled = selectedHistoryIndices.size === 0;
        }

 function enterHistorySelectionMode(tr) {
            if(isHistorySelectionMode || !tr) return;
            isHistorySelectionMode = true;
            document.getElementById('history-clear-all-btn').classList.add('hidden');
            document.getElementById('history-close-btn').classList.add('hidden');
            document.getElementById('history-cancel-selection-btn').classList.remove('hidden');
            document.getElementById('history-delete-selected-btn').classList.remove('hidden');
            toggleHistorySelection(tr);
        }

 function exitHistorySelectionMode() {
            if (!isHistorySelectionMode) return;
            isHistorySelectionMode = false; selectedHistoryIndices.clear();
            document.querySelectorAll('#history-content tr.selected').forEach(tr => tr.classList.remove('selected'));
            document.getElementById('history-clear-all-btn').classList.remove('hidden');
            document.getElementById('history-close-btn').classList.remove('hidden');
            document.getElementById('history-cancel-selection-btn').classList.add('hidden');
            document.getElementById('history-delete-selected-btn').classList.add('hidden');
        }

 function deleteSelectedHistory() {
            if (selectedHistoryIndices.size === 0) return;
            if (confirm(`Are you sure you want to delete ${selectedHistoryIndices.size} selected reports?`)) {
                let history = JSON.parse(localStorage.getItem(`testHistory_${activeSubject}`) || '[]') || [];
                const newHistory = history.filter((_, index) => !selectedHistoryIndices.has(index));
                localStorage.setItem(`testHistory_${activeSubject}`, JSON.stringify(newHistory));
                exitHistorySelectionMode(); showTestHistory(); updateDashboard();
            }
        }

 function handleHistoryContextMenu(e) { e.preventDefault(); enterHistorySelectionMode(e.target.closest('tr')); }

 function handleHistoryMouseDown(e) { if (e.button !== 2) { longPressTimer = setTimeout(() => enterHistorySelectionMode(e.target.closest('tr')), 500); }}

 function handleSelectionMouseUp() { clearTimeout(longPressTimer); }

 function startReadRemember() {
            if (allQuestionsData.length === 0) { alert('Please load a file first.'); return; }
            
            rrState.originalOrder = allQuestionsData.flatMap((sheet, i) => sheet.questions.map(q => ({...q, sheetName: sheet.sheetName, sheetIndex: i })));
            if (!rrState.originalOrder.length) { alert('The loaded file contains no questions.'); return; }
            
            rrState.questions = [...rrState.originalOrder]; 
            rrState.isShuffled = false;
            document.getElementById('rr-shuffle-toggle').checked = false;
            
            // Memory: Load Last Selected Sheets or Default to 1st
            const allSheetNames = allQuestionsData.map(sheet => sheet.sheetName);
            const lastSelected = JSON.parse(localStorage.getItem(`lastSelectedRRSheets_${activeSubject}`) || '[]');
            
            const validLastSelected = lastSelected.filter(name => allSheetNames.includes(name));

            if (validLastSelected.length > 0) {
                rrState.activeSheetNames = validLastSelected;
            } else {
                rrState.activeSheetNames = [allSheetNames[0]];
            }

            renderReadRememberContent(); 
            populateRRSheetFilter(allSheetNames); 
            
            document.getElementById('rr-view-sheet-toggle').checked = false;
            document.getElementById('read-remember-content').classList.remove('show-sheet-tags');

            showPage('readRemember');
                        // Ensure FAB is visible immediately when page opens
            setTimeout(() => {
                document.getElementById('fab').classList.add('visible');
            }, 100);
        }

 function renderReadRememberContent() {
            const contentDiv = document.getElementById('read-remember-content'); contentDiv.innerHTML = '';
            
            let displayQuestions = (rrState.isShuffled ? rrState.questions : rrState.originalOrder).filter(q => rrState.activeSheetNames.includes(q.sheetName));
            
            if (displayQuestions.length === 0) { contentDiv.innerHTML = '<p>No questions to display based on current filters.</p>'; return; }
            
            displayQuestions.forEach((q, index) => {
                const pairDiv = document.createElement('div'); pairDiv.className = 'qa-pair';
                pairDiv.dataset.questionIndex = index;
                pairDiv.title = 'Double-click to see options / Long-press for actions';
                
                const markers = getVisualMarkers(q.question);
                const sheetTag = `<span class="sheet-name-tag">${q.sheetName}</span>`;

                let html = `<p><strong>${index + 1} 👉</strong> ${q.question} ${markers} ${sheetTag}</p><p class="answer-text"><strong>Answer:</strong> ${q.correctAnswer}</p>`;
                
                const originalQuestion = rrState.originalOrder.find(oq => oq.question === q.question);
                if (originalQuestion && originalQuestion.note) { html += `<div class="question-note"><strong>My Note:</strong> ${originalQuestion.note}</div>`; }
                
                pairDiv.innerHTML = DOMPurify.sanitize(html);
                contentDiv.appendChild(pairDiv);
            });
        }

 function populateRRSheetFilter(sheetNames) {
            const filterList = document.getElementById('rr-sheet-filter-list'); 
            filterList.innerHTML = '<div style="margin-bottom: 10px; font-weight: bold;">Filter by Sheet:</div>';
            sheetNames.forEach(name => {
                const itemDiv = document.createElement('div'); itemDiv.className = 'filter-item';
                const isChecked = rrState.activeSheetNames.includes(name);
                itemDiv.innerHTML = DOMPurify.sanitize(`<span>${name}</span><label class="toggle-switch"><input type="checkbox" class="rr-sheet-filter-cb" data-sheet-name="${name}" ${isChecked ? 'checked' : ''}><span class="slider"></span></label>`);
                filterList.appendChild(itemDiv);
            });
            document.querySelectorAll('.rr-sheet-filter-cb').forEach(cb => cb.addEventListener('change', handleRRFilterChange));
        }

 function handleRRFilterChange(e) {
            const sheetName = e.target.dataset.sheetName; const isChecked = e.target.checked;
            if (!isChecked && rrState.activeSheetNames.length === 1 && rrState.activeSheetNames.includes(sheetName)) { alert('At least one sheet must be selected.'); e.target.checked = true; return; }
            
            if (isChecked) rrState.activeSheetNames.push(sheetName); else rrState.activeSheetNames = rrState.activeSheetNames.filter(name => name !== sheetName);
            
            localStorage.setItem(`lastSelectedRRSheets_${activeSubject}`, JSON.stringify(rrState.activeSheetNames));

            renderReadRememberContent();
        }

 function handleRRQuestionClick(e) {
            if (e.target.closest('.popup-content')) return;
            const qaPair = e.target.closest('.qa-pair');
            if (!qaPair) return;
            
            const index = parseInt(qaPair.dataset.questionIndex);
            const sourceArray = (rrState.isShuffled ? rrState.questions : rrState.originalOrder).filter(q => rrState.activeSheetNames.includes(q.sheetName));
            const q = sourceArray[index];
            if (!q) return;
            
            const allOptions = shuffleArray([q.correctAnswer, ...q.incorrectAnswers]);
            let optionsHtml = '';
            allOptions.forEach((opt, i) => {
                const isCorrect = opt === q.correctAnswer;
                const highlightClass = isCorrect ? 'correct-answer-highlight' : '';
                optionsHtml += `<div class="option ${highlightClass}">${String.fromCharCode(65 + i)}. ${opt}</div>`;
            });

            // --- ADDED EXPLANATION LOGIC (Yellow Box) ---
            let explHtml = '';
            if (q.explanation) {
                explHtml = `<div class="translate-expl-box"><strong>Explanation:</strong><br>${q.explanation}</div>`;
            }

            const popupContentEl = document.getElementById('simple-popup-content');
            popupContentEl.innerHTML = DOMPurify.sanitize(`
                <span class="popup-close-btn" onclick="document.getElementById('simple-popup').classList.add('hidden')">&times;</span>
                <div class="question-text">${q.question}</div>
                <div class="quiz-options">${optionsHtml}</div>
                ${explHtml}
            `);
            showPopup('simple');
        }

 function handleRRLongPressPopup(qaPair) {
             // Keep existing logic for context menu
             handleRRContextMenu({ preventDefault: () => {}, target: qaPair });
        }

 function showRRLongPressPopup(qaPair) {
            const index = parseInt(qaPair.dataset.questionIndex);
            const sourceArray = (rrState.isShuffled ? rrState.questions : rrState.originalOrder);
            const q = sourceArray.filter(q => rrState.activeSheetNames.includes(q.sheetName))[index];
            if (!q) return;

            // Check status for button text
            const savedList = listConfigurations.savedRR.getQuestions();
            const isSaved = savedList.some(sq => sq.question === q.question);
            const saveBtnText = isSaved ? "Remove from Library ❌" : "Save to Library 🏛️";

            const errorList = listConfigurations.error.getQuestions();
            const isError = errorList.some(eq => eq.question === q.question);
            const errorBtnText = isError ? "Unmark Error ✅" : "Mark as Error ❌";

            const popupContentEl = document.getElementById('simple-popup-content');
            popupContentEl.innerHTML = DOMPurify.sanitize(`
                <span class="popup-close-btn" onclick="document.getElementById('simple-popup').classList.add('hidden')">&times;</span>
                <h4 style="margin-bottom: 15px;">Question Action</h4>
                <p style="font-size: 0.9rem; text-align: left; margin-bottom: 20px; color: var(--light-text); max-height: 100px; overflow-y: auto;">${q.question}</p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn btn-blue" id="rr-popup-save-btn">${saveBtnText}</button>
                    <button class="btn btn-red" id="rr-popup-error-btn">${errorBtnText}</button>
                    <button class="btn btn-yellow" id="rr-popup-note-btn">Add/Edit Note 📝</button>
                    <button class="btn btn-action" id="rr-popup-ai-btn">Ask AI 🔍</button>
                </div>
                 <div class="popup-footer" style="justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="document.getElementById('simple-popup').classList.add('hidden')">Close</button>
                </div>
            `);
            
            // Requirement 1: Toggle Logic for Save
            document.getElementById('rr-popup-save-btn').onclick = () => {
                let saved = listConfigurations.savedRR.getQuestions();
                const existingIndex = saved.findIndex(sq => sq.question === q.question);
                
                if (existingIndex > -1) {
                    saved.splice(existingIndex, 1); // Remove
                    listConfigurations.savedRR.saveQuestions(saved);
                    alert('Question removed from QR list.');
                } else {
                    saved.push(q); // Add
                    listConfigurations.savedRR.saveQuestions(saved);
                    alert('Question saved to QR list.');
                }
                renderReadRememberContent(); // Update UI (Stars)
                showPopup('simple', false);
            };

            // Requirement 1: Toggle Logic for Error
            document.getElementById('rr-popup-error-btn').onclick = () => {
                let errors = listConfigurations.error.getQuestions();
                const existingIndex = errors.findIndex(eq => eq.question === q.question);
                
                if (existingIndex > -1) {
                    errors.splice(existingIndex, 1); // Remove
                    listConfigurations.error.saveQuestions(errors);
                    alert('Question removed from Error list.');
                } else {
                    errors.push(q); // Add
                    listConfigurations.error.saveQuestions(errors);
                    alert('Question marked as error.');
                }
                renderReadRememberContent(); // Update UI (Cross logo)
                showPopup('simple', false);
            };

            document.getElementById('rr-popup-note-btn').onclick = () => {
                const originalQuestion = rrState.originalOrder.find(oq => oq.question === q.question);
                if (originalQuestion) { showNoteEditor(originalQuestion, 'rr'); }
                showPopup('simple', false);
            };
            document.getElementById('rr-popup-ai-btn').onclick = () => { 
                askAI(q.question, [q.correctAnswer, ...q.incorrectAnswers]); 
            };
            showPopup('simple');
        }

 function handleRRMouseDown(e) {
            if (e.target.closest('#translate-icon') || e.target.closest('.copy-icon')) return;
            if (e.button !== 2) {
                const qaPair = e.target.closest('.qa-pair');
                if (!qaPair) return;
                rrLongPressTimer = setTimeout(() => { showRRLongPressPopup(qaPair); }, 500); 
            }
        }

 function handleRRMouseUp() { clearTimeout(rrLongPressTimer); }

 function handleRRContextMenu(e) {
            e.preventDefault();
            const qaPair = e.target.closest('.qa-pair');
            if (!qaPair) return;
            showRRLongPressPopup(qaPair);
        }

 function startNormalTestFromRR() { openStartTestOptionsPopup(false); }

 function startPracticeTestFromRR() { openStartTestOptionsPopup(true); }

 function saveTestToHistory(record) { 
            let history = JSON.parse(localStorage.getItem(`testHistory_${activeSubject}`) || '[]') || []; 
            history.unshift(record); 
            
            // Keep max 50 items
            if (history.length > 50) {
                history.pop(); 
            }

            localStorage.setItem(`testHistory_${activeSubject}`, JSON.stringify(history)); 
        }

 function updateDashboard() {
            const history = JSON.parse(localStorage.getItem(`testHistory_${activeSubject}`) || '[]') || [];
            const totalTests = history.length;
            let avgScore = 0;
            if (totalTests > 0) {
                const totalPercent = history.reduce((sum, r) => sum + parseFloat(r.percentage), 0);
                avgScore = (totalPercent / totalTests).toFixed(1);
            }
            let totalQs = 0;
            let allQuestionsSet = new Set();
            if (allQuestionsData && allQuestionsData.length > 0) {
                allQuestionsData.forEach(sheet => { sheet.questions.forEach(q => allQuestionsSet.add(q.question)); });
                totalQs = allQuestionsSet.size;
            }
            document.getElementById('stat-total-tests').textContent = totalTests;
            document.getElementById('stat-avg-score').textContent = avgScore + '%';
            // Updated: "Total Qs" label to match HTML change
            document.getElementById('stat-total-qs').textContent = totalQs;
            let attemptedUniqueQs = new Set();
            history.forEach(record => {
                if(record.questions && record.userAnswers) {
                    record.questions.forEach((q, i) => { if(record.userAnswers[i] !== null) attemptedUniqueQs.add(q.question); });
                }
            });
            const coveredCount = attemptedUniqueQs.size;
            const percentCovered = totalQs > 0 ? ((coveredCount / totalQs) * 100).toFixed(1) : 0;
            const progressBar = document.getElementById('dashboard-progress-bar');
            const progressText = document.getElementById('dashboard-progress-text');
            if(progressBar && progressText) {
                progressBar.style.width = `${percentCovered}%`;
                progressText.textContent = `${percentCovered}% Syllabus Covered (${coveredCount}/${totalQs})`;
            }
        }

// --- BINDINGS ---
window.showTestHistory = showTestHistory;
window.handleHistoryItemClick = handleHistoryItemClick;
window.toggleHistorySelection = toggleHistorySelection;
window.enterHistorySelectionMode = enterHistorySelectionMode;
window.exitHistorySelectionMode = exitHistorySelectionMode;
window.deleteSelectedHistory = deleteSelectedHistory;
window.handleHistoryContextMenu = handleHistoryContextMenu;
window.handleHistoryMouseDown = handleHistoryMouseDown;
window.handleSelectionMouseUp = handleSelectionMouseUp;
window.startReadRemember = startReadRemember;
window.renderReadRememberContent = renderReadRememberContent;
window.populateRRSheetFilter = populateRRSheetFilter;
window.handleRRFilterChange = handleRRFilterChange;
window.handleRRQuestionClick = handleRRQuestionClick;
window.handleRRLongPressPopup = handleRRLongPressPopup;
window.showRRLongPressPopup = showRRLongPressPopup;
window.handleRRMouseDown = handleRRMouseDown;
window.handleRRMouseUp = handleRRMouseUp;
window.handleRRContextMenu = handleRRContextMenu;
window.startNormalTestFromRR = startNormalTestFromRR;
window.startPracticeTestFromRR = startPracticeTestFromRR;
window.saveTestToHistory = saveTestToHistory;
window.updateDashboard = updateDashboard;
