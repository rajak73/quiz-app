 function showQuizSummary() {
            const s = { total: currentQuiz.questions.length, attempted: currentQuiz.userAnswers.filter(a => a !== null).length, visited: currentQuiz.visited.filter(v => v).length, marked: currentQuiz.markedForReview.filter(m => m).length };
            document.getElementById('summary-total').textContent = s.total; document.getElementById('summary-attempted').textContent = s.attempted;
            document.getElementById('summary-unattempted').textContent = s.total - s.attempted;
            document.getElementById('summary-skipped').textContent = s.visited - s.attempted;
            document.getElementById('summary-marked').textContent = s.marked;
            const gridContainer = document.getElementById('summary-q-grid'); gridContainer.innerHTML = '';
            currentQuiz.questions.forEach((_, i) => {
                const box = document.createElement('div'); box.className = 'q-nav-box'; box.textContent = i + 1;
                box.addEventListener('click', () => { showQuestion(i); showPopup('quizSummary', false); });
                gridContainer.appendChild(box);
            });
            updateNavigator('summary-q-grid'); showPopup('quizSummary');
        }

 function showTestReview(record) {
            currentQuiz.historyRecord = record;
            document.getElementById('review-total-q').textContent = record.total; 
            document.getElementById('review-attempted').textContent = record.attempted;
            document.getElementById('review-correct').textContent = record.correct; 
            document.getElementById('review-wrong').textContent = record.wrong;
            document.getElementById('review-net-mark').textContent = record.netMark; 
            document.getElementById('review-percent-marks').textContent = record.percentage + '%';
            if (reviewChart) { reviewChart.destroy(); }
            const ctx = document.getElementById('test-review-chart').getContext('2d');
            reviewChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Correct', 'Wrong', 'Unattempted'],
                    datasets: [{ label: 'Test Results', data: [record.correct, record.wrong, record.total - record.attempted], backgroundColor: ['rgba(76, 175, 80, 0.7)', 'rgba(244, 67, 54, 0.7)', 'rgba(158, 158, 158, 0.5)'], borderColor: ['rgba(76, 175, 80, 1)', 'rgba(244, 67, 54, 1)', 'rgba(158, 158, 158, 1)'], borderWidth: 1 }]
                },
                options: { responsive: true, plugins: { legend: { position: 'top', labels: { color: getComputedStyle(document.body).getPropertyValue('--light-text').trim() } }, title: { display: true, text: 'Test Performance Breakdown', color: getComputedStyle(document.body).getPropertyValue('--light-text').trim() } } }
            });
            showPopup('testReview');
        }

 function handleTestReviewClick(e) {
            const record = currentQuiz.historyRecord; if (!record) return;
            if (e.target.id === 'review-net-mark') { alert('Formula: Correct - (Wrong / 3)'); }
            if (e.target.id === 'review-percent-marks') { alert('Formula: (Correct / Total) * 100'); }
            if (e.target.classList.contains('clickable-result') && e.target.dataset.filter) { showFilteredQuestionsPopup(e.target.dataset.filter, record); }
            
            if (e.target.classList.contains('reattempt-btn')) {
                const type = e.target.dataset.reattempt;
                let questionsToReattempt = (type === 'all') ? record.questions : record.questions.filter((q, i) => {
                    const isA = record.userAnswers[i] !== null, isC = isA && record.userAnswers[i] === q.correctAnswer;
                    return (type === 'attempted' && isA) || (type === 'correct' && isC) || (type === 'wrong' && isA && !isC);
                });
                
                showPopup('quote', false); showPopup('testReview', false); 
                // Fix: Force 'true' for Practice Mode
                startQuiz(questionsToReattempt, record, true); 
            }
        }

// --- BINDINGS ---
window.showQuizSummary = showQuizSummary;
window.showTestReview = showTestReview;
window.handleTestReviewClick = handleTestReviewClick;
