# Pterodactyl Bedrock Bridge - Troubleshooting Guide

**Häufige Probleme und Lösungen**

---

## 🚨 Connection Issues

### Problem: "Panel nicht erreichbar"

**Symptom**: Error beim Verbindungstest

**Häufige Ursachen**:
1. Panel URL falsch
2. API Key falsch
3. Netzwerkverbindung down
4. Panel selbst down
5. Firewall blockiert Anfrage

**Lösungsschritte**:
```javascript
// 1. Panel URL überprüfen
// Richtig: https://panel.example.com
// Falsch: http://panel.example.com (kein https)
// Falsch: https://panel.example.com/ (trailing slash)

// 2. API Key überprüfen
// Muss mit ptlc_ beginnen
// Überprüfe ob kopiert wurde (keine Leerzeichen!)
// Mindestens 20 Zeichen lang

// 3. Netzwerk testen
// Ping: ping panel.example.com
// Curl: curl -H "Authorization: Bearer ptlc_YOUR_KEY" https://panel.example.com/api/client

// 4. Firewall überprüfen
// Outbound Port 443 erlauben (HTTPS)
// Nur zum Panel IP erlauben

// 5. Panel Status prüfen
// Gehe zu: https://panel.example.com
// Sollte erreichbar sein im Browser
```

**Wenn immer noch nicht funktioniert**:
```javascript
// Debugging aktivieren:
LOG_LEVEL: "DEBUG"
DEBUG_MODE: true

// Logs anzeigen: /pman logs
// Suche nach Fehlermeldung

// Error-Arten:
- ECONNREFUSED → Panel nicht erreichbar
- ETIMEDOUT → Netzwerk zu langsam
- ENOTFOUND → DNS Problem
- 401 → API Key falsch
- 403 → Keine Permissions
- 404 → Endpoint nicht vorhanden
```

---

### Problem: "401 Unauthorized"

**Ursache**: API Key falsch oder ungültig

**Lösung**:
```javascript
// 1. Neuen Key generieren
// Panel → Account → API Credentials → Create Token

// 2. Alle Permissions geben
// Mindestens: Servers, Files, Database, Backup, Schedule

// 3. Key korrekt eintragen
// Keine Leerzeichen!
// Komplettes Token kopieren!

// 4. Verify:
// Teste Verbindung im Spiel: /pman test-connection

// Falls immer noch 401:
// - Key ist abgelaufen
// - Key wurde regeneriert
// - Falsche API Key Type (client vs application)
```

---

### Problem: "403 Forbidden"

**Ursache**: API Key hat nicht genug Permissions

**Lösung**:
```javascript
// Panel → Dein Account → API Credentials
// Wähle deinen Key aus
// Überprüfe Permissions:

✓ Servers (all)
✓ Database Hosts (all)
✓ Files (all)
✓ Backups (all)
✓ Schedules (all)
✓ Allocations (all)

// Wenn nicht alle gehakt:
// → Key löschen und neuen mit allen Permissions erstellen
```

---

## ⏱️ Timeout Issues

### Problem: "Request Timeout"

**Symptom**: Befehle brauchen sehr lange oder Timeout-Error

**Ursachen & Lösungen**:

```javascript
// 1. Timeout erhöhen
TIMEOUT: 30000  → TIMEOUT: 60000

// 2. Retry Attempts erhöhen
RETRY_ATTEMPTS: 3  → RETRY_ATTEMPTS: 5

// 3. Retry Delay erhöhen
RETRY_DELAY: 1000  → RETRY_DELAY: 2000

// 4. Monitoring Interval reduzieren
MONITORING_INTERVAL: 5000  → MONITORING_INTERVAL: 10000
// (Weniger Anfragen = weniger Belastung)

// 5. Cache TTL erhöhen
CACHE_TTL: 300000  → CACHE_TTL: 600000
// (Mehr gecachte Daten = weniger Anfragen)

// 6. Netzwerk überprüfen
// Ping Panel: ping panel.example.com
// Traceroute: tracert panel.example.com
// Speedtest durchführen
```

**Für lokale Netzwerke** (sollten schnell sein):
```javascript
TIMEOUT: 5000       // Sehr kurz
RETRY_ATTEMPTS: 1   // Weniger Retries
RETRY_DELAY: 500
```

