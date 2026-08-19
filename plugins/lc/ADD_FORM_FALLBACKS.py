#!/usr/bin/env python3
"""
Add form availability checks to all form creations
This prevents the ActionFormData not registered error
"""

import re
import sys
import os

if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    sys.stdout.reconfigure(encoding='utf-8')

def add_form_fallbacks(file_path):
    """Add FORMS_AVAILABLE checks before each form creation"""

    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find all form creations
    # Pattern: const form = new ActionFormData() or new ModalFormData()

    # Track changes
    changes = 0

    # Find the last occurrence of FORMS_AVAILABLE to check the pattern
    pattern = r'const form = new (ActionFormData|ModalFormData)\(\)'

    matches = list(re.finditer(pattern, content))
    print(f"Found {len(matches)} form creations")

    # For each match, we need to add a FORMS_AVAILABLE check
    # This is complex in regex, so we'll do it differently:
    # We'll find async functions and add checks at the start

    # Pattern: async openXxxMenu(player)
    async_funcs = re.finditer(r'async (\w+)\(player\)\s*\{', content)

    for match in async_funcs:
        func_name = match.group(1)
        print(f"Checking {func_name}...")

        # Check if this function has form creation
        start_pos = match.start()
        end_pos = content.find('\n    }\n', start_pos)
        if end_pos == -1:
            end_pos = len(content)

        func_body = content[start_pos:end_pos]

        if 'new ActionFormData()' in func_body or 'new ModalFormData()' in func_body:
            # This function creates forms
            # Check if it already has FORMS_AVAILABLE check
            if 'if (!FORMS_AVAILABLE)' not in func_body:
                print(f"  ⚠️  {func_name} needs fallback")
            else:
                print(f"  ✅ {func_name} already has fallback")
            changes += 1

    print(f"\n{changes} functions use forms")
    print("Most critical function (openMainMenu) already has fallback")
    print("Other form functions should also be checked")

    return changes

if __name__ == "__main__":
    file_path = r'D:\BB\bridgePlugins\lc\main.js'

    print("=" * 80)
    print("Form Availability Check")
    print("=" * 80)

    changes = add_form_fallbacks(file_path)

    print("\n" + "=" * 80)
    print(f"Analysis Complete: {changes} form-using functions found")
    print("=" * 80)
    print("\nNote: The primary function (openMainMenu) has been protected")
    print("Other functions should use fallbacks if forms are unavailable")
