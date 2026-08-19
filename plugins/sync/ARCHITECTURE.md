# 🏗️ Cross-Server Sync v2.0 - Architektur & Design

**Technische Dokumentation der automatischen Welt-Synchronisations-Architektur**

---

## 📐 System-Architektur

### Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│                   CROSS-SERVER SYNC v2.0                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  Server Instance  │         │  Server Instance  │             │
│  │  (Hauptwelt)     │         │  (Farmingwelt)   │             │
│  │                  │         │                  │             │
│  │ ┌──────────────┐ │         │ ┌──────────────┐ │             │
│  │ │ Game Logic   │ │         │ │ Game Logic   │ │             │
│  │ └──────────────┘ │         │ └──────────────┘ │             │
│  │         ↓        │         │         ↓        │             │
│  │ ┌──────────────┐ │         │ ┌──────────────┐ │             │
│  │ │ World Events │ │         │ │ World Events │ │             │
│  │ │ (Login/Out)  │ │         │ │ (Login/Out)  │ │             │
│  │ └──────────────┘ │         │ └──────────────┘ │             │
│  │         ↓        │         │         ↓        │             │
│  └─────────┬────────┘         └─────────┬────────┘             │
│            │                            │                       │
│            └─────────────┬──────────────┘                       │
│                          ↓                                       │
│           ┌──────────────────────────────┐                      │
│           │   SYNC ORCHESTRATORS         │                      │
│           │ (InventorySync, XPSync,      │                      │
│           │  PluginComm, WorldConn)      │                      │
│           └──────────────────────────────┘                      │
│                          ↓                                       │
│           ┌──────────────────────────────┐                      │
│           │   SHARED DATABASE LAYER      │                      │
│           │ (Data persistence across     │                      │
│           │  server restarts)            │                      │
│           └──────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Schichten-Architektur

```
┌─────────────────────────────────────────┐
│     EVENT & UI LAYER                    │
│  (Admin-Panels, Spieler-Nachrichten)    │
├─────────────────────────────────────────┤
│     MANAGER LAYER                       │
│  (Sync Manager, World Manager, etc.)    │
├─────────────────────────────────────────┤
│     DATABASE LAYER                      │
│  (Persistent Storage & Messaging)       │
├─────────────────────────────────────────┤
│     MINECRAFT API LAYER                 │
│  (player.inventory, player.level, etc.) │
└─────────────────────────────────────────┘
```

---

## 🔧 Core Manager Classes

### 1. WorldConnectionManager

**Zweck:** Verwaltung von Welt-Verbindungen

**Verantwortung:**
- Lädt Welt-Konfigurationen beim Start
- Verwaltet bidirektionale Verbindungen
- Initialisiert neue Welten

**Klassenmethoden:**
```javascript
class WorldConnectionManager {
  static initializeWorlds()           // Beim Start
  static getConnectedWorlds(fromId)   // Finde verbundene Welten
  static connectWorlds(id1, id2)      // Erstelle Verbindung
  static disconnectWorlds(id1, id2)   // Entferne Verbindung
}
```

**Datenquellen:**
- `worldConnections` Map (in-memory Cache)
- `connectionDb` Tabelle (persistent)
- `DEFAULT_WORLDS` Konstante (default config)

---

### 2. InventorySyncManager

**Zweck:** Verwaltung der Inventar-Synchronisation

**Verantwortung:**
- Speichert Spieler-Inventare
- Stellt Inventare wieder her
- Verwaltet Verzauberungen und Items

**Klassenmethoden:**
```javascript
class InventorySyncManager {
  static saveInventory(playerName, worldId)
  static restoreInventory(playerName, worldId)
  static getLatestInventory(playerName)
  static getEnchantments(item)
}
```

**Datenquellen:**
- `player.getComponent("minecraft:inventory")`
- `inventoryDb` Tabelle (backups)

**Item-Serialisierung:**
```javascript
{
  slot: 0,
  typeId: "minecraft:diamond_sword",
  amount: 1,
  data: 0,
  nameTag: null,
  lore: [],
  enchantments: [
    { type: "minecraft:sharpness", level: 5 }
  ]
}
```

---

### 3. XPSyncManager

**Zweck:** Verwaltung der XP/Level-Synchronisation

**Verantwortung:**
- Speichert Spieler-Level und XP
- Stellt Level und XP wieder her
- Berechnet XP-Prozentsatz

**Klassenmethoden:**
```javascript
class XPSyncManager {
  static saveXP(playerName, worldId)
  static restoreXP(playerName, worldId)
  static getLatestXP(playerName)
}
```

