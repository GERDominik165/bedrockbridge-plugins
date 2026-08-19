# ✅ Testing & Validation Plan - Cross-Server Sync v2.0

**Umfassender Test- und Validierungsplan für das Complete IPC System**

---

## 📋 Inhaltsverzeichnis

1. [Setup für Tests](#setup-für-tests)
2. [Unit-Tests](#unit-tests)
3. [Integration-Tests](#integration-tests)
4. [Stress-Tests](#stress-tests)
5. [Real-World-Tests](#real-world-tests)
6. [Validierungs-Checkliste](#validierungs-checkliste)
7. [Performance-Benchmarks](#performance-benchmarks)
8. [Sign-Off](#sign-off)

---

## 🔧 Setup für Tests

### Voraussetzungen

```
✓ BedrockBridge installiert & aktiv
✓ Node.js für Validierung
✓ Mindestens 2 Bedrock Server Instanzen (lokal oder remote)
✓ Shared Database (SQLite, LevelDB, etc.)
✓ Admin-Zugang zu allen Servern
✓ Test-Spieler-Accounts (mindestens 3)
```

### Test-Umgebung Setup

```bash
# 1. Plugin-Dateien kopieren
cp crossServerSync_v2.js /BB/world1/plugins/
cp crossServerSync_v2.js /BB/world2/plugins/

# 2. In beiden BedrockBridge Instanzen:
import "./bridgePlugins/sync/crossServerSync_v2.js";

# 3. Server starten
# 4. Auf Initialisierungs-Nachricht überprüfen
```

### Test-Spieler vorbereiten

```
Spieler 1 (Admin): hat /syncworld & /syncdebug
Spieler 2 (Test-A): Test-Spieler auf Welt A
Spieler 3 (Test-B): Test-Spieler auf Welt B
```

---

## 🧪 Unit-Tests

### Test 1: Plugin-Initialisierung

**Ziel:** Überprüfen dass Plugin korrekt lädt

```
Schritt 1: Server starten
├─ [CrossServerSyncV2] v2.0.0 initialisiert
└─ PRODUCTION READY ausgegeben?

Erwartung: ✓ JA
Status: PASS / FAIL
```

---

### Test 2: Database-Tabellen

**Ziel:** Alle Datenbank-Tabellen werden erstellt

```
Schritt 1: Nach Plugin-Start überprüfen:
├─ crossSync_worlds_v2
├─ crossSync_players_v2
├─ crossSync_inventory_v2
├─ crossSync_xp_v2
├─ crossSync_ipc_messages
├─ crossSync_sync_state
└─ ... weitere 7+ Tabellen?

Erwartung: Alle Tabellen vorhanden
Status: PASS / FAIL
```

---

### Test 3: BedrockBridge Commands

**Ziel:** Alle Commands sind registriert

```
Schritt 1: Spieler testet:
├─ /sync help           → Hilfe-Text?
├─ /sync stats          → Statistiken?
├─ /sync restore        → Inventar laden?
├─ /syncworld (Admin)   → Panel öffnet?
├─ /syncadmin (Admin)   → Menu öffnet?
├─ /syncdebug ipc (Admin) → Status zeigt?
└─ /transfer           → Info zeigt?

Erwartung: Alle Commands funktionieren
Status: PASS / FAIL
```

---

### Test 4: Inventar-Validierung

**Ziel:** Inventory-Daten werden korrekt validiert

```
Schritt 1: Test-Spieler sammelt diverse Items:
├─ Diamanten (64er Stack)
├─ Enchanted Sword (Unbreaking III)
├─ Compass
├─ Rüstung Set (full Diamond)
└─ Custom Items

Schritt 2: Überprüfe Datenbank:
├─ inv_PlayerName_global existiert?
├─ Alle Items vorhanden?
├─ Enchantments erhalten?
└─ Stackgrößen korrekt?

Erwartung: Alles korrekt gespeichert
Status: PASS / FAIL
```

---

### Test 5: XP-Validierung

**Ziel:** XP-Daten werden korrekt validiert

```
Schritt 1: Test-Spieler levelt auf Level 25
├─ /sync stats prüft: Level 25?

Schritt 2: Überprüfe Datenbank:
├─ xp_PlayerName_global existiert?
├─ Level = 25?
├─ Wert zwischen 0-32767?
└─ XP-Percentage gespeichert?

Erwartung: XP korrekt gespeichert & validiert
Status: PASS / FAIL
```

---

### Test 6: IPC Nachrichtenversand

**Ziel:** IPC-Nachrichten werden korrekt versendet

```
Schritt 1: Spieler loggt sich ab
├─ Player-Leave Event triggt

Schritt 2: Überprüfe Datenbank (ipcMessagesDb):
├─ player_sync Nachricht erstellt?
├─ messageId eindeutig?
├─ timestamp gesetzt?
├─ priority = "high"?
└─ payload komplett?

Erwartung: Nachricht korrekt versendet
Status: PASS / FAIL
```

---

### Test 7: Zustandsübergänge

**Ziel:** PlayerSyncStateMachine funktioniert korrekt

```
Schritt 1: Spieler-Zyklus durchlaufen:

Login:
├─ setState("restoring")
└─ Inventar/XP wird geladen

Gameplay:
├─ setState("idle")
└─ Bereit für nächste Aktion

Logout:
├─ setState("syncing")
├─ setState("idle")
└─ Bestätigung gesendet

Erwartung: States korrekt gesetzt & persistiert
Status: PASS / FAIL
```

---

## 🔗 Integration-Tests

### Test 1: Vollständiger Spieler-Transfer

**Ziel:** Spieler transferiert zwischen Welten mit allen Daten

```
Setup:
├─ Welt A & Welt B online
├─ Test-Spieler A auf Welt A
├─ Test-Spieler B bereit auf Welt B

Test-Ablauf:
1. Spieler A sammelt Items:
   ├─ 10 Diamanten
   ├─ 1 Schwert (Unbreaking III)
   ├─ 5 XP-Level gewinnt (zu Level 20)

2. Spieler A loggt sich ab:
   ├─ Plugin speichert Inventar
   ├─ Plugin speichert XP
   ├─ IPC-Nachricht versendet
   └─ Logs zeigen "✓ Inventar gespeichert"?

3. Spieler A loggt sich in Welt B ein:
   ├─ Plugin empfängt IPC-Nachrichten
   ├─ Plugin lädt Inventar:
   │  └─ 10 Diamanten? ✓
   ├─ Plugin lädt XP:
   │  └─ Level 20? ✓
   └─ Erfolgs-Nachricht gesendet?

Erwartung: ALLE Daten transferiert
Status: PASS / FAIL
```

---

### Test 2: Konflikt-Erkennung & -Auflösung

**Ziel:** Konflikte werden erkannt & gelöst

```
Setup:
├─ Welt A & Welt B online
├─ Test-Spieler auf beiden Welten (simuliert)

Test-Ablauf:
1. Spieler änders gleichzeitig Inventar:
   ├─ Welt A: +10 Diamanten (12:30:00 UTC)
   ├─ Welt B: +5 Diamanten (12:30:02 UTC)
   └─ Konflikt erkannt?

2. Konflikt-Auflösung (LWW):
   ├─ Vergleiche Timestamps
   ├─ Welt B's Version gewinnt (neuer)
   └─ Finale Version: +5 Diamanten?

3. Überprüfe Datenbank:
   ├─ syncConflictDb Eintrag erstellt?
   ├─ resolution = "last_write_wins"?
   └─ Winner-Daten gespeichert?

Erwartung: Konflikt korrekt aufgelöst
Status: PASS / FAIL
```

---

### Test 3: World-Heartbeat System

**Ziel:** World-Status wird korrekt gesendet & empfangen

```
Setup:
├─ Welt A & Welt B online

Test-Ablauf:
1. Überprüfe Heartbeat-Versand:
   ├─ /syncdebug ipc
   ├─ Welt-Heartbeats section
   └─ Beide Welten zeigen ✓ ONLINE?

2. Warte 35 Sekunden (ohne Heartbeat):
   ├─ Aktualisiere: /syncdebug ipc
   └─ Welt-Status zeigt ✗ OFFLINE?

3. Heartbeat wird wieder gesendet:
   ├─ Status zurück zu ✓ ONLINE?
   └─ Alter < 5s?

Erwartung: Heartbeat-System funktioniert
Status: PASS / FAIL
```

---

### Test 4: Offline-Handling

**Ziel:** System handhabt offline Welten korrekt

```
Setup:
├─ Welt A & Welt B online
├─ Spieler auf Welt A

Test-Ablauf:
1. Welt B crash oder stoppen:
   ├─ /syncdebug ipc
   └─ Welt B zeigt ✗ OFFLINE nach 30s?

2. Neue Nachrichten werden gepuffert:
   ├─ ipcMessagesDb wächst?
   └─ Nachrichten marked als "pending"?

3. Welt B startet wieder:
   ├─ Status zurück zu ✓ ONLINE?
   ├─ Gepufferte Nachrichten versendet?
   └─ /syncdebug ipc zeigt processed Nachrichten?

Erwartung: Offline-Handling funktioniert
Status: PASS / FAIL
```

---

### Test 5: Datenbank-Persistierung

**Ziel:** Daten bleiben erhalten über Server-Restarts

```
Setup:
├─ Welt A & Welt B online
├─ Spieler logt sich ab

Test-Ablauf:
1. Spieler offline (Daten in DB):
   ├─ inv_PlayerName_global existiert?
   ├─ xp_PlayerName_global existiert?
   └─ Werte gespeichert?

2. Server 1 (Welt A) neu starten:
   ├─ Plugin lädt alle Datenbanken
   ├─ Daten sind noch da?
   └─ State wird wiederhergestellt?

3. Spieler loggt sich wieder ein:
   ├─ Inventar & XP wiederhergestellt?
   └─ Alles wie zuvor?

Erwartung: Persistierung funktioniert
Status: PASS / FAIL
```

---

## 💪 Stress-Tests

### Test 1: Viele Spieler (50+ Players)

**Ziel:** System skaliert mit vielen Spielern

```
Setup:
├─ 50+ Test-Spieler
├─ Alle auf Welt A
├─ Alle loggen sich gleichzeitig ab

Test-Ablauf:
1. Speicher-Monitoring:
   ├─ RAM-Nutzung vor Test
   ├─ RAM-Nutzung während Sync
   └─ Kein Crash?

2. Datenbank-Monitoring:
   ├─ Anzahl Einträge vor Test
   ├─ Anzahl Einträge nach Sync
   └─ Alles gespeichert?

3. Dauer-Monitoring:
   ├─ Wie lange dauert Sync?
   └─ < 30 Sekunden? (OK)

Erwartung: System bleibt stabil
Status: PASS / FAIL
```

---

### Test 2: Viele Inventar-Änderungen

**Ziel:** Viele schnelle Änderungen werden korrekt synchronisiert

```
Setup:
├─ 5 Spieler
├─ Schnelle Item-Änderungen (Custom Plugin)

Test-Ablauf:
1. Spieler 1 ändert Inventar 100x in 1 Minute:
   ├─ Konflikt-Rate?
   ├─ Keine Items verloren?
   └─ Finale Version korrekt?

2. IPC-Queue überprüfen:
   ├─ Nachrichten gepuffert?
   ├─ Verarbeitet?
   └─ Alle bestätigt?

3. Final-State überprüfen:
   ├─ Inventar konsistent?
   └─ Keine Duplikate/Verluste?

Erwartung: Alle Änderungen erfasst
Status: PASS / FAIL
```

---

### Test 3: Datenbank-Last

**Ziel:** Datenbank handhabt hohe Last

```
Setup:
├─ 100+ Spieler (simuliert)
├─ Kontinuierliche Sync-Operationen

Test-Ablauf:
1. Datenbank-Performance:
   ├─ Schreib-Speed OK?
   ├─ Lese-Speed OK?
   └─ Keine Timeout-Fehler?

2. Speicher-Wachstum:
   ├─ Ist linear mit Spielerzahl?
   └─ Keine Memory-Leak?

3. Nach Test:
   ├─ /syncdebug clear
   ├─ Alte Daten gelöscht?
   └─ Speicher freigegeben?

Erwartung: Datenbank skaliert OK
Status: PASS / FAIL
```

---

## 🌍 Real-World-Tests

### Test 1: 24-Stunden Dauerlauf

**Ziel:** System läuft stabil 24 Stunden

```
Setup:
├─ 2 Server aktiv
├─ 10-20 Spieler aktiv
├─ Kontinuierliche Aktivität

Monitoring (jede Stunde):
├─ /syncdebug ipc (keine errors?)
├─ /syncadmin (System-Status OK?)
├─ Logs überprüfen (keine unerwarteten Fehler?)
└─ Performance normal?

Nach 24 Stunden:
├─ Keine Crashes?
├─ Alle Daten konsistent?
├─ Memory-Leak?
└─ Datenbank OK?

Erwartung: Stabiler Dauerlauf
Status: PASS / FAIL
```

---

### Test 2: Szenario: Admin trainiert Team

**Ziel:** Admin kann alle Funktionen erklären

```
Test-Ablauf:
1. Admin lernt alle Commands:
   ├─ /sync, /syncworld, /syncadmin
   ├─ /syncdebug ipc/conflicts/sessions/clear
   └─ Alle verstanden?

2. Admin erklärt Spielern:
   ├─ Wie funktioniert Auto-Sync?
   ├─ Welche Befehle haben sie?
   └─ Was tun bei Problemen?

3. Team trainiert:
   ├─ Spieler verstehen System?
   ├─ Können selbst helfen?
   └─ Helpdesk vorbereitet?

Erwartung: Team ist trainiert
Status: PASS / FAIL
```

---

### Test 3: Fehler-Recovery Szenarien

**Ziel:** System erholt sich von typischen Fehlern

```
Test 1: Spieler crasht während Sync
├─ Session wird auf offline gesetzt?
└─ Daten sind korrekt?

Test 2: Datenbank-Fehler
├─ Fallback-Mechanismus aktiv?
└─ Daten nicht verloren?

Test 3: Zu viele Konflikte
├─ System wird langsam?
├─ /syncdebug clear hilft?
└─ Alles normal wieder?

Test 4: Welt-Ausfall
├─ Andere Welten funktionieren?
└─ Auto-Recovery nach Restart?

Erwartung: Alle Fehler gehandhabt
Status: PASS / FAIL
```

---

## ✅ Validierungs-Checkliste

### Funktional

```
☐ Spieler-Login triggert Auto-Sync
☐ Spieler-Logout speichert Daten
☐ Periodischer Sync läuft (alle 60s)
☐ Inventare synchronisieren zwischen Welten
☐ XP synchronisiert zwischen Welten
☐ Commands alle funktionieren
☐ Admin-Panel funktioniert
☐ Debug-Tools geben gute Infos
☐ Konflikte werden erkannt & gelöst
☐ Offline-Welten werden erkannt
```

### Datenbank

```
☐ Alle Tabellen erstellt
☐ Daten persistieren über Restarts
☐ Keine Daten-Duplikate
☐ Keine Daten-Verluste
☐ Cleanup funktioniert (alte Daten gelöscht)
☐ Datenbank-Performance OK
```

### Performance

```
☐ Login/Logout < 1 Sekunde
☐ Inventar-Sync < 200ms
☐ XP-Sync < 50ms
☐ Kein Memory-Leak
☐ CPU-Last normal (< 10%)
☐ Netzwerk-Traffic normal
```

### Fehlerbehandlung

```
☐ Fehler werden geloggt
☐ Fehler-Recovery funktioniert
☐ Keine Daten verloren bei Fehler
☐ Admin wird benachrichtigt
☐ System bleibt stabil
```

### Dokumentation

```
☐ IPC_SYSTEM.md vollständig?
☐ QUICK_START_IPC.md verständlich?
☐ TESTING_VALIDATION.md komplett?
☐ Alle Commands dokumentiert?
☐ Troubleshooting ausreichend?
```

---

## 📊 Performance-Benchmarks

### Zielwerte

| Operation | Target | Akzeptabel |
|-----------|--------|-----------|
| Player Login | < 500ms | < 1000ms |
| Player Logout | < 500ms | < 1000ms |
| Inventar-Sync | < 100ms | < 200ms |
| XP-Sync | < 20ms | < 50ms |
| Konflikt-Auflösung | < 50ms | < 100ms |
| IPC-Nachrichtenversand | < 10ms | < 50ms |
| World-Heartbeat | < 10ms | < 50ms |
| Database-Write | < 20ms | < 100ms |
| Database-Read | < 10ms | < 50ms |

### Test-Resultat-Template

```
Test: [Name]
Datum: [Datum]
Spieler: [Anzahl]
Dauer: [Länge]

Ergebnisse:
├─ Average Sync-Time: [ms]
├─ Max Sync-Time: [ms]
├─ Memory-Peak: [MB]
├─ CPU-Peak: [%]
├─ Fehler: [Anzahl]
└─ Status: PASS / FAIL

Anmerkungen:
[Beliebige Noten]
```

---

## 📝 Sign-Off

### Test-Protokoll

**Nach allen Tests bestätigen:**

```
Datum: 2025-11-11
Tester: [Admin-Name]
System: CrossServerSyncV2 v2.0.0

Alle Unit-Tests: ☐ PASS ☐ FAIL
Alle Integration-Tests: ☐ PASS ☐ FAIL
Alle Stress-Tests: ☐ PASS ☐ FAIL
Alle Real-World-Tests: ☐ PASS ☐ FAIL
Validierungs-Checkliste: ☐ 100% ☐ Teilweise
Performance-Benchmarks: ☐ OK ☐ Verbesserungen nötig

Status: ☐ READY FOR PRODUCTION ☐ NEEDS MORE WORK

Unterschrift: _________________________
```

### Production Go/No-Go

**Go-Kriterien:**

✅ Alle Unit-Tests bestanden
✅ Alle Integration-Tests bestanden
✅ Keine kritischen Fehler
✅ Performance OK
✅ Dokumentation komplett
✅ Team trainiert
✅ Backup-Plan definiert

**No-Go-Kriterien:**

❌ Daten-Verlust in Tests
❌ Kontinuierliche Crashes
❌ Memory-Leak
❌ Nicht behebbarer Bug
❌ Performance nicht akzeptabel
❌ Dokumentation unvollständig

---

## 📚 Test-Dokumentation speichern

```bash
# Test-Resultat speichern
mkdir -p /path/to/sync/test-results/
cp test-results.txt /path/to/sync/test-results/v2.0.0-$(date +%Y%m%d).txt

# Logs archivieren
cp server-logs.txt /path/to/sync/test-results/logs-$(date +%Y%m%d).txt
```

---

**Version:** 2.0.0
**Status:** ✅ Ready for Testing
**Letzte Aktualisierung:** 2025-11-11

*Ein umfassender Test-Plan für professionelle Validierung!* ✅
