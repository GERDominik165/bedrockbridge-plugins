# 🌐 Cross-Server Sync Plugin - Konfiguration & Dokumentation

## 📋 Überblick

Das **Cross-Server Sync Plugin** verbindet zwei oder mehr unabhängige Bedrock Server miteinander und ermöglicht es Spielern, ihre **Inventare und Spielerdaten** nahtlos zwischen den Servern zu synchronisieren.

### Perfekt für:
- Farmingwelt ↔ Hauptwelt
- Minigames-Server ↔ Survivalwelt
- Mehrere spezialisierte Server-Cluster

---

## 🎯 Kernfunktionalität

### 1. **Inventar-Synchronisation**
- ✅ Speichert das komplette Inventar beim Transfer
- ✅ Stellt das Inventar beim Eintritt wieder her
- ✅ Verwaltet Verzauberungen und Namenszettel
- ✅ Mehrere Backups pro Spieler
- ✅ Automatische Sicherung im Hintergrund

### 2. **Spieler-Profile-System**
- ✅ Automatische Profilerstellung beim ersten Login
- ✅ Transfer-Verlauf und Statistiken
- ✅ Cooldown-Management
- ✅ Whitelist/Blacklist-Unterstützung
- ✅ Ban-System für problematische Spieler

### 3. **Transfer-Verwaltung**
- ✅ Nahtlose Server-Übergänge
- ✅ Konfigurierbarer Transfer-Cooldown
- ✅ Validierung vor dem Transfer
- ✅ Discord-Benachrichtigungen
- ✅ Fehlerbehebung und Fallback-Systeme

### 4. **Admin-Tools**
- ✅ Spieler-Verwaltung
- ✅ Backup erstellen
- ✅ System-Status prüfen
- ✅ Konfiguration verwalten
- ✅ Logs einsehen

---

## 🔧 Konfigurationsoptionen

```javascript
DEFAULT_CONFIG = {
  // Plugin-Status
  enabled: true,                    // Plugin aktivieren/deaktivieren
  syncEnabled: true,                // Synchronisation aktivieren

  // Datensicherung
  discordLogging: true,             // Discord-Benachrichtigungen senden
  autoSaveInventory: true,          // Automatische Inventar-Sicherung
  autoSaveInterval: 600,            // Sicherungs-Intervall in Sekunden (600 = 10 Min)
  maxStoredInventories: 50,         // Max. Inventar-Backups pro Spieler

  // Transfer-Einstellungen
  transferCooldown: 300,            // Cooldown zwischen Transfers (Sekunden)
  enableFallback: true,             // Fallback-Systeme aktivieren
  notifyOnTransfer: true,           // Spieler benachrichtigen

  // Zugriff
  adminOnly: false,                 // Nur Admins dürfen transferieren?
  whitelist: [],                    // Spieler erlauben (leer = alle)
  blacklist: [],                    // Spieler blockieren

  // Sicherheit
  encryptionEnabled: false          // Verschlüsselung (für Zukunft reserviert)
};
```

### Beispiel-Anpassungen

**Nur Admins dürfen transferieren:**
```javascript
adminOnly: true
```

**Spezifische Spieler erlauben:**
```javascript
whitelist: ["PlayerName1", "PlayerName2", "PlayerName3"]
```

**Transfer-Cooldown erhöhen (30 Min):**
```javascript
transferCooldown: 1800
```

**Auto-Save deaktivieren:**
```javascript
autoSaveInventory: false
```

---

## 📍 Server-Konfiguration

Die Server werden intern als `main` und `farming` identifiziert. Passe dies an deine Server-Namen an:

```javascript
SERVER_CONFIG = {
  mainServer: {
    name: "Hauptwelt",           // Angezeigt im Menü
    id: "main",                  // Interne Kennung
    allowTransfer: true,
    icon: "🏠"
  },
  farmingServer: {
    name: "Farmingwelt",
    id: "farming",
    allowTransfer: true,
    icon: "🌾"
  }
};
```

---

## 💾 Datenbank-Struktur

Das Plugin nutzt 4 Haupt-Datenbanken:

### 1. **crossServerSync_players**
Speichert Spieler-Profile:
```javascript
{
  playerName: "Username",
  currentServerId: "main",
  createdAt: "2025-11-11T...",
  lastSync: "2025-11-11T...",
  transferCount: 5,
  lastTransferServer: "farming",
  banned: false,
  whitelisted: true
}
```

### 2. **crossServerSync_inventory**
Speichert Inventar-Backups:
```javascript
{
  player: "Username",
  serverId: "main",
  timestamp: "2025-11-11T...",
  items: [
    { slot: 0, typeId: "minecraft:diamond_pickaxe", amount: 1, ... },
    { slot: 1, typeId: "minecraft:wood", amount: 64, ... }
  ],
  armor: [...],
  savedAt: 1731230400000
}
```