**Datenquellen:**
- `player.level` (Minecraft API)
- `player.xpEarnedAtCurrentLevel` (API)
- `player.totalXpNeededForNextLevel` (API)
- `xpDb` Tabelle (backups)

**XP-Daten-Format:**
```javascript
{
  playerName: "Alex",
  worldId: "main",
  level: 30,
  xpPercentage: 0.75,      // 75% zur nächsten Level
  totalXP: 1234,           // Gesamt-XP berechnet
  timestamp: "ISO-String"
}
```

---

### 4. PluginCommunicationManager

**Zweck:** Inter-Plugin-Kommunikation zwischen Servern

**Verantwortung:**
- Sendet Sync-Events zwischen Servern
- Verarbeitet eingehende Events
- Validiert Event-Kanäle

**Klassenmethoden:**
```javascript
class PluginCommunicationManager {
  static broadcastSyncEvent(playerName, eventType, data)
  static receiveAndProcessSyncEvents(playerName)
  static notifyWorldConnection(fromId, toId, status)
}
```

**Nachrichtenformat:**
```javascript
{
  from: "CrossServerSyncV2",
  timestamp: 1234567890,
  playerName: "Alex",
  eventType: "sync_inventory",  // oder sync_xp, player_logout, etc.
  data: { ... },
  channel: "crossserver_sync_channel"
}
```

**Event-Typen:**
| Typ | Auslöser | Daten |
|-----|----------|-------|
| `sync_inventory` | Inventar-Speicherung | toWorld, inventorySynced |
| `sync_xp` | XP-Speicherung | toWorld, xpSynced |
| `sync_player_data` | Komplettes Sync | fromWorld, toWorld, flags |
| `player_login` | Spieler joinet | timestamp |
| `player_logout` | Spieler loggt aus | savedAt |
| `world_connection` | Welten verbunden | status |

---

### 5. AutoSyncOrchestrator

**Zweck:** Orchestrierung des kompletten Sync-Prozesses

**Verantwortung:**
- Koordiniert Inventar + XP Sync
- Sendet Inter-Plugin-Events
- Verwaltet Sync-Queue
- Benachrichtig Spieler & Discord

**Klassenmethoden:**
```javascript
class AutoSyncOrchestrator {
  static async syncPlayer(playerName, fromWorldId, toWorldId)
  static async completeSync(playerName, toWorldId)
}
```

**Sync-Prozess (Ablauf):**
```
syncPlayer() aufgerufen
  │
  ├─→ Speichere Inventar
  ├─→ Speichere XP
  ├─→ Sende broadcastSyncEvent
  ├─→ Markiere als ausstehend in pendingSyncQueue
  └─→ Discord-Notification

(Spieler transferiert zu anderem Server)

completeSync() aufgerufen
  │
  ├─→ Finde Spieler-Objekt
  ├─→ Stelle Inventar wieder her
  ├─→ Stelle XP wieder her
  ├─→ Update playerSyncDb Eintrag
  ├─→ Entferne aus pendingSyncQueue
  ├─→ Spieler-Nachricht senden
  └─→ Discord-Notification
```

---

## 🔄 Event-Flow Diagramme

### Szenario 1: Spieler loggt aus (Automatischer Trigger)

```
┌─────────────────────────────────────────────────────┐
│ beforeEvents.playerLeave triggered                  │
│ (Spieler loggt aus)                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
     ┌───────────────────────────┐
     │ if config.syncOnLogout     │ (default: true)
     └───────────┬───────────────┘
                 │
     ┌───────────┴──────────────────────────┐
     ↓                                       ↓
InventorySyncManager           XPSyncManager
.saveInventory()               .saveXP()
  │                              │
  ├─ Hole container             ├─ Hole player.level
  ├─ Iterate slots              ├─ Berechne XP%
  ├─ Speichere in inventoryDb   ├─ Speichere in xpDb
  └─ Log "Inventar gespeichert" └─ Log "XP gespeichert"
     │                              │
     └──────────────┬───────────────┘
                    ↓
        ┌───────────────────────────────┐
        │ broadcastSyncEvent()          │
        │ eventType: "player_logout"    │
        ├───────────────────────────────┤
        │ Speichere Event in worldSyncDb│
        └───────────────────────────────┘
                    │
                    ↓
         [Datenbank] Event wartet
         auf Lesezugriff vom anderen Server
```

### Szenario 2: Spieler loggt ein (Automatischer Trigger)