**Für Internet/Cloud**:
```javascript
TIMEOUT: 30000      // Standard
RETRY_ATTEMPTS: 3
RETRY_DELAY: 1000
```

**Für langsame Netzwerke**:
```javascript
TIMEOUT: 60000      // Lang
RETRY_ATTEMPTS: 5
RETRY_DELAY: 2000   // Lange Pausen
```

---

## 🔄 Rate Limiting

### Problem: "429 Too Many Requests"

**Symptom**: "Rate limit exceeded" Error

**Ursache**: Zu viele Anfragen an Panel (>240/Minute)

**Lösungen**:

```javascript
// 1. Monitoring Interval erhöhen
MONITORING_INTERVAL: 5000  → MONITORING_INTERVAL: 30000
// Weniger häufige Updates

// 2. Cache TTL erhöhen
CACHE_TTL: 300000  → CACHE_TTL: 900000
// Mehr Cache → weniger Anfragen

// 3. Auto-Save Interval erhöhen
AUTO_SAVE_INTERVAL: 60000  → AUTO_SAVE_INTERVAL: 300000
// Seltener speichern

// 4. Benutzer Anfragen reduzieren
// Verzögere GUI-Refreshes
// Batch mehrere Operationen
// Nutze Cache wo möglich

// Plugin handhabt 429 automatisch:
// - Wartet bis Limit zurückgesetzt (max 60s)
// - Zeigt Warnung an
// - Wiederholt automatisch
```

**Wenn häufig vorkommt**:
```javascript
// → Panel hat zu niedriges Limit
// → Mit Panel-Admin sprechen
// → API-Upgrade anfordern
// → Oder: Größere Monitoring-Intervalle
```

---

## 💾 Cache Issues

### Problem: "Veraltete Daten angezeigt"

**Symptom**: Änderungen im Panel werden im Spiel nicht angezeigt

**Lösungen**:

```javascript
// 1. Cache manuell leeren
// In Game: /pman cache-clear
// oder über GUI → Settings → Cache → Clear

// 2. Cache TTL senken
CACHE_TTL: 600000  → CACHE_TTL: 60000
// Cache wird schneller aktualisiert

// 3. Spezifischen Cache invalidieren
// Code:
cacheManager.invalidate('servers:list');
cacheManager.invalidatePattern('server:');

// 4. Auto-refresh im GUI
// Leere Cache wenn Menü öffnest
// Aktualisiere vor Anzeige
```

**Wenn immer noch alt**:
```javascript
// → Cache ist zu aggressiv
// → TTL auf 30000-60000 setzen
// → Monitoring Interval auf 2000-5000
// → Live-Daten wichtiger als Performance
```

---

### Problem: "Cache wird nicht geleert"

**Symptom**: Cache-Clear funktioniert nicht

**Lösungen**:

```javascript
// 1. Mehrfach versuchen
// Cache kann von anderen Prozessen genutzt werden
// 2-3x Clear klicken

// 2. Server neustarten
// Setzt allen Cache zurück

// 3. Warten
// Cache wird nach TTL gelöscht
// Standby 5+ Minuten

// 4. Manuell im Code
if (problem) {
  cacheManager.clear();  // Alles löschen
}
```

---

## 🔐 Permission Issues

### Problem: "Operation nicht erlaubt"

**Symptom**: "Insufficient permissions" Error

**Ursachen**:

```javascript
// 1. Dein Benutzer hat nicht genug Permissions
// Überprüfe Panel → Dein Account → Permissions

// 2. API Key hat nicht genug Permissions
// Panel → API Credentials → Überprüfe deinen Key

// 3. Subuser auf diesem Server beschränkt
// Nur bestimmte Operations erlaubt

// Lösungen:
// - Mit Admin-Account Tests
// - API Key neu generieren mit ALL Permissions
// - Subuser Permissions erhöhen
```

---

## 📊 GUI Problems

### Problem: "GUI öffnet nicht"

**Symptom**: `/pman gui` zeigt nichts oder Error

**Lösungen**:

