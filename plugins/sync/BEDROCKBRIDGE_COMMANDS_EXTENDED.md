# 🎮 BedrockBridge Custom Commands - Erweiterte Referenz v2.0

**Vollständige Dokumentation aller BedrockBridge Custom Commands für Cross-Server Sync v2.0**

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Spieler-Befehle](#spieler-befehle)
3. [Admin-Befehle](#admin-befehle)
4. [Debug-Befehle](#debug-befehle)
5. [Prefix-System](#prefix-system)
6. [Fehlerbehandlung](#fehlerbehandlung)
7. [Praktische Beispiele](#praktische-beispiele)

---

## 🎯 Übersicht

Das Complete IPC System nutzt **AUSSCHLIESSLICH BedrockBridge Custom Commands** - KEIN natives Minecraft Command-System!

### Befehlstruktur

```
${PREFIX}sync              ← Spieler-Befehl (8 Subcommands)
${PREFIX}syncworld         ← Admin-Befehl (Welt-Verwaltung)
${PREFIX}syncadmin         ← Admin-Befehl (6 Subcommands + Menu)
${PREFIX}syncdebug         ← Admin-Befehl (4 Subcommands)
${PREFIX}transfer          ← Spieler-Alias
```

**Der Prefix ist dynamisch!** (Standard: `!`)

### Registrierung im Code

```javascript
// Spieler-Commands
bridge.bedrockCommands.registerCommand("sync", handler, "Beschreibung");

// Admin-Commands
bridge.bedrockCommands.registerAdminCommand("syncworld", handler, "Beschreibung");
bridge.bedrockCommands.registerAdminCommand("syncadmin", handler, "Beschreibung");
bridge.bedrockCommands.registerAdminCommand("syncdebug", handler, "Beschreibung");

// Alle Commands nutzen automatisch den BedrockBridge Prefix!
```

---

## 👥 Spieler-Befehle

### 1. **`${PREFIX}sync` - Haupt-Info-Befehl**

**Typ:** Spieler-Befehl
**Berechtigung:** Alle Spieler
**SubCommands:** 8

#### A. **`${PREFIX}sync` (Keine Argumente)**

**Beschreibung:** Zeigt das Info-Menü

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 CROSS-SERVER SYNC v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ Globales Inventar System:
  Du hast EIN Inventar auf allen Welten!
  • Automatisch synchronisiert
  • Alle Items überall verfügbar
  • XP/Level werden mitgenommen

📊 Verfügbare Befehle:
  !sync help       - Diese Hilfe
  !sync stats      - Deine Statistiken
  !sync restore    - Inventar manuell laden

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### B. **`${PREFIX}sync help` - Detaillierte Hilfe**

**Beschreibung:** Zeigt vollständige Erklärung des Systems

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 CROSS-SERVER SYNC - HILFE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Was ist das System?
  Dein Inventar wird automatisch
  zwischen allen Welten synchronisiert!

Wie funktioniert es?
  1. Du sammelst Items auf Welt A
  2. Du loggt aus
  3. Du joinet Welt B
  4. Deine Items sind da! ✓

Automatisch:
  ✓ Inventar wird beim Ausloggen gespeichert
  ✓ Inventar wird beim Eintritt wiederhergestellt
  ✓ XP/Level werden ebenfalls synchronisiert
  ✓ Alles läuft im Hintergrund ab

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### C. **`${PREFIX}sync stats` - Statistiken**

**Beschreibung:** Zeigt deine persönliche Sync-Statistiken

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DEINE SYNC-STATISTIKEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spieler: Alex
Level: 30
Anzahl Syncs: 42
Letzte Sync: 11/11/2025, 12:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### D. **`${PREFIX}sync restore` - Inventar Wiederherstellen**

**Beschreibung:** Lädt Inventar manuell neu

**Syntax:**
```
${PREFIX}sync restore
```

**Ausgabe bei Erfolg:**
```
⏳ Inventar wird wiederhergestellt...
✓ Inventar wurde wiederhergestellt!
```

**Ausgabe bei Fehler:**
```
⏳ Inventar wird wiederhergestellt...
✗ Kein Inventar-Backup gefunden.
Du musst erst auf einer anderen Welt Items haben.
```

---

#### E. **`${PREFIX}sync inventory` (NEU!)**

**Beschreibung:** Zeigt Inventar-Informationen

**Aliases:** `inv`

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DEIN GLOBALES INVENTAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Dein Inventar ist GLOBAL:
  • Überall verfügbar
  • Automatisch synchronisiert
  • Verloren geht nichts!

Aktuelle Items: 27
Letzte Sync: 11/11/2025, 12:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### F. **`${PREFIX}sync xp` (NEU!) - XP-Information**

**Beschreibung:** Zeigt Level und XP-Informationen

**Aliases:** `level`

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ DEIN GLOBALES LEVEL & XP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Dein Level ist GLOBAL:
  • Überall das gleiche Level
  • Automatisch synchronisiert
  • Keine Wiederholung nötig!

Aktuelles Level: 30
XP-Prozent: 45%
Letzte Sync: 11/11/2025, 12:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### G. **`${PREFIX}sync info` (NEU!) - Status-Info**

**Beschreibung:** Zeigt deinen aktuellen Sync-Status

**Aliases:** `status`

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 DEIN SYNC-STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sync-Status: ✓ idle
Anzahl Syncs: 42
Letzte Sync: 11/11/2025, 12:30:00
Aktueller Level: 30

Verfügbare Befehle:
  !sync inventory - Inventar-Info
  !sync xp        - XP-Info
  !sync stats     - Statistiken
  !sync restore   - Manuell laden

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### H. **`${PREFIX}sync worlds` (NEU!) - Welten-Liste**

**Beschreibung:** Zeigt alle verfügbaren Welten

**Aliases:** `welten`

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 VERFÜGBARE WELTEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Hauptwelt ✓ ONLINE
   ID: world1 | Verbunden mit: world2

2. Farmingwelt ✓ ONLINE
   ID: world2 | Verbunden mit: world1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 2. **`${PREFIX}transfer` - Transfer-Info (Alias)**

**Typ:** Spieler-Befehl
**Berechtigung:** Alle Spieler
**SubCommands:** Keine

**Beschreibung:** Kurze Info zum automatischen Transfer

**Ausgabe:**
```
💡 Tipp:
In v2.0 transferierst du automatisch!
Einfach auf einen anderen Server joinen.

Für mehr Infos: !sync help
```

---

## 🛠️ Admin-Befehle

### 1. **`${PREFIX}syncworld` - Welt-Verwaltungs-Panel**

**Typ:** Admin-Befehl
**Berechtigung:** Admin-Only
**SubCommands:** Menu-basiert

**Beschreibung:** Öffnet das Welt-Management Panel mit allen Optionen

**Syntax:**
```
${PREFIX}syncworld
```

**Panel-Menü:**
```
┌──────────────────────────────────┐
│   🌐 WELT-VERBINDUNGSVERWALTUNG  │
├──────────────────────────────────┤
│ ➕ Neue Welt hinzufügen          │
│ 🔗 Welten verbinden              │
│ ❌ Welten trennen                │
│ 📊 Verbindungsstatus             │
│ ⚙️ Auto-Sync Einstellungen       │
│ 🔙 Zurück                        │
└──────────────────────────────────┘
```

**Menü-Optionen:**

#### Option 1: Neue Welt hinzufügen
- Input: Welt-ID (z.B. "pvp")
- Input: Welt-Name (z.B. "PvP-Arena")
- Toggle: Auto-Sync aktivieren

#### Option 2: Welten verbinden
- Dropdown: Von-Welt wählen
- Dropdown: Zu-Welt wählen
- Erstellt bidirektionale Verbindung

#### Option 3: Welten trennen
- Dropdown: Von-Welt wählen
- Dropdown: Zu-Welt wählen
- Entfernt Verbindung

#### Option 4: Verbindungsstatus
- Zeigt alle konfigurierten Welten
- Status (Online/Offline)
- Verbundene Welten

#### Option 5: Auto-Sync Einstellungen
- Toggle: Inventar-Sync
- Toggle: XP-Sync
- Toggle: Login-Sync
- Toggle: Logout-Sync

---

### 2. **`${PREFIX}syncadmin` - Admin-Tools (MIT SUBCOMMANDS!)**

**Typ:** Admin-Befehl
**Berechtigung:** Admin-Only
**SubCommands:** 5 (+ Menu)

**Basis-Syntax:**
```
${PREFIX}syncadmin              # Öffne Menu
${PREFIX}syncadmin status       # Status anzeigen
${PREFIX}syncadmin backup       # Manual Backup
${PREFIX}syncadmin players      # Spieler anzeigen
${PREFIX}syncadmin config       # Config anzeigen
```

#### A. **`${PREFIX}syncadmin` (Menu)**

**Beschreibung:** Öffnet das Haupt-Admin-Menü

**Menu-Optionen:**
```
┌──────────────────┐
│   🔧 ADMIN-TOOLS │
├──────────────────┤
│ 🌍 Welt-Verwaltung
│ 📊 System-Status
│ 💾 Manual Backup
│ 👥 Spieler-Verwaltung
│ 📜 System-Logs
│ ⚙️ Einstellungen
│ 🔙 Zurück
└──────────────────┘
```

---

#### B. **`${PREFIX}syncadmin status` - Schnelle Status**

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SYSTEM-STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ✓ AKTIV
Version: 2.0.0
Online Spieler: 5
Welten: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### C. **`${PREFIX}syncadmin backup` - Manueller Backup**

**Beschreibung:** Erstellt Backup für alle Online-Spieler

**Ausgabe:**
```
⏳ Manuelle Sicherung wird erstellt...
✓ Backup erstellt für 5 Spieler!
Zeitstempel: 2025-11-11T12:30:00.000Z
```

---

#### D. **`${PREFIX}syncadmin players` - Online-Spieler**

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 ONLINE SPIELER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Alex (Level 30) [✓]
2. Bob (Level 15) [⟳]
3. Charlie (Level 25) [✓]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### E. **`${PREFIX}syncadmin config` - Konfiguration**

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ KONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sync-Einstellungen:
  • Auto-Sync: true
  • Inventar: true
  • XP: true
  • Health: false

Login/Logout:
  • On Login: true
  • On Logout: true

Timing:
  • Interval: 60s

Logging:
  • Discord: true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 3. **`${PREFIX}syncdebug` - Debug & Monitoring**

**Typ:** Admin-Befehl
**Berechtigung:** Admin-Only
**SubCommands:** 4

**Syntax:**
```
${PREFIX}syncdebug ipc       # IPC Queue Status
${PREFIX}syncdebug conflicts # Konflikt-History
${PREFIX}syncdebug sessions  # Aktive Sessions
${PREFIX}syncdebug clear     # Cleanup
```

#### A. **`${PREFIX}syncdebug ipc` - IPC Queue**

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 IPC DEBUG - NACHRICHTENQUEUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ausstehende Nachrichten: 3
Verarbeitete Nachrichten: 45
Queue-Größe (RAM): 12

Welt-Heartbeats:
  world1: ✓ ONLINE (2s)
  world2: ✗ OFFLINE (45s)

Aktuelle Spieler-Sync-States:
  Alex: ✓ idle
  Bob: ⟳ syncing
  ... und 3 weitere

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### B. **`${PREFIX}syncdebug conflicts` - Konflikt-History**

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 KONFLIKT-AUFLÖSUNGS-HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Player: Alex
Art: inventory_clash
Resolution: last_write_wins
Zeit: 11/11/2025, 12:30:00

Player: Bob
Art: xp_mismatch
Resolution: last_write_wins
Zeit: 11/11/2025, 12:25:00

Totale Konflikte: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### C. **`${PREFIX}syncdebug sessions` - Sessions**

**Ausgabe:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 AKTIVE SPIELER-SESSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spieler: Alex
Welt: world1
Uptime: 1234s

Spieler: Bob
Welt: world2
Uptime: 567s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### D. **`${PREFIX}syncdebug clear` - Cleanup**

**Ausgabe:**
```
⏳ Clearing old IPC messages...
✓ 15 alte Nachrichten gelöscht!
```

---

## 🔌 Prefix-System

### Dynamischer Prefix

**Der Prefix wird DYNAMISCH aus BedrockBridge geladen!**

```javascript
// Im Code:
bridge.bedrockCommands.prefix  // Standard: "!"

// Alle Befehle nutzen automatisch diesen Prefix
// Spieler sehen ihn auch in Nachrichten:
player.sendMessage(`Nutze: ${bridge.bedrockCommands.prefix}sync help`);
```

### Standard-Prefixe

```
!      ← Standard (Standard-Wert)
.      ← Alternative
$      ← Alternative
-      ← Alternative
```

### Beispiel: Prefix auf "." ändern

**Wenn du in BedrockBridge die Config änderst:**
```javascript
bridge.bedrockCommands.prefix = ".";
```

**ALLE Commands funktionieren mit ".":**
```
.sync              (statt !sync)
.sync help         (statt !sync help)
.syncworld         (statt !syncworld)
.syncadmin status  (statt !syncadmin status)
.syncdebug ipc     (statt !syncdebug ipc)
```

**Und die Ausgaben passen sich an:**
```
Nutze: .sync help
Nutze: .syncworld
```

---

## ⚠️ Fehlerbehandlung

### Fehler-Meldungen

#### 1. **Unbekannter SubCommand**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ UNBEKANNTER BEFEHL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verfügbare Befehle:
  !sync              - Zeige Info-Menü
  !sync help         - Detaillierte Hilfe
  !sync stats        - Deine Statistiken
  !sync restore      - Inventar laden
  !sync inventory    - Inventar-Info
  !sync xp           - Level-Info
  !sync info         - Status-Info
  !sync worlds       - Welten-Liste

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 2. **Berechtigungs-Fehler**

```
✗ Du darfst diesen Befehl nicht nutzen!
Nur Admins können diesen Befehl ausführen.
```

#### 3. **Allgemeiner Fehler**

```
✗ Ein Fehler ist aufgetreten. Versuche es später erneut.
(Der Fehler wird in der Console protokolliert)
```

---

## 📚 Praktische Beispiele

### Beispiel 1: Spieler möchte sein Inventar überprüfen

```
Spieler gibt ein: !sync inventory

System zeigt:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DEIN GLOBALES INVENTAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Dein Inventar ist GLOBAL:
  • Überall verfügbar
  • Automatisch synchronisiert
  • Verloren geht nichts!

Aktuelle Items: 27
Letzte Sync: 11/11/2025, 12:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Beispiel 2: Admin braucht schnelle Status-Info

```
Admin gibt ein: !syncadmin status

System zeigt:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SYSTEM-STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ✓ AKTIV
Version: 2.0.0
Online Spieler: 5
Welten: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Beispiel 3: Admin debuggt IPC-Probleme

```
Admin gibt ein: !syncdebug ipc

System zeigt:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 IPC DEBUG - NACHRICHTENQUEUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ausstehende Nachrichten: 0  ← OK!
Verarbeitete Nachrichten: 45
Queue-Größe (RAM): 12

Welt-Heartbeats:
  world1: ✓ ONLINE (2s)    ← OK!
  world2: ✓ ONLINE (3s)    ← OK!

Aktuelle Spieler-Sync-States:
  Alex: ✓ idle
  Bob: ✓ idle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Beispiel 4: Kompletter Workflow

```
SCHRITT 1: Spieler gibt Befehl
└─ !sync help

SCHRITT 2: System zeigt Hilfe-Info
└─ Erklärung des globalen Inventar-Systems

SCHRITT 3: Spieler transferiert (automatisch)
└─ Loggt sich ab auf Welt A
└─ Loggt sich in Welt B ein
└─ Inventar wird automatisch geladen

SCHRITT 4: Spieler überprüft
└─ !sync inventory
└─ Zeigt: Aktuelle Items noch da!
```

---

## 📋 Befehlsübersicht-Tabelle

| Befehl | SubCmd | Typ | Funktion |
|--------|--------|-----|----------|
| `!sync` | *(keine)* | Spieler | Info-Menü |
| `!sync` | `help` | Spieler | Hilfe |
| `!sync` | `stats` | Spieler | Statistiken |
| `!sync` | `restore` | Spieler | Inventar laden |
| `!sync` | `inventory` | Spieler | Inventar-Info |
| `!sync` | `xp` | Spieler | XP-Info |
| `!sync` | `info` | Spieler | Status-Info |
| `!sync` | `worlds` | Spieler | Welten-Liste |
| `!transfer` | - | Spieler | Transfer-Info |
| `!syncworld` | - | Admin | Welt-Verwaltung |
| `!syncadmin` | *(menu)* | Admin | Admin-Menü |
| `!syncadmin` | `status` | Admin | Status |
| `!syncadmin` | `backup` | Admin | Backup |
| `!syncadmin` | `players` | Admin | Spieler |
| `!syncadmin` | `config` | Admin | Config |
| `!syncdebug` | `ipc` | Admin | IPC-Debug |
| `!syncdebug` | `conflicts` | Admin | Konflikte |
| `!syncdebug` | `sessions` | Admin | Sessions |
| `!syncdebug` | `clear` | Admin | Cleanup |

---

## ✨ Best Practices

### 1. **Nutze SubCommands**

```javascript
// ✓ RICHTIG: SubCommands nutzen
!syncadmin status       // Schnelle Info
!syncdebug ipc          // Debugging

// ✗ FALSCH: Ohne SubCommands (veraltet)
// (Diese Commands haben keine alternativen Wege)
```

### 2. **Dynamischer Prefix in Nachrichten**

```javascript
// ✓ RICHTIG:
player.sendMessage(`Nutze: ${bridge.bedrockCommands.prefix}sync help`);

// ✗ FALSCH: Hardcoded Prefix
player.sendMessage("Nutze: !sync help");  // Nur für Prefix "!"
```

### 3. **Error-Handling**

```javascript
// ✓ RICHTIG: Mit Fallback
try {
  // Befehl ausführen
} catch (e) {
  player.sendMessage("✗ Ein Fehler ist aufgetreten");
  log(`Error: ${e}`, "error");
}
```

---

## 🎓 Zusammenfassung

### BedrockBridge Command System v2.0:

✅ **5 Haupt-Commands**
- `/sync` (Spieler, 8 Subcommands)
- `/transfer` (Spieler, Alias)
- `/syncworld` (Admin, Menu)
- `/syncadmin` (Admin, 5 Subcommands + Menu)
- `/syncdebug` (Admin, 4 Subcommands)

✅ **Dynamischer Prefix**
- Automatisch aus BedrockBridge geladen
- Alle Commands passen sich an
- Nachrichten zeigen aktuellen Prefix

✅ **Vollständig integriert**
- ALLE Features über Commands
- KEIN natives Minecraft-Command-System
- ALLES durchdacht und vollständig

✅ **Admin-freundlich**
- Subcommands für schnelle Operationen
- Menüs für komplexere Aufgaben
- Debug-Tools integriert

---

**Version:** 2.0.0 (Complete BedrockBridge Integration)
**Status:** ✅ Production Ready
**Commands:** 5 Haupt-Commands, 17+ Subcommands
**Prefix-Support:** ✅ Dynamisch

*ALLE Commands nutzen BedrockBridge Prefix - nichts anderes!* 🎮
