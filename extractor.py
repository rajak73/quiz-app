import os
import re

def extract_functions(source_file, target_file, func_names):
    with open(source_file, 'r') as f:
        content = f.read()

    extracted = []
    
    for func in func_names:
        # Find function def
        pattern = re.compile(r'(^|\s)function\s+' + re.escape(func) + r'\s*\(')
        match = pattern.search(content)
        if not match:
            print(f"Function {func} not found")
            continue
            
        start_idx = match.start()
        # Find the opening brace
        brace_idx = content.find('{', start_idx)
        if brace_idx == -1:
            continue
            
        # Count braces to find the end
        brace_count = 1
        curr_idx = brace_idx + 1
        while brace_count > 0 and curr_idx < len(content):
            if content[curr_idx] == '{':
                brace_count += 1
            elif content[curr_idx] == '}':
                brace_count -= 1
            curr_idx += 1
            
        func_content = content[start_idx:curr_idx]
        extracted.append(func_content)
        
        # Remove from content
        content = content[:start_idx] + content[curr_idx:]

    if extracted:
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
        # Write to target
        with open(target_file, 'w') as f:
            f.write('\n\n'.join(extracted))
            f.write('\n\n// --- BINDINGS ---\n')
            for func in func_names:
                f.write(f'window.{func} = {func};\n')
                
        # Write back to source
        with open(source_file, 'w') as f:
            f.write(content)
        print(f"Extracted {len(extracted)} functions to {target_file}")
    else:
        print(f"No functions extracted to {target_file}")

# Features
history_funcs = [
    'showTestHistory', 'handleHistoryItemClick', 'toggleHistorySelection', 'enterHistorySelectionMode',
    'exitHistorySelectionMode', 'deleteSelectedHistory', 'handleHistoryContextMenu', 'handleHistoryMouseDown',
    'handleSelectionMouseUp', 'startReadRemember', 'renderReadRememberContent', 'populateRRSheetFilter',
    'handleRRFilterChange', 'handleRRQuestionClick', 'handleRRLongPressPopup', 'showRRLongPressPopup',
    'handleRRMouseDown', 'handleRRMouseUp', 'handleRRContextMenu', 'startNormalTestFromRR', 'startPracticeTestFromRR',
    'saveTestToHistory', 'updateDashboard'
]

library_funcs = [
    'loadSubjects', 'saveSubjects', 'selectSubject', 'addNewSubject', 'deleteSubject', 'renameSubject',
    'getSubjects', 'showSubjectMenu', 'loadDataForSubject', 'saveCurrentFileToMemory', 'loadFileFromMemory',
    'deleteFileFromMemory', 'getSavedFiles', 'populatePreviouslyUploadedFiles', 'renderLibraryContent',
    'showLibraryPopup', 'addLibraryEventListeners', 'handleFileUpload', 'saveAndLoadFile', 'toggleLibrarySelection',
    'enterLibrarySelectionMode', 'exitLibrarySelectionMode', 'deleteSelectedLibraryItems', 'exportAllData',
    'importAllData', 'createNewHandNote'
]

search_funcs = [
    'performUniversalSearch', 'openUniversalSearch', 'renderSearchResultsPage', 'addUniversalSearchListeners'
]

analytics_funcs = [
    'showQuizSummary', 'showTestReview', 'handleTestReviewClick'
]

extract_functions('frontend/js/quiz/quizEngine.js', 'frontend/js/features/history.js', history_funcs)
extract_functions('frontend/js/quiz/quizEngine.js', 'frontend/js/features/library.js', library_funcs)
extract_functions('frontend/js/quiz/quizEngine.js', 'frontend/js/features/search.js', search_funcs)
extract_functions('frontend/js/analytics/results.js', 'frontend/js/analytics/results.js', analytics_funcs) # Wait, source is quizEngine