```javascript
// 1. Berechtigungen prüfen
// Nur OPs können /pman Befehle nutzen
// Tippe: /op <dein-name>

// 2. Bedrock Version prüfen
// Formulas müssen in v1.20+
// ServerAPI muss aktiviert sein

// 3. Plugin geladen?
// Überprüfe: /pman status
// Sollte Plugin-Info zeigen

// 4. Fehler-Logs prüfen
// /pman logs
// Suche nach Error-Einträgen

// 5. Server neustarten
// World neu laden
// Plugin neu initialisiert
```

---

### Problem: "GUI-Buttons funktionieren nicht"

**Symptom**: Klicke Button → nichts passiert

**Lösungen**:

```javascript
// 1. Stabilitätsprobleme?
// → Plugin neustarten
// → World neu laden
// → Bedrock Server neustarten

// 2. API Verbindung?
// → Test Connection klicken
// → Überprüfe Logs

// 3. Input validieren
// → Keine Sonderzeichen
// → Zahlen in korrektem Bereich
// → Keine Leerzeichen

// 4. Timeouts?
// → TIMEOUT erhöhen
// → RETRY_ATTEMPTS erhöhen
// → Netzwerk prüfen
```

---

## 📝 Logging Issues

### Problem: "Logs zeigen keine Fehler"

**Symptom**: Log-Buffer leer oder zu wenig Infos

**Lösungen**:

```javascript
// 1. Log Level erhöhen
LOG_LEVEL: "INFO"  → LOG_LEVEL: "DEBUG"

// 2. Debug Mode aktivieren
DEBUG_MODE: false  → DEBUG_MODE: true

// 3. Logs anzahl prüfen
MAX_LOG_ENTRIES: 500  // Standard sollte reichen

// 4. Logs anzeigen
// /pman logs
// Zeigt letzte 10 Einträge

// 5. Fehleraktion wieder ausführen
// Debug Mode an
// Aktion die fehlt ausführen
// Logs anzeigen → Problem identifizieren
```

---

### Problem: "Logs sind zu groß"

**Symptom**: Memory-Problem oder zu viel Output

**Lösungen**:

```javascript
// 1. Log Level senken
LOG_LEVEL: "DEBUG"  → LOG_LEVEL: "INFO"

// 2. Debug Mode ausschalten
DEBUG_MODE: true  → DEBUG_MODE: false

// 3. Log Buffer begrenzen
MAX_LOG_ENTRIES: 500  → MAX_LOG_ENTRIES: 100

// 4. Logs manuell löschen
// /pman clear-logs
// oder GUI → Logging → Clear Logs

// 5. Monitoring-Logs reduzieren
MONITORING_INTERVAL: 1000  → MONITORING_INTERVAL: 5000
// Weniger Monitoring-Einträge
```

---

## 🖥️ Server Issues

### Problem: "Server wird nicht angezeigt"

**Symptom**: Servers list ist leer oder Server fehlt

**Lösungen**:

```javascript
// 1. API Key Permissions
// Überprüfe: "Servers" Permission gehakt

// 2. Server-ID überprüfen
// Panel → Dein Account → Servers
// Sollte dort angezeigt sein

// 3. API Key Type
// Client vs Application?
// Teste mit anderem Typ

// 4. Cache leeren
// /pman cache-clear

// 5. Netzwerk prüfen
// Test Connection: /pman test-connection
```

---

### Problem: "Server lädt sehr lange"

**Symptom**: Server-Details dauern lange zu laden

**Lösungen**:

```javascript
// 1. Timeout erhöhen
TIMEOUT: 30000  → TIMEOUT: 60000

// 2. Cache-Daten nutzen
// Statt neue Daten zu laden
// Zeige gecachte an

// 3. Parallele Anfragen reduzieren
// Lade nicht alle Details gleichzeitig
// Sequenziell lade

// 4. Netzwerk optimieren
// Überprüfe: speedtest.net
// Panel-Latenz messen
```

---

## 📁 File Manager Issues

### Problem: "Dateien können nicht gelöscht werden"

**Symptom**: Delete-Operation schlägt fehl

**Ursachen & Lösungen**:

```javascript
// 1. Permissions überprüfen
// API Key muss "Files" Permission haben

// 2. Datei-Pfad überprüfen
// Korrekt: /world/test.txt
// Falsch: world/test.txt (kein /)

// 3. Datei in Benutzung?
// Server kann nicht eigene Dateien löschen
// Server herunterfahren → löschen

// 4. Speicherplatz?
// Überprüfe ob genug Platz

// 5. Permissions (chmod)
// Überprüfe ob Datei löschbar ist
// chmod 644 datei.txt
```

