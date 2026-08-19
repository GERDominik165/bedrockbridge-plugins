# 🌐 Cross-Server Sync v2.0 - Konfigurationsanleitung

**Professionelles Automatisches Welt-Synchronisations-System**

## 📋 Inhaltsverzeichnis

1. [Automatische Synchronisation](#automatische-synchronisation)
2. [Welt-Verbindungsverwaltung](#welt-verbindungsverwaltung)
3. [Inter-Plugin Communication](#inter-plugin-communication)
4. [Admin-Commands](#admin-commands)
5. [Datenbank-Struktur](#datenbank-struktur)
6. [Troubleshooting](#troubleshooting)

---

## 🔄 Automatische Synchronisation

### Was ist neu in v2.0?

Das v2.0 System synchronisiert Spielerdaten **automatisch** zwischen verbundenen Welten:

- ✅ **Inventar-Sync on Login** - Spieler-Inventar wird automatisch wiederhergestellt
- ✅ **Inventar-Sync on Logout** - Spieler-Inventar wird vor dem Ausloggen gespeichert
- ✅ **XP/Level-Sync** - Spieler-Erfahrung wird automatisch synchronisiert
- ✅ **Periodisches Backup** - Regelmäßige Hintergrund-Synchronisation alle 60 Sekunden (konfigurierbar)
- ✅ **Inter-Server-Kommunikation** - Plugins auf verschiedenen Servern kommunizieren über Datenbank

### Konfiguration der Auto-Sync

Öffne `crossServerSync_v2.js` und ändere diese Einstellungen:

```javascript
const DEFAULT_CONFIG = {
  // === AKTIVIERUNG ===
  enabled: true,                    // Gesamtes System an/aus
  autoSyncEnabled: true,            // Auto-Sync aktivieren/deaktivieren

  // === AUTOMATISCHE TRIGGER ===
  syncOnLogin: true,                // Sofort synchen wenn Spieler eintritt
  syncOnLogout: true,               // Beim Ausloggen synchen

  // === SYNC-TYPEN ===
  syncInventory: true,              // Inventar synchronisieren
  syncXP: true,                     // XP/Level synchronisieren
  syncHealth: false,                // (Optional) Gesundheit synchronisieren

  // === TIMING ===
  autoSyncInterval: 60,             // Periodische Sync alle 60 Sekunden
                                    // (Wert in Sekunden)
                                    // Beispiele: 30, 60, 300 (5 Min)

  // === INTEGRATION ===
  discordLogging: true,             // Discord-Benachrichtigungen
  worldConnections: DEFAULT_WORLDS   // Welt-Verbindungen
};
```

### Praktische Beispiele

**Schnelle Synchronisation (30 Sekunden):**
```javascript
autoSyncInterval: 30  // Spieler-Daten werden alle 30 Sekunden gespeichert
```

**Normale Synchronisation (1 Minute):**
```javascript
autoSyncInterval: 60  // Standard, empfohlen
```

**Langsame Synchronisation (5 Minuten - für große Server):**
```javascript
autoSyncInterval: 300 // Reduziert Server-Last
```

---

## 🌍 Welt-Verbindungsverwaltung

### Welten konfigurieren

Die Standard-Konfiguration mit zwei Welten:

```javascript
const DEFAULT_WORLDS = {
  world1: {
    id: "world1",                 // Eindeutige Welt-ID
    name: "Hauptwelt",            // Anzeigename
    icon: "🏠",                   // Emoji für UI
    enabled: true,                // Welt aktiv/inaktiv
    autoSync: true,               // Auto-Sync für diese Welt
    discord_webhook: "",          // Optional: Discord-Webhook
    connected_to: []              // Verbundene Welten
  },
  world2: {
    id: "world2",
    name: "Farmingwelt",
    icon: "🌾",
    enabled: true,
    autoSync: true,
    discord_webhook: "",
    connected_to: ["world1"]      // Diese Welt ist mit world1 verbunden
  }
};
```

### Welten über Admin-Panel verwalten

**Befehl:**
```
/syncworld
```

**Verfügbare Optionen:**

1. **➕ Neue Welt hinzufügen** - Neue Welt-ID und Name eingeben
2. **🔗 Welten verbinden** - Zwei Welten bidirektional verbinden
3. **❌ Welten trennen** - Verbindung zwischen zwei Welten aufheben
4. **📊 Verbindungsstatus** - Aktuelle Welt-Verbindungen anzeigen
5. **⚙️ Auto-Sync Einstellungen** - Sync-Optionen aktivieren/deaktivieren

### Beispiel: Neue Welten verbinden

1. Admin gibt `/syncworld` ein
2. Wählt "➕ Neue Welt hinzufügen"
3. Gibt Welt-ID (z.B. "pvp_world") und Name (z.B. "PvP-Arena") ein
4. Wählt "🔗 Welten verbinden"
5. Wählt "Hauptwelt" → "PvP-Arena"
6. Verbindung ist aktiv ✓

---

## 🔌 Inter-Plugin Communication

### Wie funktioniert die Kommunikation zwischen Servern?

Das System nutzt die **Datenbank als Nachrichtenkanal**:

```
[Server 1 - Farming-Welt]           [Datenbank]           [Server 2 - Hauptwelt]
        ↓                               ↓↑                        ↑
   Spieler loggt aus          Speichert Sync-Events      Liest Events und
   → Inventar wird                      ↓                stellt Inventar wieder her
     gespeichert              `msg_PlayerName_*`
```

### Synchronisierungs-Ablauf

**Beispiel: Spieler wechselt von Farming-Welt zur Hauptwelt**

1. **Spieler loggt aus (Farmingwelt):**
   ```
   beforeEvents.playerLeave triggers
   → InventorySyncManager.saveInventory(playerName, "farming")
   → XPSyncManager.saveXP(playerName, "farming")
   → broadcastSyncEvent("player_logout")
   ```

2. **Nachricht wird in Datenbank gespeichert:**
   ```
   worldSyncDb.set("msg_PlayerName_player_logout_1234567890", {
     playerName: "PlayerName",
     eventType: "player_logout",
     savedAt: "2025-11-11T10:30:00.000Z"
   })
   ```

3. **Spieler joinet Hauptwelt:**
   ```
   afterEvents.playerSpawn triggers
   → receiveAndProcessSyncEvents(playerName)
   → Sucht nach "msg_PlayerName_*" in worldSyncDb
   → Findet letztes Backup
   ```

4. **Inventar wird wiederhergestellt:**
   ```
   → InventorySyncManager.restoreInventory(playerName, "main")
   → XPSyncManager.restoreXP(playerName, "main")
   → player.sendMessage("✓ Deine Daten wurden synchronisiert!")
   ```

### Event-Typen

Das System sendet folgende Event-Typen:

| Event-Type | Beschreibung | Daten |
|------------|-------------|-------|
| `sync_player_data` | Komplettes Spieler-Sync | fromWorld, toWorld, inventorySynced, xpSynced |
| `sync_inventory` | Nur Inventar-Sync | toWorld, inventorySynced |
| `sync_xp` | Nur XP-Sync | toWorld, xpSynced |
| `player_login` | Spieler betritt Server | timestamp |
| `player_logout` | Spieler verlässt Server | savedAt |
| `world_connection` | Welt-Verbindung geändert | status (connected/disconnected) |

---

## 🛠️ Admin-Commands

### Haupt-Admin-Befehl

```bash
/syncworld
```

Öffnet das Welt-Verwaltungspanel mit allen Admin-Tools.

### Was können Admins tun?

| Option | Funktion |
|--------|----------|
| **➕ Neue Welt hinzufügen** | Registriert neue Welt im System |
| **🔗 Welten verbinden** | Erstellt bidirektionale Verbindung zwischen zwei Welten |
| **❌ Welten trennen** | Entfernt Verbindung zwischen Welten |
| **📊 Verbindungsstatus** | Zeigt alle Welten und ihre Verbindungen |
| **⚙️ Auto-Sync Einstellungen** | Aktiviert/Deaktiviert Sync-Funktionen |

---

## 💾 Datenbank-Struktur

v2.0 erstellt automatisch 6 spezialisierte Datenbank-Tabellen:

### 1. `crossSync_worlds_v2` - Welt-Konfiguration
```javascript
{
  world_world1: {
    id: "world1",
    name: "Hauptwelt",
    icon: "🏠",
    enabled: true,
    autoSync: true,
    discord_webhook: "",
    connected_to: ["world2", "world3"]
  }
}
```

### 2. `crossSync_players_v2` - Spieler-Sync-Daten
```javascript
{
  player_PlayerName: {
    playerName: "PlayerName",
    lastSyncTime: "2025-11-11T10:30:00.000Z",
    lastSyncFromWorld: "farming",
    lastSyncToWorld: "main",
    syncCount: 42
  }
}
```

### 3. `crossSync_inventory_v2` - Inventar-Backups
```javascript
{
  inv_PlayerName_main_1234567890: {
    playerName: "PlayerName",
    worldId: "main",
    timestamp: "2025-11-11T10:30:00.000Z",
    items: [
      {
        slot: 0,
        typeId: "minecraft:diamond_sword",
        amount: 1,
        data: 0,
        nameTag: null,
        lore: [],
        enchantments: [
          { type: "minecraft:sharpness", level: 5 },
          { type: "minecraft:unbreaking", level: 3 }
        ]
      }
    ]
  }
}
```

### 4. `crossSync_xp_v2` - XP/Level-Backups
```javascript
{
  xp_PlayerName_main_1234567890: {
    playerName: "PlayerName",
    worldId: "main",
    timestamp: "2025-11-11T10:30:00.000Z",
    level: 30,
    xpPercentage: 0.75,
    totalXP: 1234
  }
}
```

### 5. `crossSync_logs_v2` - System-Logs
```javascript
{
  log_1234567890_0.123: {
    timestamp: "2025-11-11T10:30:00.000Z",
    message: "Inventar gespeichert: PlayerName (main)",
    level: "success",
    logId: "log_1234567890_0.123"
  }
}
```

### 6. `crossSync_connections_v2` - Welt-Verbindungen
```javascript
{
  world_world1: {
    id: "world1",
    connected_to: ["world2"]
  }
}
```

---

## 🐛 Troubleshooting

### Problem: Inventar wird nicht wiederhergestellt

**Ursachen:**
1. `syncOnLogin` ist deaktiviert
2. Spieler hat kein Backup von der vorherigen Welt
3. Welten sind nicht korrekt verbunden

**Lösungen:**
```javascript
// 1. Überprüfe Einstellung
config.syncOnLogin = true;

// 2. Admin-Panel nutzen
/syncworld → "📊 Verbindungsstatus" → Welten-Verbindungen überprüfen

// 3. Manueller Trigger im Server-Log
// (In v2.0 läuft alles automatisch, aber du kannst manuell speichern lassen)
```

### Problem: XP wird nicht synchronisiert

**Ursachen:**
1. `syncXP` ist deaktiviert
2. `player.level` kann nicht auf diesem Server gesetzt werden
3. Der Spieler hat keine gespeicherten XP-Daten

**Lösungen:**
```javascript
// 1. Überprüfe Einstellung
config.syncXP = true;

// 2. Überprüfe Logs
/syncadmin → "📜 Logs anzeigen" (v1.0 - funktioniert auch in v2.0)

// 3. Server-Log auf Fehler überprüfen
// Suche nach: "XP restore error"
```

### Problem: Discord-Benachrichtigungen fehlen

**Ursachen:**
1. `discordLogging` ist deaktiviert
2. `bridgeDirect` ist nicht korrekt konfiguriert
3. Discord-Webhook URL ist ungültig

**Lösungen:**
```javascript
// 1. Discord aktivieren
config.discordLogging = true;

// 2. BedrockBridge Discord konfigurieren
// Überprüfe deine BedrockBridge main config
```

### Problem: Spieler doppelte Inventare

**Ursachen:**
1. `syncOnLogout` speichert Inventar
2. `autoSyncInterval` speichert nochmal
3. Könnte zu doppelten Einträgen führen

**Lösungen:**
```javascript
// Entweder syncOnLogout oder autoSyncInterval reduzieren
// NICHT beide auf sehr kleine Werte setzen

// Empfohlen:
syncOnLogout: true,         // Speichert beim Ausloggen
autoSyncInterval: 300,      // Nur als Backup alle 5 Min
```

### Problem: Zu viele Datenbank-Einträge

Das System speichert automatisch mehrere Inventar/XP-Versionen.

**Lösung - Alte Einträge löschen (optional):**

```javascript
// Entferne alte Backups älter als 7 Tage
function cleanOldBackups() {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  // Inventar bereinigen
  const invEntries = inventoryDb.getAllValuesWithKeys?.() || [];
  invEntries.forEach(({ key, value }) => {
    if (value?.timestamp && new Date(value.timestamp).getTime() < sevenDaysAgo) {
      inventoryDb.delete(key);
    }
  });

  log("Old backups cleaned", "success");
}

// Rufe auf, wenn nötig:
// cleanOldBackups();
```

---

## 📊 Performance & Optimierung

### Empfohlen für verschiedene Server-Größen

**Kleine Server (1-10 Spieler):**
```javascript
autoSyncInterval: 30        // Häufigere Syncs
syncOnLogin: true
syncOnLogout: true
discordLogging: true
```

**Mittlere Server (10-50 Spieler):**
```javascript
autoSyncInterval: 60        // Standard
syncOnLogin: true
syncOnLogout: true
discordLogging: true
```

**Große Server (50+ Spieler):**
```javascript
autoSyncInterval: 300       // 5 Minuten - reduziert Last
syncOnLogin: true
syncOnLogout: true
discordLogging: false       // Oder begrenzt
```

### Monitoring

Das System loggt automatisch alle Aktivitäten:

```
[CrossServerSyncV2 10:30:00] ✅ Inventar gespeichert: PlayerName (farming)
[CrossServerSyncV2 10:30:05] ✅ Sync-Event gesendet: PlayerName - player_logout
[CrossServerSyncV2 10:30:10] ✅ Letztes Inventar gefunden: PlayerName
[CrossServerSyncV2 10:30:15] ✅ Inventar wiederhergestellt: PlayerName
```

---

## ✅ Checkliste für Production

Vor dem Live-Betrieb:

- [ ] Welten sind mit `/syncworld` korrekt verbunden
- [ ] Auto-Sync ist aktiviert (`autoSyncEnabled: true`)
- [ ] `syncOnLogin` und `syncOnLogout` sind aktiviert
- [ ] Discord-Integration getestet
- [ ] `autoSyncInterval` auf passenden Wert eingestellt (60-300s)
- [ ] Test-Spieler haben Inventare erfolgreich übertragen
- [ ] XP/Level wird korrekt synchronisiert
- [ ] Logs zeigen keine Fehler
- [ ] Datenbank-Speicherplatz ist ausreichend

---

## 🚀 Nächste Schritte

1. **Installation:** `INSTALLATION.md` lesen
2. **Testen:** Mit Test-Spielern transferieren
3. **Monitorieren:** Logs regelmäßig überprüfen
4. **Optimieren:** `autoSyncInterval` anpassen basierend auf Performance

---

**Version:** 2.0.0
**Status:** ✅ Production Ready
**Letzte Aktualisierung:** 2025-11-11
