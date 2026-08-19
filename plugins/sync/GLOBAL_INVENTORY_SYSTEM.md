# 🌐 Cross-Server Sync v2.0 - Globales Inventar-System

**Ein einziges Inventar, das der Spieler überall mitnimmt**

---

## 🎯 Kern-Konzept

Das System speichert **EIN globales Inventar pro Spieler**, das automatisch zwischen allen verbundenen Welten synchronisiert wird.

```
┌─────────────────────────────────────────────────────────┐
│                  SPIELER-INVENTAR                       │
│                   (Global & Einzig)                     │
├──────────────────┬──────────────────┬──────────────────┤
│  Welt 1          │  Welt 2          │  Welt 3          │
│  (Hauptwelt)     │  (Farmingwelt)   │  (PvP-Arena)     │
│                  │                  │                  │
│  Inventar: ✓     │  Inventar: ✓     │  Inventar: ✓     │
│  (Das gleiche!)  │  (Das gleiche!)  │  (Das gleiche!)  │
│                  │                  │                  │
│  Items:          │  Items:          │  Items:          │
│  - Diamond Sword │  - Diamond Sword │  - Diamond Sword │
│  - 64x Stone     │  - 64x Stone     │  - 64x Stone     │
│  - Apfel x3      │  - Apfel x3      │  - Apfel x3      │
│  (identisch)     │  (identisch)     │  (identisch)     │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## 🔄 Wie es funktioniert

### Ablauf: Spieler wechselt zwischen Welten

**Szenario:** Spieler "Alex" geht von Farmingwelt zur Hauptwelt

```
SCHRITT 1: Spieler loggt aus Farmingwelt
┌─────────────────────────────────────────┐
│ beforeEvents.playerLeave triggered      │
│                                         │
│ InventorySyncManager.saveInventory()   │
│ └─ Speichert in: inv_Alex_global       │
│                                         │
│ Auch Backup erstellt:                  │
│ └─ Speichert in: inv_Alex_backup_*     │
└─────────────────────────────────────────┘
           ↓
        [Datenbank]
        inv_Alex_global = {
          items: [ ... ],
          timestamp: "2025-11-11T10:30:00Z"
        }

SCHRITT 2: Spieler joinet Hauptwelt
┌─────────────────────────────────────────┐
│ afterEvents.playerSpawn triggered       │
│                                         │
│ InventorySyncManager.restoreInventory()│
│ └─ Liest aus: inv_Alex_global          │
│                                         │
│ Inventar wird wiederhergestellt         │
│ └─ Alle Items kommen mit! ✓            │
└─────────────────────────────────────────┘
           ↓
        Alex hat sein Inventar
        mit allen Items!
```

---

## 💾 Datenbank-Struktur

### Globales Inventar-System

```javascript
inventoryDb (Datenbank-Tabelle)

inv_PlayerName_global          // Das aktuelle Inventar
{
  playerName: "Alex",
  timestamp: "2025-11-11T10:30:00Z",
  lastWorld: "farming",         // Wo der Spieler zuletzt war
  items: [
    {
      slot: 0,
      typeId: "minecraft:diamond_sword",
      amount: 1,
      enchantments: [
        { type: "minecraft:sharpness", level: 5 }
      ]
    },
    {
      slot: 1,
      typeId: "minecraft:stone",
      amount: 64
    },
    // ... mehr Items
  ]
}

inv_PlayerName_backup_1234567890  // Backup aus Sicherheit
{
  // Gleiche Struktur wie global
}

inv_PlayerName_backup_1234567891  // Älteres Backup
{
  // Gleiche Struktur
}
```

### Wichtige Unterschiede zu v1.0

| Merkmal | v1.0 | v2.0 (Neu) |
|---------|------|-----------|
| **Speicherung** | `inv_PlayerName_main`, `inv_PlayerName_farming` | `inv_PlayerName_global` |
| **Inventare** | Mehrere pro Welt | EIN Inventar |
| **Sync** | Manual `/sync` | Automatisch |
| **Spieler bekommt** | Anderes Inventar pro Welt | Immer das gleiche Inventar |
| **Items** | Können unterschiedlich sein | Überall identisch |

---

## 🔄 Alle Auto-Sync Trigger (3 Punkte)

### 1️⃣ ON LOGIN (playerSpawn)

```javascript
Spieler joinet einen Server
  ↓
afterEvents.playerSpawn triggert
  ↓
Liest inv_PlayerName_global
  ↓
Stellt Inventar wieder her
  ↓
Spieler bekommt sein Inventar mit allen Items!

