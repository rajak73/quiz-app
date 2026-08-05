 function loadSubjects() {
            const subjects = getSubjects(); const grid = document.getElementById('subject-selection-grid'); grid.innerHTML = '';
            const subjectIcons = { 'Ctara MCQ': '📚', 'IRIFM-1001': '🚆', 'Rly bd QB': '🚂' };
            subjects.forEach(subject => {
                const btn = document.createElement('button'); btn.className = 'subject-btn'; btn.dataset.subject = subject;
                const icon = subjectIcons[subject] || '📁'; btn.innerHTML = DOMPurify.sanitize(`${icon} ${subject}`);
                btn.addEventListener('click', () => selectSubject(subject));
                btn.addEventListener('contextmenu', (e) => { e.preventDefault(); showSubjectMenu(e, subject); });
                grid.appendChild(btn);
            });
            const addBtn = document.createElement('button'); addBtn.className = 'subject-btn add-new'; addBtn.textContent = '+ Add New'; addBtn.addEventListener('click', addNewSubject); grid.appendChild(addBtn);
            activeSubject = localStorage.getItem('activeSubject');
            if (activeSubject && subjects.includes(activeSubject)) { 
                selectSubject(activeSubject); 
            } else {
                loadDataFromStorage(); // Ensure data loads even if no subject selected initially (rare case)
            }
        }

 function saveSubjects(subjects) { localStorage.setItem('subjects', JSON.stringify(subjects)); }

 function selectSubject(subjectName) {
            activeSubject = subjectName; localStorage.setItem('activeSubject', subjectName);
            document.querySelectorAll('.subject-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.subject === subjectName); });
            document.getElementById('study-content-area').classList.remove('hidden'); loadDataForSubject(subjectName);
        }

 function addNewSubject() {
            const newSubjectName = prompt("Enter the name for the new subject:");
            if (newSubjectName && newSubjectName.trim() !== '') {
                const subjects = getSubjects();
                if (!subjects.includes(newSubjectName.trim())) { subjects.push(newSubjectName.trim()); saveSubjects(subjects); loadSubjects(); } else { alert('A subject with this name already exists.'); }
            }
        }

 function deleteSubject(subjectName) {
             if (confirm(`Are you absolutely sure you want to delete the subject "${subjectName}" and ALL its associated data (files, reports, library)? This action cannot be undone.`)) {
                let subjects = getSubjects(); const newSubjects = subjects.filter(s => s !== subjectName); saveSubjects(newSubjects);
                const allStorageKeys = Object.keys(localStorage);
                allStorageKeys.forEach(key => { if (key.endsWith(`_${subjectName}`)) { localStorage.removeItem(key); } });
                if (activeSubject === subjectName) { activeSubject = null; localStorage.removeItem('activeSubject'); document.getElementById('study-content-area').classList.add('hidden'); }
                loadSubjects();
            }
        }

 function renameSubject(oldName) {
            const newName = prompt(`Rename subject "${oldName}" to:`);
            if(newName && newName.trim() !== '' && oldName !== newName) {
                let subjects = getSubjects(); const index = subjects.indexOf(oldName);
                if(index > -1) {
                    subjects[index] = newName.trim(); saveSubjects(subjects);
                    const allStorageKeys = Object.keys(localStorage);
                    allStorageKeys.forEach(key => {
                        if(key.endsWith(`_${oldName}`)) {
                            const value = localStorage.getItem(key); const newKey = key.replace(`_${oldName}`, `_${newName.trim()}`);
                            localStorage.setItem(newKey, value); localStorage.removeItem(key);
                        }
                    });
                    if(activeSubject === oldName) { localStorage.setItem('activeSubject', newName.trim()); }
                    loadSubjects();
                }
            }
        }

 function getSubjects() { return JSON.parse(localStorage.getItem('subjects') || '["Ctara MCQ", "IRIFM-1001", "Rly bd QB"]'); }

 function showSubjectMenu(event, subject) {
            const action = prompt(`Actions for "${subject}":\n1. Rename\n2. Delete\nEnter option number:`);
            if(action === '1') { renameSubject(subject); } else if(action === '2') { deleteSubject(subject); }
        }

 function loadDataForSubject(subjectName) {
            const activeFile = localStorage.getItem(`activeFile_${subjectName}`);
            if(activeFile) {
                const files = getSavedFiles(); const fileData = files[activeSubject]?.find(f => f.name === activeFile);
                if(fileData) { allQuestionsData = fileData.data; updateUIAfterDataLoad(activeFile); updateDashboard(); return; }
            }
            allQuestionsData = []; updateUIAfterDataLoad(null); updateDashboard();
        }

 function saveCurrentFileToMemory() {
             const activeFile = localStorage.getItem(`activeFile_${activeSubject}`);
             if(activeFile && allQuestionsData) {
                 let filesBySubject = getSavedFiles();
                 if(filesBySubject[activeSubject]) { let file = filesBySubject[activeSubject].find(f => f.name === activeFile); if(file) { file.data = allQuestionsData; localStorage.setItem('savedFilesBySubject', JSON.stringify(filesBySubject)); } }
             }
        }

 function loadFileFromMemory(fileName) {
            const files = getSavedFiles(); const fileData = files[activeSubject]?.find(f => f.name === fileName);
            if (fileData) {
                localStorage.setItem(`activeFile_${activeSubject}`, fileName); allQuestionsData = fileData.data;
                updateUIAfterDataLoad(fileName); updateDashboard(); showPopup('upload', false); alert(`File "${fileName}" has been loaded.`);
            }
        }

 function deleteFileFromMemory(fileName) {
            if(!confirm(`Are you sure you want to delete the file "${fileName}"?`)) return;
            let filesBySubject = getSavedFiles();
            if (filesBySubject[activeSubject]) {
                filesBySubject[activeSubject] = filesBySubject[activeSubject].filter(f => f.name !== fileName);
                localStorage.setItem('savedFilesBySubject', JSON.stringify(filesBySubject));
                const activeFile = localStorage.getItem(`activeFile_${activeSubject}`);
                if (activeFile === fileName) { localStorage.removeItem(`activeFile_${activeSubject}`); allQuestionsData = []; updateUIAfterDataLoad(null); updateDashboard(); }
                populatePreviouslyUploadedFiles();
            }
        }

 function getSavedFiles() { return JSON.parse(localStorage.getItem('savedFilesBySubject') || '{}'); }

 function populatePreviouslyUploadedFiles() {
            const listEl = document.getElementById('previously-uploaded-list'); const files = getSavedFiles()[activeSubject] || [];
            listEl.innerHTML = '';
            if (files.length === 0) { listEl.innerHTML = DOMPurify.sanitize('<p>No previous files for this subject.</p>'); } 
            else {
                files.forEach(file => {
                    const item = document.createElement('div'); item.className = 'file-item';
                    item.innerHTML = DOMPurify.sanitize(`<span class="file-item-name" style="flex-grow:1;">📝 ${file.name}</span><button class="btn btn-blue btn-sm load-file-btn" style="margin-right:5px;">Load</button><button class="btn btn-red btn-sm delete-file-btn">🗑️</button>`);
                    item.querySelector('.file-item-name').addEventListener('click', () => loadFileFromMemory(file.name));
                    item.querySelector('.load-file-btn').addEventListener('click', (e) => { e.stopPropagation(); loadFileFromMemory(file.name); });
                    item.querySelector('.delete-file-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteFileFromMemory(file.name); });
                    listEl.appendChild(item);
                });
            }
        }

 function renderLibraryContent(config, searchTerm = '', sortBy = 'newest', noteFilterType = 'all') {
            const contentDiv = document.getElementById('library-content'); let questions = config.getQuestions();
            if (config.type === 'withNotes' && noteFilterType !== 'all') {
                if (noteFilterType === 'hand') { questions = questions.filter(q => q.type === 'handNote'); } 
                else if (noteFilterType === 'question') { questions = questions.filter(q => q.type !== 'handNote'); }
            }
            if (searchTerm) {
                questions = questions.filter(q => {
                    if (q.type === 'handNote') { return q.note.toLowerCase().includes(searchTerm); }
                    return q.question.toLowerCase().includes(searchTerm) || (q.note && q.note.toLowerCase().includes(searchTerm));
                });
            }
            if (sortBy === 'oldest') { questions.reverse(); }
            if (sortBy === 'chapter') { questions.sort((a, b) => (a.sheetName || '').localeCompare(b.sheetName || '')); }

            contentDiv.innerHTML = '';
            if (questions.length === 0) { contentDiv.innerHTML += DOMPurify.sanitize(`<p style="text-align: center; margin-top: 20px;">${searchTerm ? 'No matching questions found.' : config.emptyMessage}</p>`); } 
            else {
                questions.forEach((q, i) => {
                    const div = document.createElement('div');
                    if (q.type === 'handNote') {
                        div.className = 'hand-note-card'; div.dataset[config.dataAttribute] = i; 
                        div.innerHTML = DOMPurify.sanitize(`<span class="hand-note-date">📅 ${q.date}</span><div class="note-text">${q.note}</div>`);
                        div.title = "Double click to edit"; div.addEventListener('dblclick', () => showNoteEditor(q, 'handNote'));
                    } else {
                        div.className = 'qa-pair'; div.dataset[config.dataAttribute] = i; div.title = 'Double-click for details / Long-press to select';
                        
                        const markers = getVisualMarkers(q.question);
                        const sheetInfo = q.sheetName ? `<span class="library-sheet-info">(${q.sheetName})</span>` : '';

                        let html = `<p><strong>${i + 1}.</strong> ${q.question} ${markers} ${sheetInfo}</p><p class="answer-text"><strong>Answer:</strong> ${q.correctAnswer}</p>`;
                        if (q.note) { html += `<div class="question-note"><strong>My Note:</strong> ${q.note}</div>`; }
                        div.innerHTML = DOMPurify.sanitize(html);
                        div.addEventListener('dblclick', () => { if(config.type === 'withNotes') { showNoteEditor(q, 'libraryEdit'); } else { showGenericQuestionDetail(activeLibraryConfig, i); } });
                    }
                    div.addEventListener('mousedown', (e) => { if (e.button !== 2) longPressTimer = setTimeout(() => enterLibrarySelectionMode(div), 500); });
                    div.addEventListener('mouseup', handleSelectionMouseUp); div.addEventListener('mouseleave', handleSelectionMouseUp);
                    div.addEventListener('contextmenu', (e) => { e.preventDefault(); enterLibrarySelectionMode(div); });
                    div.addEventListener('click', () => { if (activeLibraryConfig && activeLibraryConfig.selectionState.isSelectionMode) toggleLibrarySelection(div); });
                    contentDiv.appendChild(div);
                });
            }
        }

 function showLibraryPopup(defaultListType = 'savedTest') { switchToList(defaultListType); showPopup('library'); }

 function addLibraryEventListeners() {
            const contentDiv = document.getElementById('library-content');
            contentDiv.addEventListener('touchstart', (e) => { libraryTouchStartX = e.changedTouches[0].screenX; }, { passive: true });
            contentDiv.addEventListener('touchend', (e) => {
                const deltaX = e.changedTouches[0].screenX - libraryTouchStartX;
                if (Math.abs(deltaX) < 50) return;
                const tabButtons = [...document.querySelectorAll('#library-tabs .library-tab-btn')];
                const currentIdx = tabButtons.findIndex(btn => btn.classList.contains('active'));
                if (deltaX < 0) { if (currentIdx < tabButtons.length - 1) { switchToList(tabButtons[currentIdx + 1].dataset.listType); } } 
                else { if (currentIdx > 0) { switchToList(tabButtons[currentIdx - 1].dataset.listType); } }
            });
            document.getElementById('library-tabs').addEventListener('click', (e) => { if (e.target.classList.contains('library-tab-btn')) { switchToList(e.target.dataset.listType); } });
            const librarySearchInput = document.getElementById('library-search-input'); const librarySortSelect = document.getElementById('library-sort-select');
            librarySearchInput.addEventListener('input', (e) => { if(activeLibraryConfig) { debouncedLibrarySearch(activeLibraryConfig, e.target.value.toLowerCase().trim(), librarySortSelect.value); } });
            librarySortSelect.addEventListener('change', (e) => { if(activeLibraryConfig) { renderLibraryContent(activeLibraryConfig, librarySearchInput.value.toLowerCase().trim(), e.target.value); } });
            document.getElementById('library-close-btn').addEventListener('click', () => { exitLibrarySelectionMode(); showPopup('library', false); });
            document.getElementById('library-cancel-selection-btn').addEventListener('click', exitLibrarySelectionMode);
            document.getElementById('library-delete-selected-btn').addEventListener('click', deleteSelectedLibraryItems);
            document.getElementById('library-clear-all-btn').addEventListener('click', () => {
                if (activeLibraryConfig && !activeLibraryConfig.selectionState.isSelectionMode) {
                     if (confirm(`Are you sure you want to clear ALL items?`)) {
                        if(activeLibraryConfig.type === 'withNotes') { localStorage.setItem(`handNotes_${activeSubject}`, '[]'); removeFromAllSources(null, true); } else { activeLibraryConfig.saveQuestions([]); }
                        renderLibraryContent(activeLibraryConfig);
                    }
                }
            });
        }

 function handleFileUpload(file) {
            if (!file) return;
            if (typeof XLSX === 'undefined') { alert('File parsing library not loaded. Please check your internet connection and try again.'); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const isCSV = file.name.toLowerCase().endsWith('.csv');
                    const workbook = XLSX.read(data, { type: isCSV ? 'string' : 'array' });
                    let parsedData = [];
                    
                    if (isCSV) {
                        let currentSheetName = "Sheet 1"; let sheetQuestions = [];
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        json.forEach((row, index) => {
                            if(index === 0) return;
                            if (row[0] && String(row[0]).trim() !== '' && row.slice(1,5).every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
                                if (sheetQuestions.length > 0) { parsedData.push({ sheetName: currentSheetName, questions: sheetQuestions }); sheetQuestions = []; }
                                currentSheetName = String(row[0]).trim();
                            } else if (row && row.length >= 5 && row.slice(0, 5).every(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
                                sheetQuestions.push({ 
                                    question: String(row[0]), 
                                    correctAnswer: String(row[1]), 
                                    incorrectAnswers: [String(row[2]), String(row[3]), String(row[4])],
                                    explanation: row[5] ? String(row[5]) : null // Capture Col F
                                });
                            }
                        });
                        if (sheetQuestions.length > 0) { parsedData.push({ sheetName: currentSheetName, questions: sheetQuestions }); }
                    } else {
                        workbook.SheetNames.forEach(sheetName => {
                            const worksheet = workbook.Sheets[sheetName];
                            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                            let sheetQuestions = [];
                            json.forEach((row, index) => {
                                if(index === 0) return;
                                if (row && row.length >= 5 && row.slice(0, 5).every(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
                                    sheetQuestions.push({ 
                                        question: String(row[0]), 
                                        correctAnswer: String(row[1]), 
                                        incorrectAnswers: [String(row[2]), String(row[3]), String(row[4])],
                                        explanation: row[5] ? String(row[5]) : null // Capture Col F
                                    });
                                }
                            });
                            if (sheetQuestions.length > 0) { parsedData.push({ sheetName: sheetName, questions: sheetQuestions }); }
                        });
                    }
                    if (parsedData.length === 0) { alert("No valid questions found in the file. Please check the format."); return; }
                    saveAndLoadFile(file.name, parsedData); showPopup('upload', false);
                } catch (err) { console.error("Error parsing file:", err); alert("Could not parse the file. Please ensure it is a valid file and is not corrupted."); }
            };
            reader.onerror = () => { alert('Could not read the file. Please check file permissions and try again.'); };
            if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file); else reader.readAsArrayBuffer(file);
        }

 function saveAndLoadFile(name, data) {
            let filesBySubject = getSavedFiles(); if (!filesBySubject[activeSubject]) { filesBySubject[activeSubject] = []; }
            let subjectFiles = filesBySubject[activeSubject];
            const existingFileIndex = subjectFiles.findIndex(f => f.name === name); if (existingFileIndex > -1) { subjectFiles.splice(existingFileIndex, 1); }
            subjectFiles.unshift({ name, data });
            if (subjectFiles.length > MAX_SAVED_FILES) { subjectFiles = subjectFiles.slice(0, MAX_SAVED_FILES); }
            filesBySubject[activeSubject] = subjectFiles;
            localStorage.setItem('savedFilesBySubject', JSON.stringify(filesBySubject));
            localStorage.setItem(`activeFile_${activeSubject}`, name);
            allQuestionsData = data; updateUIAfterDataLoad(name); updateDashboard(); alert(`File "${name}" has been loaded and saved for "${activeSubject}".`);
        }

 function toggleLibrarySelection(div) {
            const config = activeLibraryConfig; if (!config) return;
            if (div.classList.contains('selected')) { div.classList.remove('selected'); } else { div.classList.add('selected'); }
            const hasSelection = document.querySelectorAll('#library-content .selected').length > 0;
            document.getElementById('library-delete-selected-btn').disabled = !hasSelection;
        }

 function enterLibrarySelectionMode(div) {
            const config = activeLibraryConfig; if (!config || config.selectionState.isSelectionMode || !div) return;
            config.selectionState.isSelectionMode = true;
            document.getElementById('library-clear-all-btn').classList.add('hidden');
            document.getElementById('library-close-btn').classList.add('hidden');
            document.getElementById('library-cancel-selection-btn').classList.remove('hidden');
            document.getElementById('library-delete-selected-btn').classList.remove('hidden');
            toggleLibrarySelection(div);
        }

 function exitLibrarySelectionMode() {
            const config = activeLibraryConfig; if (!config || !config.selectionState.isSelectionMode) return;
            config.selectionState.isSelectionMode = false; config.selectionState.selectedIndices.clear();
            document.querySelectorAll('#library-content .selected').forEach(div => div.classList.remove('selected'));
            document.getElementById('library-clear-all-btn').classList.remove('hidden');
            document.getElementById('library-close-btn').classList.remove('hidden');
            document.getElementById('library-cancel-selection-btn').classList.add('hidden');
            document.getElementById('library-delete-selected-btn').classList.add('hidden');
        }

 function deleteSelectedLibraryItems() {
            const selectedEls = document.querySelectorAll('#library-content .selected');
            if (selectedEls.length === 0) return;
            if (confirm(`Are you sure you want to delete ${selectedEls.length} items?`)) {
                const config = activeLibraryConfig;
                if (config.type === 'withNotes') {
                    let handNotes = JSON.parse(localStorage.getItem(`handNotes_${activeSubject}`) || '[]') || [];
                    let questions = config.getQuestions(); 
                    selectedEls.forEach(el => {
                        if (el.classList.contains('hand-note-card')) {
                            const text = el.querySelector('.note-text').textContent;
                            handNotes = handNotes.filter(hn => hn.note !== text);
                        } else {
                            const qText = el.querySelector('p').textContent.split('👉')[1]?.trim() || el.querySelector('p').textContent.split('.')[1]?.trim();
                            removeFromAllSources(qText, true); 
                        }
                    });
                    localStorage.setItem(`handNotes_${activeSubject}`, JSON.stringify(handNotes));
                } else {
                     let list = config.getQuestions();
                     selectedEls.forEach(el => {
                         const qText = el.querySelector('p').textContent.split('.')[1]?.trim();
                         list = list.filter(q => q.question !== qText);
                     });
                     config.saveQuestions(list);
                }
                exitLibrarySelectionMode(); renderLibraryContent(config);
            }
        }

 function exportAllData() {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data[key] = localStorage.getItem(key);
            }
            const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const currentUserName = window.getUserName ? window.getUserName() : '';
            const nameForFile = currentUserName || 'Quiz';
            a.download = `${nameForFile}Quiz_Backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

 function importAllData(e) {
            const file = e.target.files[0];
            if (!file) return;
            if(confirm("Importing data will REPLACE your current Library, History, and Settings. Are you sure?")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        localStorage.clear();
                        Object.keys(data).forEach(key => {
                            localStorage.setItem(key, data[key]);
                        });
                        alert("Data imported successfully! App will reload.");
                        location.reload();
                    } catch (err) {
                        alert("Error importing file. Invalid JSON.");
                    }
                };
                reader.readAsText(file);
            }
            e.target.value = ''; 
        }

 function createNewHandNote() { showNoteEditor({ note: '' }, 'handNote'); }

// --- BINDINGS ---
window.loadSubjects = loadSubjects;
window.saveSubjects = saveSubjects;
window.selectSubject = selectSubject;
window.addNewSubject = addNewSubject;
window.deleteSubject = deleteSubject;
window.renameSubject = renameSubject;
window.getSubjects = getSubjects;
window.showSubjectMenu = showSubjectMenu;
window.loadDataForSubject = loadDataForSubject;
window.saveCurrentFileToMemory = saveCurrentFileToMemory;
window.loadFileFromMemory = loadFileFromMemory;
window.deleteFileFromMemory = deleteFileFromMemory;
window.getSavedFiles = getSavedFiles;
window.populatePreviouslyUploadedFiles = populatePreviouslyUploadedFiles;
window.renderLibraryContent = renderLibraryContent;
window.showLibraryPopup = showLibraryPopup;
window.addLibraryEventListeners = addLibraryEventListeners;
window.handleFileUpload = handleFileUpload;
window.saveAndLoadFile = saveAndLoadFile;
window.toggleLibrarySelection = toggleLibrarySelection;
window.enterLibrarySelectionMode = enterLibrarySelectionMode;
window.exitLibrarySelectionMode = exitLibrarySelectionMode;
window.deleteSelectedLibraryItems = deleteSelectedLibraryItems;
window.exportAllData = exportAllData;
window.importAllData = importAllData;
window.createNewHandNote = createNewHandNote;
