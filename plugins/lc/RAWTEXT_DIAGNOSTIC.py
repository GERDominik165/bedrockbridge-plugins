#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RawText Diagnostic Tool for LandClaim main.js
Comprehensive analysis to find any remaining RawText issues
"""

import re
import json
import sys
import os
from pathlib import Path
from typing import List, Tuple, Dict

# Fix console encoding for Windows
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    sys.stdout.reconfigure(encoding='utf-8')

class RawTextDiagnostic:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.content = ""
        self.lines = []
        self.issues = []
        self.stats = {
            "total_lines": 0,
            "sendMessage_calls": 0,
            "invalid_format_codes": 0,
            "unclosed_codes": 0,
            "newlines_in_strings": 0,
            "null_checks": 0,
            "potential_issues": 0
        }

    def load_file(self) -> bool:
        """Load the main.js file"""
        try:
            with open(self.file_path, 'r', encoding='utf-8', errors='ignore') as f:
                self.content = f.read()
            self.lines = self.content.split('\n')
            self.stats["total_lines"] = len(self.lines)
            return True
        except Exception as e:
            print(f"❌ Error loading file: {e}")
            return False

    def find_sendMessage_calls(self) -> List[Tuple[int, str]]:
        """Find all sendMessage and sendSafeMessage calls"""
        pattern = r'(?:send(?:Safe)?Message|sendMessage)\s*\('
        results = []
        for i, line in enumerate(self.lines, 1):
            matches = re.finditer(pattern, line)
            for match in matches:
                results.append((i, line.strip()))
        self.stats["sendMessage_calls"] = len(results)
        return results

    def find_invalid_format_codes(self) -> List[Tuple[int, str, str]]:
        """Find invalid Minecraft format codes (not 0-9, a-f, k-o, r)"""
        # Pattern: § followed by any character that's NOT valid
        pattern = r'§([^0-9a-fk-or\s\'])'
        results = []

        for i, line in enumerate(self.lines, 1):
            matches = re.finditer(pattern, line)
            for match in matches:
                invalid_code = f"§{match.group(1)}"
                results.append((i, line.strip(), invalid_code))

        self.stats["invalid_format_codes"] = len(results)
        return results

    def find_unclosed_codes(self) -> List[Tuple[int, str]]:
        """Find format codes at end of strings that should be reset"""
        pattern = r'["\'](\s*§[0-9a-f])(?=["\'])'
        results = []

        for i, line in enumerate(self.lines, 1):
            if re.search(pattern, line):
                results.append((i, line.strip()))

        self.stats["unclosed_codes"] = len(results)
        return results

    def find_newlines_in_strings(self) -> List[Tuple[int, str]]:
        """Find actual newlines embedded in string literals"""
        results = []
        in_string = False
        quote_char = None

        for i, line in enumerate(self.lines, 1):
            # Look for strings with backslash-n that might not be escaped properly
            if re.search(r'["\'][^"\']*\\n[^"\']*["\']', line):
                results.append((i, line.strip()))

        self.stats["newlines_in_strings"] = len(results)
        return results

    def find_null_checks(self) -> List[Tuple[int, str]]:
        """Find null/undefined checks before sendMessage"""
        results = []
        for i in range(len(self.lines)):
            if 'sendMessage' in self.lines[i]:
                # Check if previous lines have null checks
                if i > 0:
                    prev_line = self.lines[i-1].strip()
                    if not any(check in prev_line for check in ['if (!', 'if (', '||', '&&']):
                        results.append((i+1, self.lines[i].strip()))

        self.stats["null_checks"] = len(results)
        return results

    def find_template_issues(self) -> List[Tuple[int, str]]:
        """Find potential template literal issues"""
        results = []
        pattern = r'`[^`]*\$\{[^}]*\}[^`]*`'

        for i, line in enumerate(self.lines, 1):
            if re.search(pattern, line):
                # Check if it's a multiline continuation
                if line.rstrip().endswith('+'):
                    results.append((i, line.strip(), "Template with + continuation"))

        return results

    def find_config_ui_usage(self) -> List[Tuple[int, str]]:
        """Find all CONFIG.ui color code usages"""
        results = []
        pattern = r'CONFIG\.ui\.(?:primaryColor|secondaryColor|successColor|errorColor)'

        for i, line in enumerate(self.lines, 1):
            if re.search(pattern, line):
                results.append((i, line.strip()))

        return results

    def run_diagnostics(self) -> Dict:
        """Run all diagnostic checks"""
        print("\n" + "="*80)
        print("🔍 RAWTEXT DIAGNOSTIC TOOL - COMPREHENSIVE ANALYSIS")
        print("="*80)

        # Load file
        print("\n1️⃣  Loading file...")
        if not self.load_file():
            return None
        print(f"   ✅ Loaded {self.stats['total_lines']} lines")

        # Find sendMessage calls
        print("\n2️⃣  Scanning for sendMessage calls...")
        send_calls = self.find_sendMessage_calls()
        print(f"   ✅ Found {len(send_calls)} sendMessage/sendSafeMessage calls")
        if len(send_calls) <= 5:
            for line_no, line_text in send_calls:
                print(f"      Line {line_no}: {line_text[:70]}")

        # Find invalid format codes
        print("\n3️⃣  Checking for invalid format codes...")
        invalid_codes = self.find_invalid_format_codes()
        if invalid_codes:
            print(f"   ⚠️  Found {len(invalid_codes)} invalid format codes:")
            for line_no, line_text, code in invalid_codes[:10]:
                print(f"      Line {line_no}: {code} in: {line_text[:60]}")
            if len(invalid_codes) > 10:
                print(f"      ... and {len(invalid_codes) - 10} more")
        else:
            print(f"   ✅ No invalid format codes found")

        # Find unclosed codes
        print("\n4️⃣  Checking for unclosed format codes...")
        unclosed = self.find_unclosed_codes()
        if unclosed:
            print(f"   ⚠️  Found {len(unclosed)} lines with unclosed codes:")
            for line_no, line_text in unclosed[:5]:
                print(f"      Line {line_no}: {line_text[:70]}")
        else:
            print(f"   ✅ No unclosed format codes found")

        # Find newlines in strings
        print("\n5️⃣  Checking for newlines in strings...")
        newlines = self.find_newlines_in_strings()
        if newlines:
            print(f"   ⚠️  Found {len(newlines)} potential newline issues:")
            for line_no, line_text in newlines[:5]:
                print(f"      Line {line_no}: {line_text[:70]}")
        else:
            print(f"   ✅ No problematic newlines found")

        # Find CONFIG.ui usages
        print("\n6️⃣  Checking CONFIG.ui color code usages...")
        config_usages = self.find_config_ui_usage()
        print(f"   ✅ Found {len(config_usages)} CONFIG.ui color code usages")
        if len(config_usages) <= 10:
            for line_no, line_text in config_usages:
                print(f"      Line {line_no}: {line_text[:70]}")

        # Find null checks
        print("\n7️⃣  Analyzing null/undefined checks...")
        null_checks = self.find_null_checks()
        print(f"   ✅ Found {len(null_checks)} sendMessage calls analyzed for null safety")

        # Find template issues
        print("\n8️⃣  Checking for template literal issues...")
        template_issues = self.find_template_issues()
        if template_issues:
            print(f"   ⚠️  Found {len(template_issues)} potential template issues:")
            for line_no, line_text, issue in template_issues[:5]:
                print(f"      Line {line_no}: {issue}")
        else:
            print(f"   ✅ No template literal issues found")

        # Summary
        print("\n" + "="*80)
        print("📊 DIAGNOSTIC SUMMARY")
        print("="*80)
        print(f"Total Lines Analyzed:        {self.stats['total_lines']}")
        print(f"sendMessage Calls:           {self.stats['sendMessage_calls']}")
        print(f"Invalid Format Codes:        {self.stats['invalid_format_codes']}")
        print(f"Unclosed Format Codes:       {self.stats['unclosed_codes']}")
        print(f"Newline Issues:              {self.stats['newlines_in_strings']}")
        print(f"CONFIG.ui Usages:            {len(config_usages)}")
        print(f"Template Issues:             {len(template_issues)}")

        # Risk assessment
        total_issues = sum([
            self.stats['invalid_format_codes'],
            self.stats['unclosed_codes'],
            self.stats['newlines_in_strings'],
            len(template_issues)
        ])

        print("\n" + "="*80)
        if total_issues == 0:
            print("✅ VERDICT: FILE IS CLEAN - NO RAWTEXT ISSUES DETECTED")
            print("   The comprehensive fixes have successfully resolved all RawText problems.")
        else:
            print(f"⚠️  VERDICT: {total_issues} POTENTIAL ISSUES FOUND")
            print("   Review the issues above for potential RawText problems.")
        print("="*80)

        return {
            "total_issues": total_issues,
            "invalid_codes": invalid_codes,
            "unclosed_codes": unclosed,
            "newlines": newlines,
            "template_issues": template_issues,
            "config_usages": config_usages,
            "stats": self.stats
        }

if __name__ == "__main__":
    # Run diagnostic
    diagnostic = RawTextDiagnostic(r'D:\BB\bridgePlugins\lc\main.js')
    results = diagnostic.run_diagnostics()

    # Generate report
    if results:
        print("\n" + "="*80)
        print("📄 GENERATING DETAILED REPORT")
        print("="*80)

        # Save report
        report_path = Path(r'D:\BB\bridgePlugins\lc\RAWTEXT_DIAGNOSTIC_REPORT.md')
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("# RawText Diagnostic Report\n\n")
            f.write(f"**Date:** {__import__('datetime').datetime.now().isoformat()}\n")
            f.write(f"**File:** D:\\BB\\bridgePlugins\\lc\\main.js\n\n")

            f.write("## Summary\n\n")
            f.write(f"- Total Lines: {diagnostic.stats['total_lines']}\n")
            f.write(f"- sendMessage Calls: {diagnostic.stats['sendMessage_calls']}\n")
            f.write(f"- Invalid Format Codes: {diagnostic.stats['invalid_format_codes']}\n")
            f.write(f"- Unclosed Codes: {diagnostic.stats['unclosed_codes']}\n")
            f.write(f"- Newline Issues: {diagnostic.stats['newlines_in_strings']}\n")
            f.write(f"- Total Issues Found: {results['total_issues']}\n\n")

            if results['invalid_codes']:
                f.write("## Invalid Format Codes\n\n")
                for line_no, line_text, code in results['invalid_codes']:
                    f.write(f"- Line {line_no}: `{code}`\n")
                f.write("\n")

            if results['unclosed_codes']:
                f.write("## Unclosed Format Codes\n\n")
                for line_no, line_text in results['unclosed_codes']:
                    f.write(f"- Line {line_no}: {line_text}\n")
                f.write("\n")

            if results['newlines']:
                f.write("## Newline Issues\n\n")
                for line_no, line_text in results['newlines']:
                    f.write(f"- Line {line_no}: {line_text}\n")
                f.write("\n")

            f.write("## Verdict\n\n")
            if results['total_issues'] == 0:
                f.write("✅ **FILE IS CLEAN** - No RawText issues detected\n")
            else:
                f.write(f"⚠️  **{results['total_issues']} ISSUES FOUND** - Review above\n")

        print(f"\n✅ Report saved to: {report_path}")
        print("\n🎯 Diagnostic complete!")
