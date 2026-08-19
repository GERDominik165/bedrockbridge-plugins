# ⚡ LandClaim Premium - Quick Reference Guide

**Schnelle Übersicht für Spieler & Admins**

---

## 🎮 Spieler-Befehle

### Haupt-Commands

| Befehl | Alias | Funktion |
|--------|-------|----------|
| `/lc` | `!lc` | Hauptmenü öffnen |
| `/claim` | `!claim` | 1×1 Chunk Claim erstellen |
| `/unclaim` | `!unclaim` | Aktivsten Claim löschen |
| `/claiminfo` | `!info` | Info zu Claim anzeigen |

### Beispiele
```
/lc
→ Öffnet GUI-Menü

/claim
→ Erstellt Claim um aktuelle Position
→ Kosten: 100 Coins

/claiminfo
→ Zeigt Owner, Größe, Mitglieder
→ Funktioniert überall in der Welt

/unclaim
→ Löscht ältesten Claim
→ Gibt Kosten zurück
```

---

## 🎮 GUI-Navigation

### Hauptmenü (/lc)
```
📍 Meine Claims      → Alle deine Claims
🗺️ Karte anzeigen    → Global Claims
➕ Neuen Claim       → Assistenten öffnen
👥 Mitglieder        → Verwalten
⚙️ Einstellungen     → Optionen
```

### Claim-Details
```
✏️ Editieren         → Name/Beschreibung
👥 Mitglieder        → Hinzufügen/Entfernen
🗺️ Visualisieren     → Grenzen zeigen
⚙️ Einstellungen     → PvP, etc.
🗑️ Löschen           → Permanente Löschung
```

### Mitgliederverwaltung
```
➕ Hinzufügen        → Spieler-Name eingeben
🗑️ Entfernen         → Aus Liste wählen
👥 Liste             → Alle Mitglieder anzeigen
```

---

## 📊 Konzepte verstehen

### Was ist ein Chunk?
```
1 Chunk = 16×16 Blöcke
2×2 Chunks = 32×32 Blöcke (4 Chunks)

Beispiel Radius:
Radius 1 = 3×3 Chunks = 48×48 Blöcke (9 Chunks)
Radius 2 = 5×5 Chunks = 80×80 Blöcke (25 Chunks)
Radius 3 = 7×7 Chunks = 112×112 Blöcke (49 Chunks)

Formel: Chunks = (Radius × 2 + 1)²
```

### Dimensionen
```
🌍 Overworld (Oberwelt)
🔥 Nether (Hölle)
👾 End (Das Ende)

Jede Dimension hat eigene Claims!
```

### Berechtigungen
```
Owner:     Volle Kontrolle
Member:    Bauen, abbauen, Kisten öffnen
Ally:      Freundliche Claims
Enemy:     Gekennzeichnet
```

---

## 💰 Wirtschaft

### Kosten berechnen
```
Kosten = Chunks × costPerChunk
Beispiel: 9 Chunks × 100 = 900 Coins

Chunks = (Radius × 2 + 1)²
Beispiel Radius 1:
Chunks = (1 × 2 + 1)² = 3² = 9 Chunks
```

### Limits
```
Max Chunks pro Spieler = 50 (Standard)
Max Radius = 10 (Standard)

Spieler-Checkliste:
- 1 Claim mit 9 Chunks = 50 - 9 = 41 verbleibend
- 2 Claims mit 25 Chunks = 50 - 25 = 25 verbleibend
- 5 Claims mit 50 Chunks = 50 - 50 = 0 verbleibend (Max erreicht)
```

---

## 🛡️ Schutz

### Was ist geschützt?
```
✅ Blöcke können nicht abgebaut werden
✅ Blöcke können nicht platziert werden
✅ Explosionen richten keinen Schaden an
✅ PvP ist deaktiviert (optional)
✅ Feuer breitet sich nicht aus

❌ Owner & Members können bauen
❌ Admins können alles
```

### Ausnahmen
```
Owner:     Alle Rechte
Member:    Abhängig von Einstellungen
Gäste:     Nur Laufen, schauen
Admin:     Admin-Override
```

---

## 👥 Mitglieder & Rollen

### Owner
```
✅ Claim editieren
✅ Mitglieder verwalten
✅ Einstellungen ändern
✅ Claim löschen
✅ Claim transferieren
```

### Member
```
✅ Bauen & Abbauen (wenn erlaubt)
✅ Container öffnen (wenn erlaubt)
✅ Türen benutzen (wenn erlaubt)
❌ Claim editieren
❌ Mitglieder verwalten
❌ Claim löschen
```

### Ally
```
✅ Freundliche Claims
✅ Kooperative Gebiete
✅ Vereinbarte Rechte
```

### Enemy
```
❌ Gekennzeichnete Rivalen
❌ Spezielle Einstellungen
❌ Blockiert automatisch
```

---

## 🔧 Admin-Commands

### Admin-Panel
```
/lc admin              → Öffnet Admin-Panel
```

### Im Admin-Panel
```
📊 Statistiken         → Live-Stats anzeigen
👥 Spieler verwalten   → Claims managen
🗺️ Alle Claims         → Global überblick
🔧 System Tools        → Daten speichern/laden
📋 Logs                → Aktionen ansehen
⚠️ Notfall-Tools       → Wipe, Lock, etc.
```

