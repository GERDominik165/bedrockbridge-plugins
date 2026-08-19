#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced RawText Fixer for LandClaim main.js
Adds additional safety layers and sanitization
"""

import re
import sys
import os
from pathlib import Path

# Fix console encoding for Windows
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    sys.stdout.reconfigure(encoding='utf-8')

class RawTextFixer:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.content = ""
        self.changes_made = 0

    def load_file(self) -> bool:
        """Load the main.js file"""
        try:
            with open(self.file_path, 'r', encoding='utf-8', errors='ignore') as f:
                self.content = f.read()
            return True
        except Exception as e:
            print(f"❌ Error loading file: {e}")
            return False

    def enhance_sendSafeMessage(self) -> str:
        """Replace sendSafeMessage with an even more robust version"""

        # New comprehensive version
        new_function = r'''function sendSafeMessage(player, message) {
    if (!player) return false;
    if (!message) return false;
    if (message === null || message === undefined) return false;

    try {
        let text = String(message).trim();

        if (!text || text.length === 0) return false;

        // === STEP 1: Remove color codes at beginning if they cause issues ===
        text = text.replace(/^§[0-9a-fk-or]\s*/, '');

        // === STEP 2: Remove ALL invalid format codes ===
        // Valid: 0-9 (colors), a-f (colors), k-o (effects), r (reset)
        const validChars = /§[0-9a-fk-or]/g;
        const allCodes = text.match(/§./g) || [];
        for (const code of allCodes) {
            // Check if this code is valid
            const isValid = validChars.test(code);
            validChars.lastIndex = 0; // Reset regex

            if (!isValid) {
                // Remove invalid code
                text = text.replace(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '$&'), 'g'), '');
            }
        }

        // === STEP 3: Normalize whitespace ===
        text = text.replace(/[\n\r\t\f\v]/g, ' ');  // Replace all whitespace
        text = text.replace(/  +/g, ' ');                // Remove extra spaces
        text = text.trim();

        // === STEP 4: Remove trailing format codes ===
        text = text.replace(/\s*§[0-9a-fk-or]\s*$/, '');
        text = text.trim();

        // === STEP 5: Ensure minimum content ===
        if (!text || text.length === 0) {
            return false;
        }

        // === STEP 6: Limit length (Minecraft chat has limits) ===
        if (text.length > 512) {
            text = text.substring(0, 509) + "...";
        }

        // === ATTEMPT 1: Send with sanitized message ===
        try {
            player.sendMessage(text);
            return true;
        } catch (error1) {
            // === ATTEMPT 2: Send without any format codes ===
            try {
                const plainText = text.replace(/§./g, '').trim();
                if (plainText && plainText.length > 0) {
                    player.sendMessage(plainText);
                    return true;
                }
            } catch (error2) {
                // === ATTEMPT 3: Send generic fallback ===
                try {
                    player.sendMessage("[System] Nachricht konnte nicht versendet werden");
                    return true;
                } catch (error3) {
                    // === ATTEMPT 4: Log and abort ===
                    console.error("[CRITICAL] sendSafeMessage failed completely");
                    return false;
                }
            }
        }
    } catch (outerError) {
        console.error("[sendSafeMessage] Fatal error: " + outerError.message);
        return false;
    }
}'''

        return new_function

    def add_message_sanitizer_utility(self) -> str:
        """Add a utility function for message sanitization"""

        utility = '''

/**
 * Sanitizes messages for safe RawText transmission
 * Removes invalid format codes and problematic characters
 * @param {string} message - Message to sanitize
 * @returns {string} Sanitized message
 */
function sanitizeMessage(message) {
    if (!message) return "";

    let text = String(message).trim();

    // Remove invalid format codes (only keep valid ones)
    text = text.replace(/§(?![0-9a-fk-or])/g, '');

    // Replace problematic whitespace
    text = text.replace(/[\\n\\r\\t\\f\\v]/g, ' ');

    // Normalize spaces
    text = text.replace(/  +/g, ' ');

    // Remove trailing codes
    text = text.replace(/§[0-9a-fk-or]\\s*$/, '');

    return text.trim();
}'''

        return utility

    def fix_config_fallbacks(self) -> int:
        """Ensure all CONFIG.ui values have proper fallbacks"""

        fallback_code = '''
// === CONFIG UI VALIDATION & FALLBACKS ===
CONFIG.ui = CONFIG.ui || {};

// Ensure all color codes are valid
const colorCodes = {
    primaryColor: "§6",
    secondaryColor: "§b",
    successColor: "§a",
    errorColor: "§c",
    warningColor: "§e",
    infoColor: "§3",
    resetCode: "§r"
};

for (const [key, defaultValue] of Object.entries(colorCodes)) {
    if (!CONFIG.ui[key] || typeof CONFIG.ui[key] !== 'string') {
        CONFIG.ui[key] = defaultValue;
    }
    // Validate format (must be § followed by valid char)
    if (!CONFIG.ui[key].match(/^§[0-9a-fk-or]$/)) {
        CONFIG.ui[key] = defaultValue;
    }
}'''

        # Find where to insert this (look for the existing CONFIG section)
        pattern = r'(const CONFIG = \{[^}]*?\};)'
        match = re.search(pattern, self.content, re.DOTALL)

        if match:
            self.content = self.content[:match.end()] + fallback_code + self.content[match.end():]
            self.changes_made += 1
            return 1
        return 0

    def add_global_error_handler(self) -> int:
        """Add a global error handler for message operations"""

        handler = '''

// === GLOBAL MESSAGE ERROR HANDLER ===
const originalLog = console.log;
const messageErrors = [];

function logMessageError(error, context) {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        error: error.message,
        context: context,
        stack: error.stack
    };
    messageErrors.push(errorInfo);

    // Only log first few errors to avoid spam
    if (messageErrors.length <= 10) {
        console.error(`[RawText Error] ${context}: ${error.message}`);
    }
}

// Expose diagnostic function
global.getRawTextErrors = function() {
    return messageErrors;
};'''

        # Insert before the main export
        if 'export' in self.content:
            export_pos = self.content.rfind('export')
            self.content = self.content[:export_pos] + handler + '\n\n' + self.content[export_pos:]
            self.changes_made += 1
            return 1
        return 0

    def apply_all_fixes(self) -> bool:
        """Apply all advanced fixes"""

        print("\n" + "="*80)
        print("🔧 ADVANCED RAWTEXT FIXER")
        print("="*80)

        print("\n1️⃣  Loading file...")
        if not self.load_file():
            return False
        print(f"   ✅ File loaded ({len(self.content)} chars)")

        print("\n2️⃣  Enhancing sendSafeMessage function...")
        # Find the function more reliably
        start_marker = 'function sendSafeMessage(player, message)'
        if start_marker in self.content:
            # Find start position
            start_pos = self.content.find(start_marker)
            # Find matching closing brace
            brace_count = 0
            in_function = False
            end_pos = start_pos

            for i in range(start_pos, len(self.content)):
                if self.content[i] == '{':
                    brace_count += 1
                    in_function = True
                elif self.content[i] == '}':
                    brace_count -= 1
                    if in_function and brace_count == 0:
                        end_pos = i + 1
                        break

            if end_pos > start_pos:
                # Replace the function
                new_func = self.enhance_sendSafeMessage()
                self.content = self.content[:start_pos] + new_func + self.content[end_pos:]
                self.changes_made += 1
                print("   ✅ sendSafeMessage function enhanced")
            else:
                print("   ⚠️  Could not find function boundaries")
        else:
            print("   ⚠️  sendSafeMessage function not found")

        print("\n3️⃣  Adding message sanitizer utility...")
        if 'function sanitizeMessage' not in self.content:
            # Find good insertion point (before first function)
            insert_pos = self.content.find('function ')
            if insert_pos != -1:
                self.content = self.content[:insert_pos] + self.add_message_sanitizer_utility() + '\n' + self.content[insert_pos:]
                self.changes_made += 1
                print("   ✅ Sanitizer utility added")
        else:
            print("   ⚠️  Sanitizer already present")

        print("\n4️⃣  Fixing CONFIG fallbacks...")
        fixed = self.fix_config_fallbacks()
        if fixed > 0:
            print("   ✅ CONFIG fallbacks enhanced")
        else:
            print("   ⚠️  CONFIG section not found")

        print("\n5️⃣  Adding global error handler...")
        if 'getRawTextErrors' not in self.content:
            self.add_global_error_handler()
            print("   ✅ Error handler added")
        else:
            print("   ⚠️  Error handler already present")

        print("\n6️⃣  Saving fixed file...")
        try:
            with open(self.file_path, 'w', encoding='utf-8') as f:
                f.write(self.content)
            print(f"   ✅ File saved")
            print(f"   📊 Changes made: {self.changes_made}")
        except Exception as e:
            print(f"   ❌ Error saving file: {e}")
            return False

        print("\n" + "="*80)
        print("✅ ADVANCED FIXES COMPLETE")
        print("="*80)
        return True

if __name__ == "__main__":
    fixer = RawTextFixer(r'D:\BB\bridgePlugins\lc\main.js')
    success = fixer.apply_all_fixes()

    if success:
        print("\n✨ The RawText system has been further hardened!")
        print("\nNext steps:")
        print("1. Test the plugin in-game")
        print("2. Monitor server logs for any RawText errors")
        print("3. Use getRawTextErrors() in console to check error history")
    else:
        print("\n❌ Fixes failed. Please check the error messages above.")
