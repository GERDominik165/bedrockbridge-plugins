# ⚡ Quick Start - Complete IPC System

**Schnelleinstieg: Das komplette Inter-Plugin Communication System in 5 Minuten verstehen**

---

## 🎯 Die 3 wichtigsten Konzepte

### 1. **Shared Database = Kommunikation**

```
Alle Welten nutzen die gleiche Datenbank:

Welt A         Welt B         Welt C
  ↓             ↓              ↓
  └─────→ Shared Database ←────┘

Nachrichten-Flow:
- Welt A schreibt Nachricht
- Welt B liest & verarbeitet
- Welt C wird benachrichtigt
```

### 2. **Player State = Tracking**

```
Spieler "Alex" hat immer einen Status:

[LOGIN] → [SYNCING] → [RESTORING] → [COMPLETE] → [IDLE]

Aktueller State wird gespeichert + persistiert
```

### 3. **World Heartbeat = Gesundheitsprüfung**

```
Alle 30 Sekunden:
- Jede Welt sagt "Ich bin online!"
- Status-Check: Heartbeat-Alter > 30s = OFFLINE
- Offline-Welten werden erkannt
```

---

## 📋 Schnellübersicht

### Was wird automatisch gemacht?

✅ Spieler-Login → Inventar & XP automatisch laden
✅ Spieler-Logout → Inventar & XP automatisch speichern
✅ Periodisch (60s) → Daten synchronisieren & Heartbeat senden
✅ Konflikte → Automatisch auflösen (neuste Version gewinnt)

### Was sind die neuen Befehle?

| Befehl | Was macht's | Wer kann's nutzen |
|--------|----------|-------|
| `/sync help` | Zeigt Hilfe | Alle |
| `/sync stats` | Deine Statistiken | Alle |
| `/sync restore` | Inventar neuladen | Alle |
| `/syncworld` | Welten verwalten | Admin |
| `/syncadmin` | System-Status | Admin |
| `/syncdebug ipc` | IPC diagnostizieren | Admin |
| `/syncdebug conflicts` | Konflikte anschauen | Admin |
| `/syncdebug sessions` | Aktive Sessions | Admin |
| `/syncdebug clear` | Cleanup alte Nachrichten | Admin |

---

## 🔧 Installation & Setup

### Schritt 1: Plugin installieren

```bash
# Datei in den richtigen Ordner
D:\BB\bridgePlugins\sync\crossServerSync_v2.js
```

### Schritt 2: Zur BedrockBridge hinzufügen

```javascript
// In BedrockBridge main.js:
import "./bridgePlugins/sync/crossServerSync_v2.js";
```

### Schritt 3: Server starten

```bash
# Server lädt Plugin automatisch
# Prüfe Konsole auf "CROSS-SERVER SYNC v2.0" Message
```

### Schritt 4: Testen

```
1. Spieler loggt sich in Welt A ein
2. Sammelt 10 Diamanten
3. Loggt sich ab
4. Wechselt zu Welt B
5. → 10 Diamanten sind da! ✓
```

---

## 🎮 Typische Workflow-Szenarien

### Szenario A: Spieler transferiert

```
Schritt 1: Spieler in Welt A
├─ Hat: 5 Diamanten, Level 15

Schritt 2: Spieler loggt sich ab
├─ Plugin speichert: Inventar & XP
└─ Sendet IPC-Nachricht: "player_logout"

Schritt 3: Spieler loggt sich in Welt B ein
├─ Plugin empfängt: IPC-Nachrichten
├─ Lädt: Globales Inventar & XP
└─ Spieler hat: 5 Diamanten, Level 15 ✓

Erfolg! Daten synchronisiert!
```

### Szenario B: Gleichzeitig sammeln

```
Welt A: Spieler sammelt 10 Diamanten (jetzt 15)
         └─ Speichert sofort

Welt B: Spieler sammelt 5 Diamanten (jetzt 20)
         └─ Speichert sofort

→ Konflikt erkannt!
  Welche Version ist richtig?

Last-Write-Wins (LWW):
├─ Welt A speichert um 12:30:00
└─ Welt B speichert um 12:30:02 → GEWINNT!

Finale Version: 20 Diamanten ✓
```

### Szenario C: Welt-Ausfall

```
Welt A: Online, funktioniert normal
Welt B: Crash! → OFFLINE

Was passiert?
├─ Neue Nachrichten werden gepuffert
├─ Spieler können zu Welt B nicht wechseln
├─ Nach 30s: Welt B wird als OFFLINE erkannt
└─ Benachrichtigung an Admins

Welt B startet wieder:
├─ Status wechselt zu ONLINE
├─ Gepufferte Nachrichten werden versendet
├─ Spieler können wieder wechseln
└─ Alles synchronisiert sich ✓
```

---

## 🔍 Debugging-Guide

### Problem: "Inventar ist weg!"

**Schritt 1: Diagnose**
```
/syncdebug ipc
→ Ausstehende Nachrichten > 0? JA = Problem
```