### Admin-Aktionen
```
Spieler-Claims löschen      → Notfall-Tool
Claims hinzufügen           → Spieler-Menü
System sperren              → Notfall-Tool
Daten speichern             → System-Tools
Daten laden                 → System-Tools
Cache leeren                → System-Tools
```

---

## 📋 Häufige Probleme & Lösungen

### "Claim System Error"
```
Lösung:
1. Server neustarten
2. /lc admin → System Tools → Speichern
3. Cache leeren
```

### "Max Claims erreicht"
```
Lösung:
1. /unclaim → Claim löschen
2. Kleinere Claims erstellen
3. Admin kann Limit erhöhen
```

### "Keine Permission"
```
Lösung:
1. Check Owner der Claim
2. Check Mitglieder-Status
3. Admin: /lc admin → Spieler verwalten
```

### "Menu öffnet nicht"
```
Lösung:
1. Chat schließen (ESC)
2. 3 Sekunden warten
3. /lc erneut versuchen
4. Alt: /claim statt Menu
```

### "Blocks können nicht abgebaut werden"
```
Lösung:
1. /claiminfo → Check Owner
2. Check ob du Member bist
3. Check Einstellungen
4. Admin: /lc admin → Claim bearbeiten
```

---

## 🎯 Tipps & Tricks

### Best Practices
```
✅ Beschreibung aussagekräftig machen
✅ Regelmäßig Mitglieder verwalten
✅ Backups regelmäßig machen
✅ Admins informieren bei Problemen
✅ Einstellungen nach Bedarf anpassen
```

### Effizienz-Tipps
```
💡 /claim statt Menu für schnelle Claims
💡 Mitglieder für Teamwork hinzufügen
💡 Mehrere kleine Claims statt eine große
💡 Regelmäßig nicht verwendete Claims löschen
💡 Beschreibung mit Koordinaten: "Farm X: 100 Z: 200"
```

### Sicherheitstipps
```
🔒 Nur vertraute Spieler hinzufügen
🔒 Regelmäßig Mitgliederliste überprüfen
🔒 Passwort-ähnliche Beschreibungen vermeiden
🔒 Admin kontaktieren bei Verdacht auf Grief
🔒 Backups erstellen vor Massenänderungen
```

---

## 📐 Koordinaten-Cheat-Sheet

### Block zu Chunk
```
Block X / 16 = Chunk X (abrunden)
Block Z / 16 = Chunk Z (abrunden)

Beispiel: Block (240, 64, 320)
→ Chunk X = 240 / 16 = 15
→ Chunk Z = 320 / 16 = 20
→ Resultat: Chunk (15, 20)
```

### Chunk zu Block
```
Chunk X × 16 = Block X (Corner)
Chunk Z × 16 = Block Z (Corner)

Beispiel: Chunk (15, 20)
→ Block X = 15 × 16 = 240
→ Block Z = 20 × 16 = 320
→ Resultat: Block (240, Z, 320)
```

### Distanz berechnen
```
Entfernung in Chunks = √((X1-X2)² + (Z1-Z2)²)

Min. Abstand zwischen Claims = 5 Chunks (Standard)
```

---

## 🎨 Farbcodes

### Nachrichten-Farben
```
§6 = Gold       (Primär - Wichtig)
§b = Cyan       (Sekundär - Info)
§a = Grün       (Success - OK)
§c = Rot        (Error - Problem)
§e = Gelb       (Warning - Achtung)
§d = Magenta    (Info - Zusatz)
```

### Beispiel
```
§6🏰 §bLandClaim §aError: §cPermission denied
```

---

## 📱 Mobile-Tipps

### Auf Handy/Tablet
```
✅ Größere Buttons verwenden
✅ Text-Eingaben mit Keyboard
✅ Drag-Navigation nutzen
✅ Landscape-Modus für bessere Sicht
✅ Langsamer Doppelklick statt Doppeltap
```

### Performance
```
💡 Visualisierung ausschalten (große Claims)
💡 Menu statt Commands für stabileres UI
💡 Regelmäßig Logs leeren
💡 Cache leeren wenn langsam
```

---

## 🆘 Support & Hilfe

### Fehlermeldung bekommen?
```
1. Vollständige Nachricht kopieren
2. Im Admin-Panel Logs nachschauen
3. Im Discord melden
4. GitHub Issue erstellen
```

### Fragen?
```
1. README.md - Grundlagen
2. FEATURES.md - Was geht
3. INSTALLATION.md - Setup
4. Config.js - Einstellungen
5. Discord - Community
```

### Kontakt
```
📧 Discord: [Server Link]
🐙 GitHub: [Link]
📋 Issues: [GitHub Issues]
💬 Chat: [Forum]
```

---

## 🚀 Nächste Schritte

1. **Claim erstellen**: `/claim`
2. **Menü öffnen**: `/lc`
3. **Mitglieder hinzufügen**: Mitglieder-Menu
4. **Einstellungen anpassen**: Settings-Button
5. **Freunden zeigen**: `/claiminfo`

---

**Version**: 2.0.0
**Stand**: 2025-11-13
**Bedrock**: 1.21.121+

**Viel Spaß! 🏰**
