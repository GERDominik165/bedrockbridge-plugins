# 🚀 PTERODACTYL BEDROCK BRIDGE - QUICK START

**Status:** 🟢 READY TO USE
**Type:** Pure Bedrock Plugin (keine Dependencies!)

---

## ⚡ 3 SCHRITTE ZUM START

### 1️⃣ Kopieren
```
behavior_pack/ Ordner in deinen Bedrock Server kopieren:

Bedrock Server/
├── behavior_packs/
│   └── pterodactyl_bridge/    ← HIER
│       ├── manifest.json
│       └── scripts/main.js
```

### 2️⃣ Aktivieren
Gehe zu: Einstellungen → Behavior Packs → Pterodactyl Bridge ✓

### 3️⃣ Neustart
Server neustarten und dann:

```
/bedrockbridge gui
```

**FERTIG!** 🎉

---

## 🎮 COMMANDS

```
/bedrockbridge gui      Hauptmenü öffnen
/bedrockbridge servers  Server verwalten
/bedrockbridge test     Verbindung testen
/bedrockbridge status   Status anzeigen
/bedrockbridge help     Hilfe anzeigen
```

---

## ⚙️ KONFIGURATION

Öffne: `behavior_pack/scripts/main.js`

```javascript
const CONFIG = {
  PANEL_URL: 'https://pv-q.de/',
  API_KEY: 'REDACTED_PVQ_KEY',
  COMMAND_PREFIX: 'bedrockbridge'
};
```

✅ Dein echtes API-Setup ist BEREITS da!

---

## ✅ FUNKTIONEN

```
✅ Server verwalten (Start/Stop/Restart)
✅ Datenbanken verwenden
✅ Sicherungen erstellen
✅ Dateien durchsuchen
✅ Zeitpläne sehen
✅ Monitoring
✅ Vollständige GUI
✅ 6 Commands
```

---

## 🔧 TROUBLESHOOT

**Befehl nicht bekannt?**
→ Server neustarten

**Verbindung fehlgeschlagen?**
→ `/bedrockbridge test` ausführen

**Plugin lädt nicht?**
→ Behavior Pack aktiviert? (Einstellungen → Behavior Packs)

---

## 📋 WAS IST DABEI?

```
main.js (~1000 Zeilen):
├── HTTP Client
├── GUI Builder (Menüs)
├── Plugin Manager
├── Command Handler
└── Initialisierung

manifest.json:
└── Plugin-Metadaten
```

**Sonst nichts** - alles in EINER Datei! 🎯

---

## 🎯 NÄCHSTE SCHRITTE

1. **Testen:**
   ```
   /bedrockbridge test
   ```
   Sollte zeigen: `✓ Verbindung erfolgreich!`

2. **Benutzen:**
   ```
   /bedrockbridge gui
   ```
   Öffnet das Hauptmenü

3. **Server verwalten:**
   - Server-Liste anzeigen
   - Start/Stop/Restart
   - Monitoring anschauen

---

## 💯 FERTIG!

Das Plugin ist:
- ✅ Sofort einsatzbereit
- ✅ Keine Installation nötig
- ✅ Keine Abhängigkeiten
- ✅ Plug & Play
- ✅ 100% funktional

**VIEL SPASS!** 🚀
