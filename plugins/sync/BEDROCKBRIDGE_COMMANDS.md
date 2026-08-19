# 🎮 BedrockBridge Custom Commands - Cross-Server Sync v2.0

**Alle Befehle nutzen den dynamischen BedrockBridge Prefix!**

---

## 🎯 Command-System Übersicht

Das System registriert **4 verschiedene Custom Commands** mit dem BedrockBridge Prefix:

```
BedrockBridge Prefix (Standard: !)
        ↓
    ├─ !sync              ← Spieler-Befehl (Infos & Restore)
    ├─ !syncworld         ← Admin-Befehl (Welt-Verwaltung)
    ├─ !syncadmin         ← Admin-Befehl (Admin-Tools)
    └─ !transfer          ← Spieler-Alias (Info zum Transferieren)
```

---

## 🔧 Wie der Prefix funktioniert

Der BedrockBridge Prefix wird **dynamisch geladen**:

```javascript
// Der Prefix wird automatisch ermittelt:
bridge.bedrockCommands.prefix  // Z.B. "!" oder "." oder "$"

// In den Befehlen wird er dynamisch angezeigt:
player.sendMessage(`§7Nutze: ${bridge.bedrockCommands.prefix}sync help`);
```

**Das bedeutet:**
- Du kannst den Prefix in der BedrockBridge Config ändern
- Alle Befehle passen sich automatisch an
- Keine Code-Änderungen nötig!

---

## 👥 Spieler-Befehle

### 1. **`!sync` - Haupt-Info-Befehl**

**Beschreibung:** Zeigt Informationen zum Globalen Inventar System

**Syntax:**
```
!sync                    # Zeige Info-Menü
!sync help              # Detaillierte Hilfe anzeigen
!sync stats             # Deine Sync-Statistiken
!sync restore           # Inventar manuell wiederherstellen
```

**Beispiele:**

#### `!sync` (Ohne Argumente)
```
────────────────────────────────────
🌐 CROSS-SERVER SYNC v2.0
────────────────────────────────────

ℹ️ Globales Inventar System:
  Du hast EIN Inventar auf allen Welten!
  • Automatisch synchronisiert
  • Alle Items überall verfügbar
  • XP/Level werden mitgenommen

📊 Verfügbare Befehle:
  !sync help       - Diese Hilfe
  !sync stats      - Deine Statistiken
  !sync restore    - Inventar manuell laden

────────────────────────────────────
```

#### `!sync help`
```
────────────────────────────────────
🌐 CROSS-SERVER SYNC - HILFE
────────────────────────────────────

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

────────────────────────────────────
```

#### `!sync stats`
```
────────────────────────────────────
📊 DEINE SYNC-STATISTIKEN
────────────────────────────────────

Spieler: Alex
Level: 30
Anzahl Syncs: 42
Letzte Sync: 2025-11-11T12:30:00Z

────────────────────────────────────
```

#### `!sync restore`
```
⏳ Inventar wird wiederhergestellt...
✓ Inventar wurde wiederhergestellt!
```

---

### 2. **`!transfer` - Transfer-Info-Alias**

**Beschreibung:** Erklärt, dass Transferieren in v2.0 automatisch läuft

**Syntax:**
```
!transfer              # Zeige Transfer-Infos
```

**Ausgabe:**
```
💡 Tipp:
In v2.0 transferierst du automatisch!
Einfach auf einen anderen Server joinen.

Für mehr Infos: !sync help
```

---

## 🛠️ Admin-Befehle

### 1. **`!syncworld` - Welt-Verwaltungs-Panel**

**Beschreibung:** Öffnet das Welt-Management Panel

**Syntax:**
```
!syncworld              # Öffne das Admin-Panel
```

**Panel-Optionen:**
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

**Funktionen:**

**1. Neue Welt hinzufügen:**
- Eingabe: Welt-ID (z.B. "pvp")
- Eingabe: Welt-Name (z.B. "PvP-Arena")
- Toggle: Auto-Sync aktivieren

