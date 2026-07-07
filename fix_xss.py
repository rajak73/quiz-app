import re
import glob

# Add DOMPurify to index.html
with open('frontend/index.html', 'r') as f:
    html = f.read()
if 'dompurify' not in html.lower():
    html = html.replace('</head>', '    <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>\n</head>')
    with open('frontend/index.html', 'w') as f:
        f.write(html)

js_files = glob.glob('frontend/js/**/*.js', recursive=True)

# Function to fix innerHTML
def sanitize_js_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # We will look for .innerHTML = ... and wrap the right hand side with DOMPurify.sanitize(...)
    # It's tricky to use regex for arbitrary RHS, but we can target specific known patterns from the audit.
    # Actually, DOMPurify.sanitize is safe for string interpolation.
    
    # Simple regex for simple assignments: element.innerHTML = `...` or '...'
    # For complex ones, we might need manual regexes based on grep output.
    
    # Let's replace:  .innerHTML = (something)
    # With: .innerHTML = DOMPurify.sanitize(something)
    
    # Wait, simple regex: \.innerHTML\s*=\s*(.*?);
    # This might break if there are multiple statements on a line.
    
    # Let's do targeted replacements based on known patterns.
    # From search.js:
    content = re.sub(r'qaPair\.innerHTML\s*=\s*html;', 'qaPair.innerHTML = DOMPurify.sanitize(html);', content)
    content = re.sub(r"resultsContainer\.innerHTML = '([^']+)'", r"resultsContainer.innerHTML = DOMPurify.sanitize('\1')", content)
    
    # From library.js:
    content = re.sub(r'btn\.innerHTML\s*=\s*`([^`]+)`', r'btn.innerHTML = DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r'item\.innerHTML\s*=\s*`([^`]+)`', r'item.innerHTML = DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r'div\.innerHTML\s*=\s*`([^`]+)`', r'div.innerHTML = DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r'div\.innerHTML\s*=\s*html', r'div.innerHTML = DOMPurify.sanitize(html)', content)
    content = re.sub(r'contentDiv\.innerHTML \+= `([^`]+)`', r'contentDiv.innerHTML += DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r"listEl\.innerHTML = '([^']+)'", r"listEl.innerHTML = DOMPurify.sanitize('\1')", content)
    
    # From history.js:
    content = re.sub(r'contentDiv\.innerHTML\s*=\s*tableHtml \+ \'</tbody></table>\'', r"contentDiv.innerHTML = DOMPurify.sanitize(tableHtml + '</tbody></table>')", content)
    content = re.sub(r'pairDiv\.innerHTML\s*=\s*html', r'pairDiv.innerHTML = DOMPurify.sanitize(html)', content)
    content = re.sub(r'itemDiv\.innerHTML\s*=\s*`([^`]+)`', r'itemDiv.innerHTML = DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r'popupContentEl\.innerHTML\s*=\s*`([\s\S]*?)`', r'popupContentEl.innerHTML = DOMPurify.sanitize(`\1`)', content)
    
    # From quizEngine.js:
    content = re.sub(r'infoText\.innerHTML\s*=\s*`([^`]+)`', r'infoText.innerHTML = DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r'questionEl\.innerHTML\s*=\s*`([^`]+)`', r'questionEl.innerHTML = DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r'explanationEl\.innerHTML\s*=\s*`([^`]+)`', r'explanationEl.innerHTML = DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r'explEl\.innerHTML\s*=\s*`([^`]+)`', r'explEl.innerHTML = DOMPurify.sanitize(`\1`)', content)
    content = re.sub(r"box\.innerHTML\s*\+=\s*'([^']+)'", r"box.innerHTML += DOMPurify.sanitize('\1')", content)
    content = re.sub(r'listContainer\.innerHTML\s*=\s*html', r'listContainer.innerHTML = DOMPurify.sanitize(html)', content)
    content = re.sub(r'explContainer\.innerHTML\s*=\s*explDiv\.innerHTML', r'explContainer.innerHTML = DOMPurify.sanitize(explDiv.innerHTML)', content)
    content = re.sub(r'footer\.innerHTML\s*=\s*`([^`]+)`', r'footer.innerHTML = DOMPurify.sanitize(`\1`)', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

for js_file in js_files:
    sanitize_js_file(js_file)

print("Applied DOMPurify to JS files")
