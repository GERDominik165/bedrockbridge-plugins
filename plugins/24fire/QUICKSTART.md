# 24FIRE Quick Start Guide

Schnelle Einrichtung des 24fire Bedrock Bridge Plugins in 5 Minuten! ⚡

## ✅ Schritt 1: Files kopieren (30 Sekunden)

Kopiere diese Dateien nach `D:\BB\bridgePlugins\24fire24fire\`:

```
24fire-bridge-complete.js
config.json
package.json
README.md
```

## 🔑 Schritt 2: API-Key eintragen (2 Minuten)

### A) 24fire API-Key erstellen

1. Öffne https://manage.24fire.de
2. Log dich ein
3. Gehe zu **Einstellungen** → **API-Keys**
4. Klick **API-Key erstellen**
5. Kopiere den Schlüssel (wird nur 1x angezeigt!)

### B) In config.json eintragen

Öffne `config.json` und ersetze:

```json
"apiKey": ""
```

Mit:

```json
"apiKey": "REDACTED"
```

## 🚀 Schritt 3: Plugin aktivieren (30 Sekunden)

Lade das Plugin beim Start deines Bedrock Bridge Servers:

```javascript
// In deiner Bridge-Startup-Datei:
import { TwentyfourfirePlugin } from './bridgePlugins/24fire24fire/24fire-bridge-complete.js';

const plugin = new TwentyfourfirePlugin();
plugin.start();
```

## 🎮 Schritt 4: Testen (1 Minute)

1. Starte deinen Bedrock Server
2. Betrete den Server in Minecraft
3. Gib ein: `/24fire`
4. Das Menü sollte sich öffnen! 🎉

## 📋 Menü-Navigation

```
/24fire
  ├─ 👤 Konto-Info              (Guthaben, Status)
  ├─ ⚙️ Dienste                 (Services anzeigen)
  ├─ 🌐 Domains                 (Domain-Verwaltung)
  ├─ 💻 KVM-Server              (Server-Status & Control)
  ├─ 💝 Spenden                 (Spendenseite-Info)
  ├─ 🤝 Affiliate               (Verdienste, Leads)
  └─ 🔃 Aktualisieren           (Cache löschen)
```

## 🎯 Häufige Aufgaben

### Konto-Guthaben prüfen
```
/24fire
→ 👤 Konto-Info
```

### KVM-Server Status
```
/24fire
→ 💻 KVM-Server
→ Server auswählen
→ Status/Backups/Traffic anzeigen
```

### Server neu starten
```
/24fire
→ 💻 KVM-Server
→ Server auswählen
→ ⚙️ Einstellungen
→ 🖥️ Status
→ 🔄 Neu starten
```

### Domain-Details anzeigen
```
/24fire
→ 🌐 Domains
→ Domain auswählen
→ Info anzeigen
```

## ⚙️ Basis-Konfiguration

### Befehl ändern

In `config.json`:

```json
{
  "commands": {
    "menu": "mein24fire"  // Statt /24fire → /mein24fire
  }
}
```

### Logging anschalten

```json
{
  "logging": {
    "level": "DEBUG",  // Mehr Details in Konsole
    "console": true
  }
}
```

### Cache-Zeit ändern

```json
{
  "cache": {
    "ttl": 600000  // 10 Minuten (Standard: 5 Min)
  }
}
```

## 🐛 Wenn es nicht funktioniert

### ❌ "API_KEY muss gesetzt werden"

**Problem:** API-Key in config.json fehlt oder ist leer

**Lösung:**
```json
// Falsch:
"apiKey": ""
"apiKey": "REDACTED"