**2. Welten verbinden:**
- Dropdown: Von-Welt wählen
- Dropdown: Zu-Welt wählen
- Erstellt bidirektionale Verbindung

**3. Welten trennen:**
- Dropdown: Von-Welt wählen
- Dropdown: Zu-Welt wählen
- Entfernt Verbindung

**4. Verbindungsstatus:**
- Zeigt alle Welten
- Zeigt Status (Aktiv/Inaktiv)
- Zeigt Auto-Sync Status
- Zeigt verbundene Welten

**5. Auto-Sync Einstellungen:**
- Toggle: Inventar-Sync
- Toggle: XP-Sync
- Toggle: Login-Sync
- Toggle: Logout-Sync

---

### 2. **`!syncadmin` - Admin-Tools Menü**

**Beschreibung:** Erweitertes Admin-Tools Panel

**Syntax:**
```
!syncadmin              # Öffne Admin-Tools
```

**Panel-Optionen:**
```
┌──────────────────────────┐
│     🔧 ADMIN-TOOLS       │
├──────────────────────────┤
│ 🌍 Welt-Verwaltung      │
│ 📊 System-Status        │
│ 💾 Manual Backup        │
│ 📜 Logs anzeigen        │
│ 🔙 Zurück               │
└──────────────────────────┘
```

**Option 1: Welt-Verwaltung**
- Öffnet das gleiche Panel wie `!syncworld`

**Option 2: System-Status**
```
───────────────────────────
📊 SYSTEM-STATUS
───────────────────────────

Status: ✓ AKTIV
Version: 2.0.1 (Global Inventory)
Auto-Sync: ✓ Aktiv
Inventar-Sync: ✓
XP-Sync: ✓
Online Spieler: 5

───────────────────────────
```

**Option 3: Manual Backup**
```
⏳ Manuelle Sicherung wird erstellt...
✓ Backup erstellt für 5 Spieler!
```

**Option 4: Logs anzeigen**
```
───────────────────────────
📜 LETZTE LOGS
───────────────────────────

Logs sind in der Server-Console verfügbar.

───────────────────────────
```

---

## 📋 Command-Übersicht Tabelle

| Befehl | Typ | Funktion | Beispiel |
|--------|-----|----------|----------|
| `!sync` | Spieler | Infos anzeigen | `!sync` |
| `!sync help` | Spieler | Hilfe anzeigen | `!sync help` |
| `!sync stats` | Spieler | Statistiken | `!sync stats` |
| `!sync restore` | Spieler | Inventar laden | `!sync restore` |
| `!transfer` | Spieler | Transfer-Info | `!transfer` |
| `!syncworld` | Admin | Welt-Verwaltung | `!syncworld` |
| `!syncadmin` | Admin | Admin-Tools | `!syncadmin` |

---

## 🔐 Berechtigungen

### Spieler-Befehle
- ✓ Alle Spieler können nutzen
- ✓ Keine speziellen Rechte nötig

### Admin-Befehle
- ✗ Nur Admins können nutzen
- ✓ Automatisch durch `registerAdminCommand()`

**BedrockBridge erkennt Admins durch:**
- Admin-Role im Discord (falls Discord-Integration)
- Operator-Status im Server
- Custom Admin-Identifikation (je nach Setup)

---

## 💡 Prefix-Konfiguration

### Wo wird der Prefix definiert?

Der Prefix wird in der **BedrockBridge main config** definiert:

```javascript
// In deiner BedrockBridge config:
bridge.bedrockCommands.prefix = "!";  // Oder ".", "$", etc.
```

### Standard-Prefixe
```
!      ← Standard
.      ← Alternative
$      ← Alternative
-      ← Alternative
```

### Commands passen sich an!

**Wenn du den Prefix auf `.` änderst:**
```javascript
bridge.bedrockCommands.prefix = ".";
```