Nachricht an Spieler:
✓ Dein Inventar wurde wiederhergestellt!
✓ Dein Level & XP wurden wiederhergestellt!
✓ Willkommen! Deine Daten wurden automatisch synchronisiert!
```

### 2️⃣ ON LOGOUT (playerLeave)

```javascript
Spieler loggt aus / Server Shutdown
  ↓
beforeEvents.playerLeave triggert
  ↓
Speichert inv_PlayerName_global
  ↓
Erstellt auch Backup (inv_PlayerName_backup_*)
  ↓
Sendet Event zu anderen Servern
  ↓
Inventar ist gesichert!

Nachricht an Spieler:
✓ Dein Inventar wurde gespeichert!
```

### 3️⃣ PERIODIC (Alle 60 Sekunden)

```javascript
system.runInterval() triggert alle autoSyncInterval Sekunden
  ↓
Für JEDEN online Spieler:
  ├─ Liest inv_PlayerName_global
  ├─ Speichert aktuelles Inventar neu
  ├─ Erstellt Backup
  └─ Aktualisiert Timestamp
  ↓
Log: "Periodic Auto-Sync (Globales Inventar): PlayerName"
```

---

## 📊 Praktisches Beispiel

### Szenario: Spieler Alex hat 3 Diamond im Inventar

**Start: Alex loggt in Hauptwelt ein**
```
Spieler sieht: ✓ Inventar wiederhergestellt
Inventar liest von: inv_Alex_global
Inhalt:
├─ Diamond Schwert (verzaubert)
├─ 64x Stone
├─ 3x Diamond ← HIER!
└─ Apple x5
```

**Alex sammelt 2 weitere Diamond auf der Farmingwelt**
```
Alex hat jetzt: 5x Diamond
Inventar wird perioddisch gespeichert
inv_Alex_global wird aktualisiert mit 5x Diamond
```

**Alex loggt aus (Farmingwelt)**
```
beforeEvents.playerLeave triggert
Speichert: inv_Alex_global mit 5x Diamond
Backup erstellt: inv_Alex_backup_[timestamp]
```

**Alex loggt in PvP-Arena ein**
```
afterEvents.playerSpawn triggert
Liest: inv_Alex_global
Findet: 5x Diamond
Stellt wieder her: ✓
Spieler sieht sein aktuelles Inventar mit 5x Diamond
```

**Danach in Hauptwelt einchecken**
```
afterEvents.playerSpawn triggert
Liest: inv_Alex_global
Findet: 5x Diamond (das gleiche!)
Stellt wieder her: ✓
Spieler hat immer noch 5x Diamond!
```

---

## ⚙️ Wie es Konfiguriert wird

### Standard-Einstellungen

```javascript
const DEFAULT_CONFIG = {
  enabled: true,                // System aktiv
  autoSyncEnabled: true,        // Auto-Sync aktiv

  // === AUTOMATISCHE TRIGGER ===
  syncOnLogin: true,            // Beim Eintritt laden
  syncOnLogout: true,           // Beim Ausloggen speichern

  // === SYNC-TYPEN ===
  syncInventory: true,          // Inventar synchronisieren (EIN global)
  syncXP: true,                 // XP/Level synchronisieren
  syncHealth: false,            // Optional: Gesundheit

  // === TIMING ===
  autoSyncInterval: 60,         // Periodisch alle 60 Sekunden

  // === INTEGRATION ===
  discordLogging: true          // Discord-Benachrichtigungen
};
```

---

## 🎮 Was Spieler bemerken

### Spieler-Perspektive

Spieler müssen **NIX machen**. Alles läuft automatisch:

**Szenario 1: Normaler Wechsel**
```
1. Spieler hat Items im Inventar
2. Spieler loggt aus Welt A
   → ✓ System speichert sein Inventar
3. Spieler joinet Welt B
   → ✓ System stellt sein Inventar wieder her
4. ALLES ist da - identisch zu Welt A!
```

**Szenario 2: Items sammeln**
```
1. Spieler hat 10x Gold auf Welt A
2. Spieler joinet Welt B
   → 10x Gold sind da ✓
3. Spieler sammelt 5x Gold auf Welt B
   → Jetzt hat er 15x Gold
4. Spieler joinet Welt C
   → 15x Gold sind da ✓
```

**Szenario 3: Crash/Disconnect**
```
1. Server crasht während Spieler online ist
2. Spieler joinet später wieder ein
   → Letztes gespeichertes Inventar wird geladen
   → Nichts verlorengegangen!