**Schritt 2: Status überprüfen**
```
/syncadmin
→ Wähle: "📊 System-Status"
→ Überprüfe: Inventar-Sync: ✓ aktiv?
```

**Schritt 3: Manueller Backup**
```
/syncadmin
→ Wähle: "💾 Manual Backup"
→ Backup für alle Spieler erstellt
```

---

### Problem: "Welten sind offline!"

**Schritt 1: Überprüfen**
```
/syncdebug ipc
→ Welt-Heartbeats section
→ Status: ✗ OFFLINE?
```

**Schritt 2: Server-Status überprüfen**
```
Ist der Server wirklich online?
├─ Spieler connecten können?
├─ Console hat keine Fehler?
```

**Schritt 3: Neustart**
```
Server neu starten
→ Plugin neu initializieren
→ Heartbeat wird wieder gesendet
```

---

### Problem: "Zu viele Fehler im Log!"

**Schritt 1: Cleanup**
```
/syncdebug clear
→ Alte Nachrichten löschen
```

**Schritt 2: Fehler überprüfen**
```
/syncdebug conflicts
→ Zeigt ungeklärte Konflikte?
```

**Schritt 3: Logs lesen**
```
Server-Konsole überprüfen:
├─ Welche Fehler kommen vor?
├─ Spalte Error-Meldungen separat auf
└─ Log an Developer senden
```

---

## 📊 Monitoring Checkliste

### Täglich überprüfen

```
☐ /syncdebug ipc
  ├─ Ausstehende Nachrichten = 0? (OK)
  ├─ Alle Welten ONLINE?
  └─ Spieler-States = idle? (OK)

☐ /syncadmin → System-Status
  ├─ Status: ✓ AKTIV?
  ├─ Inventar-Sync: ✓?
  └─ XP-Sync: ✓?

☐ Server-Logs überprüfen
  ├─ Keine roten Fehler?
  └─ Normale Info-Meldungen?
```

### Wöchentlich überprüfen

```
☐ /syncdebug conflicts
  └─ Konflikt-Rate OK? (< 5%)

☐ /syncdebug sessions
  └─ Sessions sind sauber?

☐ /syncdebug clear
  └─ Cleanup alte Nachrichten

☐ Server-Logs archivieren
  └─ Backup machen
```

---

## 🎯 Performance-Tipps

### 1. Sync-Interval anpassen

```javascript
// Standard: 60 Sekunden
config.autoSyncInterval = 60;

// Für 50+ Spieler: 5 Minuten
config.autoSyncInterval = 300;

// Für < 5 Spieler: 30 Sekunden
config.autoSyncInterval = 30;
```

### 2. Discord-Logging deaktivieren (bei hoher Last)

```javascript
// Reduziert CPU/Netzwerk
config.discordLogging = false;
```

### 3. Nur notwendige Features aktivieren

```javascript
// Beide an = mehr Last
config.syncInventory = true;    // Essentiell
config.syncXP = true;            // Optional

// Abhängig von deinem Server
config.syncHealth = false;       // Extra Load
```

---

## 📚 Wo finde ich was?

| Topic | Datei | Info |
|-------|-------|------|
| **IPC-System** | `IPC_SYSTEM.md` | Vollständige technische Docs |
| **Befehle** | `BEDROCKBRIDGE_COMMANDS.md` | Alle Befehle erklärt |
| **Global Inventar** | `GLOBAL_INVENTORY_UPDATE.md` | How it works |
| **Architecture** | `ARCHITECTURE.md` | Technisches Design |
| **Config** | `CONFIG_v2.md` | Alle Optionen |

---

## 🚀 Nächste Schritte

1. **Installation überprüfen**
   - Plugin lädt? → Log überprüfen
   - Befehle funktionieren? → `/sync help` testen

2. **Mit Spielern testen**
   - 1-2 Spieler in verschiedenen Welten
   - Items transfer testen
   - XP transfer testen

3. **Monitoring aktivieren**
   - `/syncdebug ipc` als Routine
   - Logs regelmäßig checken
   - Discord-Notifications testen

4. **In Produktion gehen**
   - Alle Spieler einweisen
   - Helpdesk trainieren
   - Backup-Plan definieren

---

## ❓ FAQ

**F: Funktioniert auch ohne IPC?**
A: IPC ist integriert. System arbeitet auch offline, aber nicht zwischen Welten.

**F: Wie lange dauert ein Sync?**
A: < 1 Sekunde normalerweise. Bei vielen Items bis zu 5 Sekunden.

**F: Was wenn zwei Spieler sich gleichzeitig anmelden?**
A: Kein Problem! System handhabt Parallelität mit Locks.

**F: Kann ich IPC ausschalten?**
A: Nein, es ist zentral für das System. Aber du kannst Sync-Features ausschalten.

**F: Wie oft sollte ich `/syncdebug clear` laufen?**
A: Täglich reicht. Alte Nachrichten werden automatisch gelöscht nach 5 Minuten.

---

**Version:** 2.0.0
**Status:** ✅ Production Ready
**Zeit zum verstehen:** ~5 Minuten

*Viel Erfolg mit deinem Cross-Server Sync System!* 🌐
