# RawText Diagnostic Report

**Date:** 2025-11-13T16:32:13.957995
**File:** D:\BB\bridgePlugins\lc\main.js

## Summary

- Total Lines: 1170
- sendMessage Calls: 50
- Invalid Format Codes: 7
- Unclosed Codes: 12
- Newline Issues: 18
- Total Issues Found: 41

## Invalid Format Codes

- Line 44: `§(`
- Line 54: `§.`
- Line 170: `§[`
- Line 171: `§.`
- Line 183: `§[`
- Line 198: `§.`
- Line 228: `§(`

## Unclosed Format Codes

- Line 119: primaryColor: "§6",           // Gold
- Line 120: secondaryColor: "§b",         // Cyan
- Line 121: successColor: "§a",           // Grün
- Line 122: errorColor: "§c",             // Rot
- Line 131: if (!CONFIG.ui.primaryColor) CONFIG.ui.primaryColor = "§6";
- Line 132: if (!CONFIG.ui.secondaryColor) CONFIG.ui.secondaryColor = "§b";
- Line 133: if (!CONFIG.ui.successColor) CONFIG.ui.successColor = "§a";
- Line 134: if (!CONFIG.ui.errorColor) CONFIG.ui.errorColor = "§c";
- Line 138: primaryColor: "§6",
- Line 139: secondaryColor: "§b",
- Line 140: successColor: "§a",
- Line 141: errorColor: "§c"

## Newline Issues

- Line 586: .button("📍\nMeine Claims", "texture/ui/icons/claims")
- Line 587: .button("🗺️\nKarte anzeigen", "texture/ui/icons/map")
- Line 588: .button("➕\nNeuen Claim erstellen", "texture/ui/icons/add")
- Line 589: .button("👥\nMitglieder verwalten", "texture/ui/icons/members")
- Line 590: .button("⚙️\nEinstellungen", "texture/ui/icons/settings");
- Line 657: .button("✏️\nEditieren", "texture/ui/icons/edit")
- Line 658: .button("👥\nMitglieder", "texture/ui/icons/members")
- Line 659: .button("🗺️\nVisualisieren", "texture/ui/icons/map")
- Line 660: .button("⚙️\nEinstellungen", "texture/ui/icons/settings")
- Line 661: .button("🗑️\nLöschen", "texture/ui/icons/trash");
- Line 796: .button("➕\nMitglied hinzufügen", "texture/ui/icons/add")
- Line 797: .button("🗑️\nMitglied entfernen", "texture/ui/icons/trash");
- Line 874: .button("📍\nAlle Claims anzeigen")
- Line 875: .button("👤\nMeine Claims");
- Line 948: .button("💰\nWirtschaft", "texture/ui/icons/emerald")
- Line 949: .button("🛡️\nSchutz", "texture/ui/icons/shield")
- Line 950: .button("📊\nStatistiken", "texture/ui/icons/stats");
- Line 977: const msg = `${CONFIG.ui.primaryColor}═══ SCHUTZ ═══\n${CONFIG.ui.secondaryColor}Block-Break: ${CONFIG.protection.preventBlockBreak ? "JA" : "NEIN"}\nBlock-Place: ${CONFIG.protection.preventBlockPlace ? "JA" : "NEIN"}\nPvP-Schutz: ${CONFIG.protection.preventPvP ? "JA" : "NEIN"}\nExplosionen: ${CONFIG.protection.preventExplosion ? "JA" : "NEIN"}`;

## Verdict

⚠️  **41 ISSUES FOUND** - Review above