```

---

## 🔒 Sicherheits-Features

### Mehrere Backups für Sicherheit

Das System erstellt automatisch Backups:

```
inv_PlayerName_global        // Aktuelles Inventar
inv_PlayerName_backup_1      // Backup vor 2 Minuten
inv_PlayerName_backup_2      // Backup vor 4 Minuten
inv_PlayerName_backup_3      // Backup vor 6 Minuten
...
```

**Falls Fehler passiert:**
- Admin kann auf älteres Backup wechseln
- Kein Datenverlust!

---

## 📈 Datenbank-Speicherung

### Speichergröße

**Pro Spieler (mit Inventar mit 20 Items):**
- Aktuelles Inventar: ~2 KB
- Pro Backup: ~2 KB
- Mit 10 Backups: ~22 KB pro Spieler

**Beispiel für einen Server:**
```
100 Spieler × 22 KB = 2.2 MB
1000 Spieler × 22 KB = 22 MB
10000 Spieler × 22 KB = 220 MB
```

**Cleanup-Optionen:**
```javascript
// Alte Backups älter als 7 Tage löschen (optional)
// Siehe CONFIG_v2.md für Code
```

---

## 🐛 Häufige Fragen

### F: Was wenn Spieler Items auf verschiedenen Welten hat?

**A:** Das gibt es nicht! Es gibt NUR EIN Inventar.

Wenn Spieler Items auf einer Welt hat, sind diese überall - weil es das gleiche Inventar ist.

### F: Können Spieler unterschiedliche Items auf verschiedenen Welten haben?

**A:** Nein. Das System synchronisiert EIN Inventar.

Alle Welten nutzen `inv_PlayerName_global` - es gibt nur diese eine!

### F: Was ist wenn Spieler gleichzeitig auf 2 Servern sind?

**A:** Das sollte nicht passieren (ein Spieler kann nur auf einem Server sein), aber falls doch:

- Jeder Server speichert sein Inventar-Verständnis
- Bei Rückkehr wird das neueste geladen (Timestamp-basiert)
- Neuere Daten gewinnen

### F: Wie oft wird das Inventar gespeichert?

**A:** 3 Mal:

1. Beim Logout (immer)
2. Periodisch alle 60 Sekunden (konfigurierbar)
3. Bei Bedarf über Admin-Panel

### F: Was wenn der Spieler Platzhalter-Items verliert?

**A:** Das System speichert ALLES:

- Items mit Verzauberungen ✓
- Items mit Namen-Tags ✓
- Items mit Lore ✓
- Alle 36 Slots ✓

Nichts geht verloren!

### F: Unterscheidet sich das von v1.0?

**A:** Ja, massiv!

| v1.0 | v2.0 |
|------|------|
| Manuelle `/sync` Befehle | Automatisch |
| Unterschiedliche Inventare pro Welt | EIN globales Inventar |
| Spieler müssen manuell transferieren | Alles transparent |

---

## 🚀 Deployment

### Installation ist gleich

```
1. crossServerSync_v2.js einbauen
2. Import in BedrockBridge
3. Server neu starten
4. Arbeitet sofort!
```

### Keine Migrations-Probleme

- Altes v1.0 System ist unabhängig
- v2.0 nutzt neue Datenbank-Keys
- Können parallel laufen (wenn gewünscht)

---

## ✅ Checkliste für globales Inventar

```
☐ System ist installiert
☐ syncOnLogin: true
☐ syncOnLogout: true
☐ syncInventory: true
☐ autoSyncEnabled: true
☐ Test-Spieler hat Items
☐ Spieler wechselt zu andere Welt
☐ Items sind da ✓
☐ Alle Items sind identisch ✓
☐ Logs zeigen keine Fehler ✓
```

---

## 📚 Zusammenfassung

**Das globale Inventar-System bedeutet:**

✨ **Ein Inventar** - Nicht mehrere pro Welt
✨ **Automatisch** - Spieler müssen nichts machen
✨ **Überall gleich** - Alle Welten haben identische Items
✨ **Sicher** - Mit Backups für Fehlerfall
✨ **Einfach** - Funktioniert out-of-the-box

**Spieler-Perspektive:**
> "Ich sammle 10 Diamanten auf Welt A, logge aus, logge auf Welt B ein - und habe immer noch die 10 Diamanten. Einfach genial!" 💎

---

**Version:** 2.0.0 (Updated)
**Inventar-System:** Global & Einzig
**Status:** ✅ Production Ready

*Ein Inventar, überall zugänglich, völlig automatisch.* 🌐