// Richtig:
"apiKey": "REDACTED"
```

### ❌ Menü öffnet sich nicht

**Problem:** Plugin lädt nicht oder Fehler beim Laden

**Lösung:**
1. Server-Logs prüfen auf Fehler
2. Debug-Modus aktivieren:
```json
{
  "logging": {
    "level": "DEBUG"
  }
}
```
3. Logs lesen und posten auf Support

### ❌ "401 Unauthorized"

**Problem:** API-Key ungültig/abgelaufen

**Lösung:**
1. Neuen API-Key im 24fire Control Panel erstellen
2. In config.json aktualisieren
3. Server neu starten

### ❌ "Keine Antwort vom Server"

**Problem:** Kann nicht auf https://manage.24fire.de zugreifen

**Lösung:**
1. Internet-Verbindung prüfen
2. Firewall überprüfen (HTTPS erlaubt?)
3. VPN deaktivieren (falls aktiv)
4. Proxy-Einstellungen prüfen

## 📊 Verfügbare Features

### Account
- ✅ Guthaben anzeigen
- ✅ Konto-Informationen
- ✅ Premium-Status
- ✅ Registrierungsdatum

### Services
- ✅ Webspace-Liste
- ✅ KVM-Server
- ✅ Domains
- ✅ Verlängerungsdaten

### Domains
- ✅ Domain-Info
- ✅ DNS-Einträge anzeigen
- ✅ DNS-Einträge hinzufügen* (*24fire+ erforderlich)
- ✅ DNS-Einträge bearbeiten*
- ✅ DNS-Einträge löschen*

### KVM-Server
- ✅ Server-Status (online/offline)
- ✅ Server starten/stoppen/neustarten
- ✅ CPU/RAM/Storage anzeigen
- ✅ Uptime anzeigen

### Backups
- ✅ Backup-Liste
- ✅ Backup-Details
- ✅ Neues Backup erstellen* (*24fire+ erforderlich)
- ✅ Backup wiederherstellen*
- ✅ Backup löschen*

### Traffic & Monitoring
- ✅ Traffic-Verbrauch
- ✅ Verfügbarkeits-Statistiken
- ✅ Ausfallzeiten
- ✅ CPU/RAM/Ping Werte

### DDoS & Sicherheit
- ✅ DDoS-Schutz anzeigen
- ✅ DDoS-Einstellungen ändern* (*24fire+ erforderlich)

### Community
- ✅ Spendenseite-Info
- ✅ Affiliate-Verdienste
- ✅ Referral-Links
- ✅ Donation-Tracking

## 🎓 API-Beispiele

### Account-Info abrufen

```javascript
const api = new TwentyfourfireAPI(apiKey);
const account = await api.getAccountDetails();
console.log(`Guthaben: ${account.balance}€`);
```

### Alle Services abrufen

```javascript
const services = await api.getAccountServices();
console.log(`KVM-Server: ${services.services.KVM.length}`);
console.log(`Domains: ${services.services.DOMAIN.length}`);
```

### Server-Status

```javascript
const status = await api.getKVMStatus(serverId);
console.log(`Status: ${status.status}`);
console.log(`Uptime: ${status.uptime} Min`);
```

### DNS-Einträge abrufen

```javascript
const dns = await api.getDomainDNS(domainId);
dns.forEach(record => {
  console.log(`${record.name} (${record.type}): ${record.data}`);
});
```

## 📞 Support & Hilfe

### Offizielle Links
- 🌐 Website: https://24fire.de
- 📚 API Docs: https://manage.24fire.de/api
- 🐞 Issues: GitHub Issues
- 💬 Discord: (falls vorhanden)

### Debugging
1. **Server-Logs prüfen** - Fehler-Meldungen suchen
2. **DEBUG-Mode aktivieren** - Mehr Informationen
3. **API-Key validieren** - Noch gültig?
4. **Netzwerk testen** - Internet ok?
5. **Cache löschen** - `/24fire` → Aktualisieren

## ✨ Pro-Tipps

1. **Cache nutzen** - Schneller & weniger Traffic
2. **Logging aktivieren** - Probleme schneller finden
3. **Rate Limit beachten** - Max. 120 Anfragen/Min
4. **Error Handling** - Try-Catch immer verwenden
5. **API-Key schützen** - Nie öffentlich machen!

## 🎯 Nächste Schritte

1. ✅ Plugin installiert
2. ✅ API-Key eingetragen
3. ✅ In-Game getestet
4. **→ Lese README.md für erweiterte Features**
5. **→ Lese API_REFERENCE.md für technische Details**

## 🎉 Fertig!

Du bist bereit! Viel Spaß mit der 24fire Bridge! 🚀

---

**Probleme?** Aktiviere DEBUG-Logging und prüfe die Konsole!

```json
{
  "logging": {
    "level": "DEBUG"
  }
}
```
