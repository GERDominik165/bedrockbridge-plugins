# 🌐 Cross-Server Sync Plugin

**Eine durchdachte Lösung zur nahtlosen Synchronisation von Spieler-Inventaren zwischen mehreren unabhängigen Bedrock Servern.**

## 🎯 Was es tut

- ✅ Speichert dein Inventar wenn du einen Server verlässt
- ✅ Stellt es wieder her wenn du auf einem anderen Server eintritts
- ✅ Verwaltet deine Spieler-Daten über alle Server hinweg
- ✅ Bietet Admin-Tools zur Verwaltung und Überwachung
- ✅ Integriert sich mit Discord für Benachrichtigungen

## 🚀 Schnellstart

### Für Spieler:

Das Plugin nutzt den **BedrockBridge Prefix** (Standard: `!`). Der Prefix wird in der Bridge-Konfiguration festgelegt.

**Transfer durchführen:**
```
!sync
```
Oder (je nach Konfiguration):
```
/sync
```

Dann:
1. Wähle einen Ziel-Server
2. Bestätige den Transfer
3. Überprüfe dein Inventar nach dem Transfer

**Inventar manuell wiederherstellen:**
```
!sync restore
```

**Deine Statistiken anschauen:**
```
!sync stats
```

**Schnell-Transfer (Alias):**
```
!transfer main      # Direkt zur Hauptwelt
!transfer farming   # Direkt zur Farmingwelt
```

### Für Admins:

**Admin-Tools öffnen:**
```
!syncadmin
```

**Manuelle Befehle:**
```
!sync transfer main      # Transfer zur Hauptwelt
!sync transfer farming   # Transfer zur Farmingwelt
!sync help              # Zeige Hilfe
!sync stats             # Deine Statistiken
```

**Hinweis:** Der `!` ist der Standard-Prefix. Dein Server kann einen anderen Prefix verwenden (z.B. `.`, `$`, etc.).
Nutze `!help` um alle verfügbaren Befehle zu sehen!

## 📁 Dateistruktur

```
D:\BB\bridgePlugins\sync\
├── crossServerSync.js      # Hauptplugin (1200+ Zeilen)
├── CONFIG.md               # Detaillierte Konfiguration
├── README.md               # Diese Datei
└── (Weitere Module später)
```

## 🔧 Installation

1. Stelle sicher dass die `sync` Ordner existiert:
   ```
   D:\BB\bridgePlugins\sync\
   ```

2. Kopiere `crossServerSync.js` in diesen Ordner

3. Importiere das Plugin in deiner BedrockBridge-Konfiguration:
   ```javascript
   import "./sync/crossServerSync.js";
   ```

4. Starte deinen Server neu

5. Teste mit `/sync`

## 💾 Datenbank-Integration

Das Plugin nutzt 4 EsploratoriDatabase Tabellen:

| Tabelle | Zweck |
|---------|-------|
| `crossServerSync_players` | Spieler-Profile und Statistiken |
| `crossServerSync_inventory` | Inventar-Backups |
| `crossServerSync_transfers` | Transfer-Verlauf |
| `crossServerSync_logs` | System-Logs und Fehler |

## ⚙️ Wichtige Einstellungen

**Transfer-Cooldown ändern (in Sekunden):**
```javascript
config.transferCooldown = 300;  // 5 Minuten
```

**Whitelist aktivieren (nur bestimmte Spieler):**
```javascript
config.whitelist = ["PlayerName1", "PlayerName2"];
```

**Auto-Save deaktivieren:**
```javascript
config.autoSaveInventory = false;
```

**Discord-Logging deaktivieren:**
```javascript
config.discordLogging = false;
```

## 🎮 Menü-Überblick

### Hauptmenü
```
🏠 Hauptwelt          → Transfer zur Hauptwelt
🌾 Farmingwelt        → Transfer zur Farmingwelt
📊 Statistiken        → Zeige deine Stats
⚙️ Einstellungen      → Admin-Einstellungen (nur Admins)
ℹ️ Hilfe              → Anleitung und Info
```

### Admin-Menü
```
👥 Spieler verwalten   → Siehe alle online Spieler
💾 Backup erstellen    → Sicherung aller Daten
📊 System-Status       → Plugin-Status prüfen
🔧 Konfiguration       → Einstellungen einsehen
📜 Logs anzeigen       → System-Logs prüfen
```

## 🔒 Sicherheit