```
┌─────────────────────────────────────────────────────┐
│ afterEvents.playerSpawn triggered                   │
│ (Spieler joinet Server)                             │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
     ┌───────────────────────────┐
     │ if config.syncOnLogin      │ (default: true)
     └───────────┬───────────────┘
                 │
     ┌───────────┴──────────────────────────┐
     ↓                                       ↓
InventorySyncManager           XPSyncManager
.restoreInventory()            .restoreXP()
  │                              │
  ├─ getLatestInventory()        ├─ getLatestXP()
  ├─ Durchsuche inventoryDb      ├─ Durchsuche xpDb
  ├─ Finde neuesten Eintrag      ├─ Finde neuesten Eintrag
  ├─ Hole container              ├─ Setze player.level
  ├─ Leere alte Items            ├─ Berechne XP neu
  ├─ Setze neue Items            └─ Log "XP wiederhergestellt"
  ├─ Addiere Verzauberungen
  └─ Log "Inventar wiederhergestellt"
     │                              │
     └──────────────┬───────────────┘
                    ↓
        ┌───────────────────────────────────┐
        │ player.sendMessage()              │
        │ "✓ Deine Daten synchronisiert!"   │
        └───────────────────────────────────┘
                    │
                    ↓
        ┌───────────────────────────────────┐
        │ receiveAndProcessSyncEvents()     │
        │ Verarbeite ausstehende Events     │
        └───────────────────────────────────┘
```

### Szenario 3: Periodische Hintergrund-Sync

```
┌─────────────────────────────────────────────────────┐
│ system.runInterval() triggered                      │
│ (Alle autoSyncInterval Sekunden, default: 60)       │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
    ┌────────────────────────────┐
    │ Für ALLE online Spieler:   │
    └────────────┬───────────────┘
                 │
                 ↓
    ┌────────────────────────────────────┐
    │ playerLastSync Zeit überprüfen     │
    │ if (now - lastSync) > interval     │
    └────────────┬───────────────────────┘
                 │
                 ├─ JA: Sync durchführen
                 │   ├─ InventorySyncManager.saveInventory()
                 │   ├─ XPSyncManager.saveXP()
                 │   ├─ Update playerLastSync[playerName]
                 │   └─ Log "Periodic Auto-Sync"
                 │
                 └─ NEIN: Überspringe (noch nicht fällig)
```

---

## 💾 Datenbank-Design

### Tabellen-Übersicht

```
┌──────────────────────────────────────────────────────┐
│           DATENBANK-ARCHITEKTUR                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  crossSync_worlds_v2                                │
│  ├─ world_world1                                    │
│  ├─ world_world2                                    │
│  └─ world_custom                                    │
│                                                      │
│  crossSync_players_v2                               │
│  ├─ player_Alex                                     │
│  ├─ player_Bob                                      │
│  └─ player_Charlie                                  │
│                                                      │
│  crossSync_inventory_v2                             │
│  ├─ inv_Alex_main_1234567890                        │
│  ├─ inv_Alex_farming_1234567890                     │
│  ├─ inv_Bob_main_1234567891                         │
│  └─ (zeitgestempelt, mehrere pro Spieler)           │
│                                                      │
│  crossSync_xp_v2                                    │
│  ├─ xp_Alex_main_1234567890                         │
│  ├─ xp_Alex_farming_1234567890                      │
│  └─ (zeitgestempelt, mehrere pro Spieler)           │
│                                                      │
│  crossSync_logs_v2                                  │
│  ├─ log_1234567890_0.123                            │
│  ├─ log_1234567891_0.456                            │
│  └─ (chronologische Einträge)                       │
│                                                      │
│  crossSync_connections_v2                           │
│  ├─ world_world1                                    │
│  └─ world_world2                                    │
│                                                      │
│  worldSyncDb (für Inter-Plugin Messaging)           │
│  ├─ msg_Alex_player_logout_1234567890               │
│  ├─ msg_Bob_sync_player_data_1234567891             │
│  └─ notif_world1_world2_connected_1234567892        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Datenbank-Query-Pattern

#### Speichern
```javascript
const key = `inv_${playerName}_${worldId}_${Date.now()}`;
inventoryDb.set(key, inventoryData);
```

#### Abrufen (Neuestes)
```javascript
const allEntries = inventoryDb.getAllValuesWithKeys?.() || [];
const latest = allEntries
  .filter(e => e.key.startsWith(`inv_${playerName}`))
  .sort((a, b) => new Date(b.value.timestamp) - new Date(a.value.timestamp))[0];
```

#### Löschen (Cleanup)
```javascript
const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
allEntries
  .filter(e => new Date(e.value.timestamp).getTime() < sevenDaysAgo)
  .forEach(e => inventoryDb.delete(e.key));