**Dann funktionieren die Commands mit `.`:**
```
.sync help
.syncworld
.syncadmin
.transfer
```

**Ausgaben passen sich auch an:**
```
Nutze: .sync help
Nutze: .syncworld
```

---

## 🎯 Praktische Nutzungs-Szenarien

### Szenario 1: Spieler will sein Inventar checken
```
Spieler gibt ein: !sync stats
↓
System zeigt:
- Spieler-Name
- Level
- Anzahl bisheriger Syncs
- Letzte Sync-Zeit
```

### Szenario 2: Spieler braucht Hilfe
```
Spieler gibt ein: !sync help
↓
System erklärt:
- Was ist das System?
- Wie funktioniert es?
- Automatische Features
```

### Szenario 3: Spieler hat kein Inventar nach Transfer
```
Spieler gibt ein: !sync restore
↓
System:
- Sucht letztes Backup
- Stellt Inventar wieder her
- Bestätigung per Nachricht
```

### Szenario 4: Admin muss Welten konfigurieren
```
Admin gibt ein: !syncworld
↓
Öffnet Panel mit:
- Welt hinzufügen
- Welten verbinden
- Status überprüfen
```

### Szenario 5: Admin braucht System-Status
```
Admin gibt ein: !syncadmin
↓
Wählt: "📊 System-Status"
↓
Sieht:
- Ist System aktiv?
- Welche Features aktiv?
- Wie viele Spieler online?
```

### Szenario 6: Admin macht Backup
```
Admin gibt ein: !syncadmin
↓
Wählt: "💾 Manual Backup"
↓
System erstellt Backup für ALLE online Spieler
```

---

## 🔧 Dynamischer Prefix in Aktion

### Vorher im Code
```javascript
// STATISCH (FALSCH):
player.sendMessage("!sync help");  // Funktioniert nur mit Prefix "!"

// DYNAMISCH (RICHTIG):
player.sendMessage(`${bridge.bedrockCommands.prefix}sync help`);
// Mit Prefix "!" → "!sync help"
// Mit Prefix "." → ".sync help"
// Mit Prefix "$" → "$sync help"
```

---

## 📚 Help-Integration

Das System zeigt automatisch:
- Den aktuellen Prefix in Help-Nachrichten
- Korrekte Befehlssyntax mit Prefix
- Dynamische Anpassung an Config-Änderungen

**Beispiel:**
```javascript
// Code:
player.sendMessage(`${bridge.bedrockCommands.prefix}sync help`);

// Output mit Prefix "!":
!sync help

// Output mit Prefix ".":
.sync help

// Output mit Prefix "$":
$sync help
```

---

## ✅ Registrations-Details

### Spieler-Commands
```javascript
bridge.bedrockCommands.registerCommand(
  "sync",
  (player, ...args) => { /* Logic */ },
  "🌐 Automatische Welt-Synchronisation - Dein globales Inventar"
);
```

### Admin-Commands
```javascript
bridge.bedrockCommands.registerAdminCommand(
  "syncworld",
  (player) => { /* Logic */ },
  "🌐 Welt-Verbindungen verwalten - Automatische Synchronisation"
);
```

---

## 🎓 Zusammenfassung

**Das BedrockBridge Command-System v2.0 bietet:**

✅ **4 Custom Commands** (sync, syncworld, syncadmin, transfer)
✅ **Dynamischer Prefix** (passt sich an Config an)
✅ **Spieler & Admin Commands** (getrennte Berechtigungen)
✅ **Informative Ausgaben** (hilfreiche Nachrichten)
✅ **Panel-UI** (für komplexere Operationen)
✅ **Error-Handling** (Fallbacks & Fehler-Messages)

---

**Version:** 2.0.1
**Command-System:** Vollständig implementiert
**Prefix-Support:** ✅ Dynamisch
**Status:** ✅ Production Ready

*Alle Befehle nutzen BedrockBridge Prefix - einfach & elegant!* 🎮