- ✅ Keine Passwörter werden gespeichert
- ✅ Keine IP-Adressen werden protokolliert
- ✅ Alle Daten sind lokal auf den Servern
- ✅ Whitelist/Blacklist Unterstützung
- ✅ Ban-System für problematische Spieler

## 📊 Features

### Inventar-Management
- ✅ Speichere bis zu 50 Inventar-Versionen pro Spieler
- ✅ Automatische Sicherung alle 10 Minuten
- ✅ Alle Verzauberungen und Eigenschaften erhalten
- ✅ Rüstung und Items bleiben erhalten

### Spieler-Profile
- ✅ Automatische Profilerstellung
- ✅ Transfer-Verlauf und Statistiken
- ✅ Cooldown-Management
- ✅ Whitelist/Blacklist-System

### Transfer-System
- ✅ Validierung vor Transfer
- ✅ Bestätigungs-Dialog
- ✅ Discord-Benachrichtigungen
- ✅ Fehlerbehandlung und Fallback

### Admin-Tools
- ✅ Spieler-Übersicht
- ✅ Manuelle Backups
- ✅ System-Monitoring
- ✅ Konfiguration-Verwaltung
- ✅ Logs und Audits

## 🐛 Häufige Fragen

**F: Was passiert mit meinem Inventar beim Transfer?**
A: Es wird vor dem Transfer gespeichert und nach deinem Eintritt auf dem neuen Server wiederhergestellt.

**F: Kann ich transferieren wann ich will?**
A: Es gibt einen Cooldown (Standard: 5 Minuten) zwischen Transfers zur Sicherheit.

**F: Was wenn der Transfer schiefgeht?**
A: Das System hat Fallback-Mechanismen. Nutze `/sync restore` zur manuellen Wiederherstellung.

**F: Werden meine Daten gespeichert?**
A: Ja, alle Daten sind in der Datenbank persistent. Backups sind verfügbar.

**F: Kann der Admin mein Inventar sehen?**
A: Ja, Admins haben Zugriff auf Spieler-Daten über `/syncadmin`.

## 📈 Performance

- ✅ Optimiert für mehrere Spieler
- ✅ Auto-Save läuft im Hintergrund
- ✅ Keine Lag durch Synchronisation
- ✅ Effiziente Datenbankabfragen

## 🔗 Integration

Das Plugin integriert sich automatisch mit:
- **BedrockBridge** - Befehle und Events
- **Discord** - Für Benachrichtigungen (über bridgeDirect)
- **EsploratoriDatabase** - Für Datenspeicherung

## 📝 Befehls-Referenz

```
/sync                   # Menü öffnen
/sync menu             # Menü öffnen
/sync transfer main    # Zur Hauptwelt transferieren
/sync transfer farming # Zur Farmingwelt transferieren
/sync restore          # Inventar wiederherstellen
/sync stats            # Statistiken anzeigen
/sync help             # Hilfe anzeigen
/syncadmin             # Admin-Tools (nur Admins)
```

## 📞 Fehlerbehandlung

**Fehler: "Transfer nicht möglich"**
- Überprüfe ob du auf der Whitelist bist
- Warte auf Cooldown
- Überprüfe ob du nicht gebannt bist

**Fehler: "Inventar wird nicht wiederhergestellt"**
- Nutze `/sync restore` manuell
- Überprüfe ob Backup existiert

**Fehler: "System ist deaktiviert"**
- Ein Admin hat das System deaktiviert
- Wende dich an einen Admin

## 🎓 Best Practices

1. **Regelmäßige Backups** - Admin sollte täglich Backups erstellen
2. **Whitelist nutzen** - Für bessere Kontrolle wer transferieren kann
3. **Logs überprüfen** - Tägliche Überprüfung für Fehler
4. **Cooldown respektieren** - Nicht zu häufig transferieren
5. **Discord aktiviert** - Für volle Transparenz und Logging

## 🎯 Geplante Features (v2.0)

- [ ] Multi-Server Support (3+ Server)
- [ ] Verschlüsselung für empfindliche Daten
- [ ] Web-Dashboard für Admin-Verwaltung
- [ ] API für Plugin-Integration
- [ ] Erweiterte Statistiken und Reports
- [ ] Automatische Datenbank-Optimierung

## ✅ Status

**v1.0.0** - Produktionsreife

- ✅ Vollständig implementiert
- ✅ Syntax validiert
- ✅ Fehlerbehandlung
- ✅ Dokumentiert
- ✅ Bereit für Production

---

**Fragen oder Probleme?** Überprüfe CONFIG.md oder kontaktiere einen Admin! 🚀