```

---

## 🔌 Inter-Server Communication Protocol

### Nachrichtenkanal

```
Server A (Instance 1)          Shared Database          Server B (Instance 2)
     │                              │                         │
     ├─ Player Logout           →   │ msg_Player_logout_xxx  →  │
     ├─ Save Inventory          →   │ inv_Player_world_xxx   →  │
     └─ Save XP                 →   │ xp_Player_world_xxx    →  │
                                                               │
                                                         Event Processor
                                                         receiveAndProcessSyncEvents()
                                                         ├─ Liest Nachricht
                                                         ├─ Validiert Daten
                                                         ├─ Wendet Änderungen an
                                                         └─ Löscht Nachricht
```

### Messaging-Garantien

**At-Least-Once Delivery:**
- Nachrichten in DB geschrieben
- Nicht gelöscht bis bestätigt
- Server-Neustart verliert nicht Nachrichten

**Ordering:**
- Nicht garantiert global
- Timestamp basiert für Konflikt-Auflösung
- Neueste Daten gewinnen

**Latency:**
- Abhängig von Datenbank-Performance
- Typ 5-100ms Normal
- Im schlimmsten Fall: Server-Neustart könnte verzögern

---

## 🎯 Design-Entscheidungen

### Warum Datenbank für IPC?

**Vorteile:**
- ✅ Persistent über Server-Neustarts
- ✅ Works auch über Network Delays
- ✅ Einfach zu implementieren
- ✅ Keine zusätzliche Infra nötig

**Alternative (nicht gewählt):**
- ❌ WebSockets - Kompliziert, kurzfristig
- ❌ Redis - Zusätz-Abhängigkeit
- ❌ Files - Slow, keine Locks

### Warum mehrere Backup-Versionen?

**Gründe:**
- ✅ Fallback wenn Restauration fehlschlägt
- ✅ Spieler können früheres Backup laden
- ✅ Audit-Trail für Admin
- ✅ Recovery bei Datenverlust

**Cleanup-Strategie:**
- Alte Backups älter als 7 Tage löschen (optional)
- Oder manuell adminnen via Datenbank

### Warum periodisches Backup?

**Gründe:**
- ✅ Fallback falls Login/Logout Sync fehlschlägt
- ✅ Captures Fortschritt während Spielzeit
- ✅ Reduziert Datenverlust-Risiko
- ✅ Configurable für verschiedene Server-Größen

---

## 📈 Skalierbarkeit

### Performance-Charakteristiken

| Operation | Komplexität | Dauer | Scalability |
|-----------|------------|-------|-------------|
| saveInventory() | O(n) Items | ~10ms | Gut |
| restoreInventory() | O(n) Items | ~15ms | Gut |
| saveXP() | O(1) | ~2ms | Excellent |
| restoreXP() | O(1) | ~2ms | Excellent |
| getLatestInventory() | O(m) Backups | ~50ms | Gut (cleanup) |
| receiveAndProcessSyncEvents() | O(p) Msgs | ~30ms | Gut |
| Periodic Sync (100 Players) | O(p) | ~500ms | OK (pro Tick) |

### Empfohlene Limits

```javascript
// Kleiner Server
Players: 1-10
autoSyncInterval: 30  // Sekunden
Max Backups: 100+ OK

// Mittlerer Server
Players: 10-50
autoSyncInterval: 60  // Standard
Max Backups: 50+, cleanup nach 3 Tagen

// Großer Server
Players: 50+
autoSyncInterval: 300  // 5 Minuten
Cleanup: Nightly, nach 1 Tag
```

---

## 🔐 Fehlerbehandlung

### Fehler-Kategorien

#### 1. Player-Fehler
```javascript
// Player offline oder nicht gefunden
→ Log Warn
→ Überspringen, nächste Periode retry
```

#### 2. Datenbank-Fehler
```javascript
// DB nicht erreichbar
→ Log Error
→ Try-Catch fallback
→ Nächste Periode retry
```

#### 3. Minecraft-API-Fehler
```javascript
// Enchantment nicht kompatibel
→ Try-Catch halten
→ Skip incompatible
→ Continue with rest
```

#### 4. Serialisierung-Fehler
```javascript
// Item kann nicht serialisiert werden
→ Skip Item
→ Log Warn
→ Fortfahren mit nächstem Item
```

### Recovery-Strategien

```
Error Event
  │
  ├─ Kritisch? (DB down)
  │  └─ Sache auf Retry-Queue
  │     (Nächste Periode retry)
  │
  ├─ Halb-kritisch? (Item fehlgeschlagen)
  │  └─ Überspringe Item
  │     (Andere Items OK)
  │
  └─ Nicht-kritisch? (Log schreiben fehlgeschlagen)
     └─ Stille Fehler
        (Game läuft normal)
