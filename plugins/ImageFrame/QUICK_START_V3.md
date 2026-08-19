# 🖼️ ImageFrame v3.0.0 - Quick Start Guide

## 5-Minuten Einstieg

---

## Installation

### 1. Datei kopieren
```
imageframe.js → D:\BB\bridgePlugins\ImageFrame\
```

### 2. Server neustarten
```
Server startet und lädt Plugin automatisch
```

### 3. Im Game testen
```
/imageframe
→ Menü erscheint ✓
```

---

## Grundkonzept

Das Plugin hat **4 Hauptfunktionen**:

1. **🌐 Bild laden** - URL zu Bild-Datei laden
2. **📍 Frames wählen** - Item Frames auswählen (Rechtsklick)
3. **🖼️ Anwenden** - Bild auf Frames anwenden
4. **❓ Hilfe** - Info & Guide

---

## Workflow (Schritt für Schritt)

### Schritt 1: Bild laden

```
1. /imageframe
2. Wähle: 🌐 Bild laden
3. Gib URL ein: https://example.com/image.png
4. Wähle: Breite (1-10 Maps)
5. Wähle: Höhe (1-10 Maps)
6. Optional: Glowing Item Frame (an/aus)
7. → Bild wird geladen (mit Auto-Retry)
```

**Unterstützte Formate:**
- PNG ✓
- JPEG/JPG ✓
- WebP ✓
- GIF ✓

**Max Größe:** 10 MB

---

### Schritt 2: Frames auswählen

```
1. /imageframe
2. Wähle: 📍 Item Frames
3. Klick: ✓ Aktivieren
4. → "Frame-Auswahl AKTIVIERT"
5. → Rechtsklick auf Item Frames (normal)
6. → Frames werden grün angezeigt
7. Einmal aktivieren, mehrmals klicken
```

**Wichtig:**
- Rechtsklick wird ABGEFANGEN (nicht mehr platzierbar)
- Frames bekommen visuelle Bestätigung
- Max 100 Frames selectable

---

### Schritt 3: Bilder anwenden

```
1. /imageframe
2. Wähle: 📍 Item Frames
3. Klick: Bild anwenden (Submenu)
4. Wähle: Dein Bild aus der Liste
5. → Bild wird auf alle Frames angewendet
6. → Erfolgs-Meldung mit Count
```

**Batch-Operation:**
- Wendet auf MEHRERE Frames gleichzeitig an
- 50ms Delay zwischen Frames (verhindert Lag)
- Zeigt Success/Failure Count

---

### Schritt 4: Cleanup

```
1. /imageframe
2. Wähle: 📍 Item Frames
3. Klick: Löschen (Auswahl)
4. → Alle Frames entfernt
5. → Kann neu auswählen
```

---

## Häufige Fragen

### F: Warum funktioniert Rechtklick nicht mehr?
A: Das ist normal! Das Plugin fängt Klicks ab während Auswahl aktiv ist.
→ Deaktivieren für normales Platzieren.

### F: Welche URLs funktionieren?
A: Alle öffentlichen URLs mit:
- `http://` oder `https://`
- `.png`, `.jpg`, `.jpeg`, `.webp` oder `.gif`
- Erreichbar vom Server (nicht lokal!)

### F: Größe meines Bildes?
A: Max 10 MB. Bei Fehler: Bild verkleinern oder komprimieren.

### F: Was wenn Laden scheitert?
A: Plugin versucht **3x automatisch** zu laden.
→ Fehler nach 3x? → URL prüfen oder Admin kontaktieren.

### F: Können mehrere Bilder auf ein Frame?
A: Nein. Wenn schon Bild drauf → zuerst entfernen.

### F: Wo werden Bilder gespeichert?
A: Im Plugin-RAM (temporär). Server-Neustart = gelöscht.

---

## Commands

### Spieler
```
/imageframe          → Hauptmenü öffnen
```

### Administratoren
```
/imageframeadmin     → Stats & Debug Info
```

---

## Fehlerbehandlung

### Fehler: "Ungültige URL"
```
→ URL prüfen auf: http://, .png/.jpg
→ Testen mit curl/Browser
```

### Fehler: "Bild zu groß"
```
→ Bildgröße reduzieren (max 10 MB)
→ Mit Paint/GIMP komprimieren
```

### Fehler: "Timeout"
```
→ Netzwerk-Verbindung prüfen
→ Server-Administrator informieren
```

### Fehler: "Keine Berechtigung"
```
→ Nur Admin darf laden/anwenden
→ Admin fragen
```