---

## 🗄️ Database Issues

### Problem: "Datenbank-Passwort ändern funktioniert nicht"

**Symptom**: Rotate Password schlägt fehl

**Lösungen**:

```javascript
// 1. API Permissions
// Überprüfe: "Databases" Permission

// 2. Datenbank existiert?
// Liste zuerst Datenbanken auf
// Überprüfe ID

// 3. Zu schnell wiederholt?
// Warte 1-2 Minuten zwischen Versuchen

// 4. Host-Problem?
// Überprüfe ob Host konfiguriert ist
// Panel → Datenbanken → Hosts

// 5. Timeout?
// Erhöhe TIMEOUT auf 60000
```

---

## 💾 Backup Issues

### Problem: "Backup wird nicht erstellt"

**Symptom**: Create Backup schlägt fehl oder hängt

**Lösungen**:

```javascript
// 1. Speicherplatz prüfen
// Server braucht doppelt Serversize für Backup
// Überprüfe: Disk-Usage

// 2. Timeout zu kurz?
// Große Server brauchen lange
// TIMEOUT: 60000 oder höher

// 3. Zu viele Backups?
// Alte Backups löschen
// Speicherplatz freigeben

// 4. Server läuft?
// Manche Panels brauchen: Server running
// Andere: Server offline
// Teste beide Zustände

// 5. Panel-Logik?
// Überprüfe Panel-Logs
// Eventuell Backup-Limits?
```

---

## 🔧 General Troubleshooting

### Debug-Strategie

```javascript
// 1. Problem reproduzieren
// Schritt-für-Schritt wiederholen
// Notiere genau wann es passiert

// 2. Logs sammeln
LOG_LEVEL: "DEBUG"
DEBUG_MODE: true
// Führe Problem aus
// Sammle Logs

// 3. Fehler analysieren
// Welche Aktion zuerst fehl?
// API-Response Code?
// Netzwerk oder Logic-Problem?

// 4. Isolieren
// Ist es Spiel-Problem oder Plugin?
// Teste mit Bedrock-Command direkt

// 5. Lösung testen
// Fix anwenden
// Problem erneut reproduzieren
// Sollte nicht mehr auftreten
```

---

### Log-Analyse

```javascript
// Error-Pattern erkennen:

// [ERROR] Panel nicht erreichbar
// → Netzwerk/Panel-Problem

// [ERROR] 401 Unauthorized
// → API Key-Problem

// [ERROR] 429 Too Many Requests
// → Rate Limit überschritten

// [ERROR] Timeout after 30000ms
// → Netzwerk zu langsam

// [ERROR] Invalid JSON Response
// → Panel-Bug oder falsche URL

// [WARN] Cache full, evicting oldest
// → Cache zu klein → erhöhen

// [DEBUG] Retry attempt 2/3
// → Netzwerk instabil
```

---

## 📞 Getting Help

**Wenn nichts hilft**:

1. **Debug-Logs sammeln**:
   - LOG_LEVEL: DEBUG
   - DEBUG_MODE: true
   - Problem reproduzieren
   - Logs speichern

2. **Check Panel-Logs**:
   - Panel → Admin → Logs
   - Überprüfe bei/nach Fehler

3. **Netzwerk-Infos**:
   - ping panel.example.com
   - tracert panel.example.com
   - curl Test (siehe oben)

4. **Plugin-Status**:
   - /pman status
   - /pman test-connection

5. **Bedrock-Version**:
   - /version
   - Update wenn nötig

---

## ✅ Checklist

- [ ] Panel erreichbar (curl Test)
- [ ] API Key korrekt
- [ ] Permissions überprüft
- [ ] Netzwerk stabil
- [ ] Logs Debug-Level
- [ ] Cache gelöscht
- [ ] Server restartet
- [ ] Konfiguration aktualisiert
- [ ] Keine Typos

---

**Version**: 3.0.0
**Letzte Aktualisierung**: 2024
**Status**: Vollständig dokumentiert ✅