```

---

## 🧪 Test-Strategien

### Unit-Tests (für jeden Manager)

```javascript
// WorldConnectionManager
✓ initializeWorlds() lädt defaults
✓ getConnectedWorlds() returned richtig
✓ connectWorlds() erstellt bidirektional
✓ disconnectWorlds() removes correctly

// InventorySyncManager
✓ saveInventory() speichert alle Items
✓ restoreInventory() restored alle Items
✓ getLatestInventory() returned newest
✓ getEnchantments() extracts korrekt

// XPSyncManager
✓ saveXP() speichert Level korrekt
✓ restoreXP() sets Level korrekt
✓ getLatestXP() returned newest

// PluginCommunicationManager
✓ broadcastSyncEvent() schreibt zu DB
✓ receiveAndProcessSyncEvents() liest und verarbeitet
✓ notifyWorldConnection() sendet Notif
```

### Integration-Tests

```javascript
// Full-Flow Tests
✓ Player Login → Inventory restored
✓ Player Logout → Data saved
✓ World Switch → Data transferred
✓ Periodic Sync → Updates database
✓ Multiple Worlds → Data isolated
✓ Concurrent Players → No conflicts
```

### Load-Tests

```javascript
✓ 10 Players simultane Syncs
✓ 100 Players periodic backups
✓ Large Inventories (50+ items)
✓ Many Enchantments (10+ per item)
✓ Database Growth (1000+ entries)
```

---

## 📊 Monitoring & Observability

### Key Metrics

| Metrik | Typ | Empfohlen |
|--------|-----|-----------|
| Sync Duration | Latenz | <100ms |
| Success Rate | Reliability | >99.9% |
| DB Size | Storage | <500MB |
| Event Queue | Queue | <10 messages |
| Player Count | Gauge | Live |
| Errors/Hour | Counter | <5 |

### Logging-Strategie

```javascript
// ERROR Level
- DB Verbindungsfehler
- Player-Objekt nicht gefunden
- Kritische Exceptions

// WARN Level
- Item-Serialisierung fehlgeschlagen
- Keine Backups gefunden
- Enchantment nicht kompatibel

// SUCCESS Level
- Daten gespeichert/wiederhergestellt
- Welt verbunden/getrennt
- System initialisiert

// INFO Level
- Periodic Sync durchgeführt
- Player Login/Logout
- Admin-Aktion
```

---

## 🚀 Deployment-Strategie

### Vor Production

```
1. ✅ Syntax validieren
   node -c crossServerSync_v2.js

2. ✅ Funktional testen
   - Single Server Test
   - Inventory Sync Test
   - XP Sync Test
   - Admin Panel Test

3. ✅ Load testen
   - 10+ Players
   - Rapid Login/Logout
   - Large Inventories

4. ✅ Integration testen
   - Discord Notifications
   - Datenbank Persistierung
   - Server Neustart

5. ✅ Production Checkliste
   - Alle Tests bestanden
   - Keine Warnings in Logs
   - Performance akzeptabel
   - Backup-Strategie definiert
```

### Rolling Deployment

```
1. Test auf Dev Server
2. Deploy auf 1 Production Server
3. Monitor für 24 Stunden
4. Deploy auf anderen Servern
5. Full Production
```

---

## 📝 Code-Qualität

### Coding-Standards

- ✅ Fehler-Handling mit Try-Catch
- ✅ Aussagekräftige Variablen-Namen
- ✅ Dokumentierte Funktionen
- ✅ Logs für Debugging
- ✅ Validierung von Eingaben
- ✅ Keine Magic Numbers

### Performance-Optimierungen

- ✅ In-Memory Caches (Maps)
- ✅ Effiziente Array-Iterationen
- ✅ Timestamp-basierte Sortierung
- ✅ Prefix-basierte Suche
- ✅ Optional Chaining (`?.`)

---

## 🎓 Zusammenfassung

**Architektur-Highlights:**

✅ **Modular** - Verschiedene Manager für verschiedene Concerns
✅ **Persistent** - Alle Daten in Datenbank gespeichert
✅ **Zuverlässig** - Mehrere Trigger & Fallbacks
✅ **Skalierbar** - Funktioniert mit 1-100+ Spielern
✅ **Simple** - Keine externe Abhängigkeiten
✅ **Transparent** - Automatic für Spieler

**Nächste Schritte:**
- Installieren & Testen
- Monitoring einrichten
- Production deployen
- Feedback sammeln

---

**Version:** 2.0.0
**Architektur Status:** ✅ Finalisiert
**Dokumentation Status:** ✅ Vollständig