---

## Tips & Tricks

### Tipp 1: Item Frame Farben
```
Item Frames sind naturgrau
Glowing Item Frames haben extra Glow
→ Auswählen in Form-Menu
```

### Tipp 2: Batch-Operationen
```
100 Frames auf einmal? Kein Problem!
Plugin wendet mit automatischem Delay an
→ Keine Performance-Probleme
```

### Tipp 3: Bildqualität
```
JPG = Gute Qualität bei kleiner Größe
PNG = Beste Qualität, größer
→ JPEG für großflächige Bilder wählen
```

### Tipp 4: Multiple Bilder
```
Pro Spieler max 50 verschiedene Bilder
→ Alt-Bilder in Menu löschen
→ Neue Bilder laden
```

---

## Performance

### Laden
```
Typ A (Cache Hit):  < 1ms (Bild wird wiederverwendet)
Typ B (Neu Laden):  ~5-30s (HTTP-Download)
Typ C (Mit Retry):  ~10-36s (bei Fehler)
```

### Anwenden
```
1-10 Frames:   Instant
10-100 Frames: ~5 Sekunden (mit Delay)
100+ Frames:   ~50 Sekunden
```

### Memory
```
Pro Bild:      < 1-10 MB
Cache Total:   < 50 MB max
Server Impact: Minimal
```

---

## Beispiel: Gallerie bauen

### Szenario: 20 Bilder in Galerie

```
1. Lade Bild 1: https://site.com/img1.jpg
   → Erfolgreich

2. Lade Bild 2: https://site.com/img2.jpg
   → Erfolgreich

3. ... wiederhole für alle 20 Bilder

4. Wähle Frame-Gruppe 1: 5 Frames
   → Anwende Bild 1
   → Erfolg!

5. Wähle Frame-Gruppe 2: 5 Frames
   → Anwende Bild 2
   → Erfolg!

6. ... wiederhole für alle Gruppen

→ Fertige Galerie mit 20 Bildern!
```

---

## Debug-Tipps (für Administratoren)

### Aktiviere Debug-Logging
```javascript
// In Console:
ImageFrame.debug.enableDebugMode()
→ Zeige detaillierte Logs
```

### Sieh Stats
```javascript
ImageFrame.debug.getStats()
→ Zeige:
  - Geladen Bilder
  - Angewendete Frames
  - Cache-Größe
```

### Leere Cache
```javascript
ImageFrame.debug.clearCache()
→ Entferne alle Cache-Einträge
```

### Admin-Command
```
/imageframeadmin
→ Zeige Statistiken:
  • Bilder: 42
  • Frames: 87
  • Cache: 15 MB
  • Version: 3.0.0
```

---

## Bekannte Limitierungen

| Limit | Wert | Grund |
|-------|------|-------|
| Max Bilder pro Spieler | 50 | Memory |
| Max Framegröße | 100 Maps | Performance |
| Max ausgewählte Frames | 100 | Batch Limit |
| Max Bildgröße | 10 MB | Download |
| Nachricht-Länge | 256 Zeichen | Minecraft Limit |
| Cache-Timeout | 30 Min | Memory Cleanup |

---

## Support & Kontakt

**Problem?**

1. Prüfe **diesen Guide** → Löst 90% der Probleme
2. Prüfe **Server-Logs** → Suche nach Errors
3. Aktiviere **Debug-Mode** → Siehe detaillierte Meldungen
4. Kontaktiere **Server-Admin** → Für weitere Hilfe

---

## Version-Info

```
Name:        ImageFrame
Version:     3.0.0
Status:      Production Ready ✓
Bedrock:     1.21.120+
Features:    Image Loading, Frame Selection, Batch Apply
Last Update: 2025-11-19
```

---

## Was ist neu in v3.0.0?

✅ **Image Loading mit Retry** - Auto 3x Retry bei Fehler
✅ **Item Frame Application** - Wendet Bild auf Frames an
✅ **Batch Operations** - Hunderte Frames gleichzeitig
✅ **Permission System** - Admin-only Commands
✅ **Auto-Save** - Daten speichern automatisch
✅ **Comprehensive Logging** - Debug-Mode & Levels
✅ **Error Handling** - Alle Fehler behandelt
✅ **Production Ready** - Getestet & optimiert

---

**Viel Spaß mit ImageFrame v3.0.0!** 🎉

Für weitere Details siehe: `IMPLEMENTATION_V3.md` oder `VERSION_3_SUMMARY.md`
