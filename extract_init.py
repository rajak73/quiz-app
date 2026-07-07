with open('frontend/index.html', 'r') as f:
    content = f.read()

import re

# Find the inline script inside index.html
match = re.search(r'<script>\s*(const isAuthLocal[\s\S]*?)</script>', content)
if match:
    inline_code = match.group(1)
    with open('frontend/js/init.js', 'w') as f:
        f.write(inline_code)
    # Replace the inline script with a script src
    new_content = content[:match.start()] + '<script src="js/init.js"></script>' + content[match.end():]
    with open('frontend/index.html', 'w') as f:
        f.write(new_content)
    print("Extracted init.js")
else:
    print("Could not find inline script")