### 3. **crossServerSync_transfers**
Aufzeichnung aller Transfers:
```javascript
{
  playerName: "Username",
  fromServer: "main",
  toServer: "farming",
  timestamp: "2025-11-11T...",
  transferId: "transfer_Username_1731230400000"
}
```

### 4. **crossServerSync_logs**
Alle System-Events und Fehler:
```javascript
{
  timestamp: "2025-11-11T...",
  message: "Spieler beigetreten: PlayerName",
  level: "success|warn|error",
  logId: "log_1731230400000_0.123"
}
```

---

## 🎮 Befehle für Spieler

### Hauptmenü
```
/sync                    # Öffnet das Menü
/sync menu              # Öffnet das Menü
```

### Transfer
```
/sync transfer main     # Transferiere zur Hauptwelt
/sync transfer farming  # Transferiere zur Farmingwelt
```

### Restauration
```
/sync restore           # Stelle dein Inventar wieder her
```

### Informationen
```
/sync stats             # Zeige deine Statistiken
/sync help              # Zeige die Hilfe
```

---

## 🛠️ Admin-Befehle

### Admin-Tools starten
```
/syncadmin              # Öffnet das Admin-Menü
```

### Im Admin-Menü verfügbar:
- 👥 **Spieler verwalten** - Sehe alle Spieler und ihre Server
- 💾 **Backup erstellen** - Manuelle Sicherung aller Daten
- 📊 **System-Status** - Zeige Systemstatus
- 🔧 **Konfiguration** - Verwalte Einstellungen
- 📜 **Logs anzeigen** - Sehe System-Logs

---

## 🔐 Sicherheit & Datenschutz

### Gespeicherte Daten:
- ✅ Spieler-Namen und UUID (wenn verfügbar)
- ✅ Inventar-Inhalte (Items, Verzauberungen)
- ✅ Transfer-Verlauf mit Zeitstempel
- ✅ Admin-Logs für Audits

### Datenschutz:
- ❌ Passwörter werden NICHT gespeichert
- ❌ IP-Adressen werden NICHT protokolliert
- ✅ Alle Daten sind lokal auf den Servern
- ✅ Keine externe Cloud-Speicherung

### Empfehlungen:
- Verwende die Whitelist für begrenzte Transfers
- Überprüfe regelmäßig die Logs
- Erstelle regelmäßig Backups
- Aktualisiere das Plugin regelmäßig

---

## 🚀 Installation

1. **Datei platzieren:**
   ```
   D:\BB\bridgePlugins\sync\crossServerSync.js
   ```

2. **Im BedrockBridge-Plugin-Verzeichnis registrieren:**
   ```javascript
   import "./sync/crossServerSync.js";
   ```

3. **Server neu starten**

4. **Test durchführen:**
   - Spieler befragen `/sync`
   - Admin auffordern `/syncadmin`
   - Transfer testen

---

## 🐛 Troubleshooting

### Problem: "Transfer nicht möglich"
**Lösung:**
- Überprüfe ob Spieler auf Whitelist ist
- Überprüfe Cooldown-Zeit
- Überprüfe ob Spieler nicht gebannt ist

### Problem: "Inventar wird nicht wiederhergestellt"
**Lösung:**
- Lade `/sync restore` manuell
- Überprüfe ob Inventar-Backup existiert
- Überprüfe Datenbank-Zugriff

### Problem: "Discord-Nachrichten kommen nicht an"
**Lösung:**
- Überprüfe `discordLogging: true`
- Überprüfe Discord-Verbindung
- Überprüfe `bridgeDirect` Konfiguration

---

## 📊 Monitoring & Wartung

### Regelmäßige Checks:
- ✅ Logs täglich überprüfen (`/syncadmin` → Logs)
- ✅ Backups wöchentlich erstellen (`/syncadmin` → Backup)
- ✅ Spieler-Statistiken überprüfen
- ✅ Speicherplatz überwachen

### Optimierung:
- Erhöhe `maxStoredInventories` wenn nötig
- Senke `autoSaveInterval` für häufigere Sicherungen
- Aktiviere Whitelist für bessere Kontrolle

---

## 📞 Support & Kontakt

Bei Fragen oder Problemen:
1. Überprüfe die Logs: `/syncadmin` → Logs anzeigen
2. Konsultiere dieses Dokument
3. Kontaktiere einen Admin

---

## 📝 Versionsverlauf

### v1.0.0 (2025-11-11) - Initiale Version
- ✅ Inventar-Synchronisation
- ✅ Spieler-Profile-System
- ✅ Transfer-Manager
- ✅ Admin-Tools
- ✅ Discord-Integration
- ✅ Auto-Save System
- ✅ Umfassende Fehlerbehandlung

---

**Das Plugin ist produktionsbereit! 🚀**
