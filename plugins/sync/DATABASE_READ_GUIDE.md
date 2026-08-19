# 📖 DATABASE READ COMMANDS - So siehst du was gespeichert wurde!

**Neu in V5.0:** Du kannst JETZT sehen, was in deiner Datenbank gespeichert wurde und WANN!

---

## 🎮 NEUE BEFEHLE

### 1. `/sync dbread`

**Was es macht:** Zeigt alle gespeicherten Inventar-Snapshots für dich

**Antwort:**
```
Datenbank-Einträge für Spieler1:

[1] 14.11.2025, 22:30:00 - 25 Items, XP: 45
[2] 14.11.2025, 22:30:15 - 25 Items, XP: 45
[3] 14.11.2025, 22:30:30 - 26 Items, XP: 45
[4] 14.11.2025, 22:31:00 - 26 Items, XP: 46
[5] 14.11.2025, 22:31:15 - 26 Items, XP: 46
```

**Was du siehst:**
- Wann jeder Snapshot gespeichert wurde
- Wie viele Items waren dabei
- Welches XP-Level du hattest

### 2. `/sync dbinfo`

**Was es macht:** Zeigt DETAILLIERTE Infos über die LETZTE gespeicherte Inventar

**Antwort:**
```
Letzte gespeicherte Inventar:
Zeit: 14.11.2025, 22:31:15

Items (erste 10):
  1. Slot 0: 1x diamond_sword (Sharpness V)
  2. Slot 1: 64x diamond
  3. Slot 2: 64x gold_ore
  4. Slot 3: 32x iron_ore
  5. Slot 4: 1x shield
  6. Slot 5: 1x bow (Power IV)
  7. Slot 6: 64x arrow
  8. Slot 7: 32x food
  9. Slot 8: 1x pickaxe (Efficiency V)
  10. Slot 9: 64x cobblestone

XP Level: 46
Health: 20/20
```

**Was du siehst:**
- Genau WANN das Inventar gespeichert wurde
- ALLE Items die drin waren
- Wie viel von jedem Item
- Enchantments
- Dein XP-Level
- Deine Gesundheit

### 3. `/sync dblogs`

**Was es macht:** Zeigt die letzten LOGS (was das System gemacht hat)

**Antwort:**
```
Letzte Logs für Spieler1:

✅ 22:30:00 [VERBOSE] Inventar gecaptured: Spieler1 (25 Items...
✅ 22:30:01 [VERBOSE] Inventar geladen und wiederhergestellt...
📂 22:30:15 [VERBOSE] Lade Spieler: Spieler1...
💾 22:30:15 [VERBOSE] Speichere Spieler: Spieler1 (Grund: PERIODIC_SYNC)...
✅ 22:30:15 [VERBOSE] Inventar gecaptured: Spieler1 (25 Items...
📊 22:30:15 [VERBOSE] Sync-Zyklus: 3 Spieler verarbeitet...
👋 22:31:00 [INFO] Spieler verlässt: Spieler1...
💾 22:31:00 [VERBOSE] Speichere Spieler: Spieler1 (Grund: PLAYER_LEAVE)...
```

**Was du siehst:**
- ALLES was das System für deinen Spieler gemacht hat
- WANN es passiert ist
- OB es erfolgreich war (✅, ❌, ⚠️)

---

## 💡 USE CASES

### Szenario 1: "Mein Inventar wurde verloren - hat das System es wirklich gespeichert?"

```bash
/sync dbinfo
```

→ Zeigt genau welche Items wann gespeichert wurden
→ Du siehst ob deine Items wirklich in der DB sind!

### Szenario 2: "Wann wurde mein letztes Inventar gespeichert?"

```bash
/sync dbread
```

→ Zeigt die letzten 5 Snapshots mit Zeitpunkten
→ Du siehst den exakten Zeitpunkt

### Szenario 3: "Was hat das System genau gemacht?"

```bash
/sync dblogs
```

→ Zeigt alle Events die das System protokolliert hat
→ Du siehst ALLES was passiert ist

### Szenario 4: "Hat das System meine Enchantments gespeichert?"

```bash
/sync dbinfo
```

→ Zeigt ALLE Items mit Enchantments
→ Du kannst sehen ob "Sharpness V", "Unbreaking III", etc. gespeichert wurden

---

## 📊 WAS WIRD ALLES GESPEICHERT?

Bei jedem `/sync dbinfo` siehst du:

✅ **Zeitpunkt** - Wann wurde es gespeichert
✅ **Items** - Exakt welche Items du hattest
✅ **Slot-Position** - An welchem Slot was drin war
✅ **Mengen** - Wie viel von jedem Item (z.B. 64x gold)
✅ **Enchantments** - Alle Verzauberungen mit Level
✅ **Custom Names** - Deine benutzerdefinierten Namen
✅ **XP Level** - Dein Level & XP
✅ **Health** - Deine Gesundheit

---

## 🔄 AUTOMATISCHES SPEICHERN

Das System speichert AUTOMATISCH:

| Event | Was passiert | Wann siehbar |
|-------|-------------|------------|
| Player Join | Letztes Inventar laden | `/sync dbinfo` zeigt es |
| Alle 15 Sekunden | Aktuelles Inventar speichern | `/sync dbread` zeigt neuer Eintrag |
| Dimension Wechsel | Neues Inventar speichern | `/sync dbinfo` zeigt neues |
| Player Leave | Finales Inventar speichern | `/sync dbread` zeigt letzten |

---

## 🎯 KOMBINATIONEN

### Check ob Sync funktioniert:

```bash
1. /sync save           # Speichern
   → "✅ Inventar gespeichert!"

2. /sync dbinfo         # Prüfe was gespeichert wurde
   → Zeigt deine Items

3. Verändere dein Inventar (z.B. drop etwas)

4. /sync save           # Nochmal speichern
   → "✅ Inventar gespeichert!"

5. /sync dbread         # Prüfe beide Snapshots
   → [1] alt snapshot
   → [2] neuer snapshot (mit weniger Items!)

✅ Sync funktioniert perfekt!
```

### Check dass Transfer-Server funktioniert:

```bash
1. Server A: /sync status
   → Zeigt deine aktuellen Items

2. Server A: Items sampeln (z.B. 64x Diamanten nehmen)

3. Server A: /sync save
   → "✅ Gespeichert mit 64x Diamanten"

4. Server B: /sync load
   → "✅ Inventar geladen!"

5. Server B: /sync dbinfo
   → Zeigt 64x Diamanten! ✅

✅ Cross-Server Transfer funktioniert!
```

---

## 📈 BEISPIEL OUTPUT

### `/sync dbread` Output:

```
Datenbank-Einträge für MyPlayer:

[1] 14.11.2025, 22:30:00 - 25 Items, XP: 45
[2] 14.11.2025, 22:30:15 - 25 Items, XP: 45
[3] 14.11.2025, 22:30:30 - 26 Items, XP: 45
[4] 14.11.2025, 22:31:00 - 26 Items, XP: 46
[5] 14.11.2025, 22:31:15 - 28 Items, XP: 46
```

**Was das bedeutet:**
- [1] = Snapshot von 22:30:00 (25 Items, Level 45)
- [2] = Snapshot von 22:30:15 (gleich wie [1])
- [3] = Snapshot von 22:30:30 (+1 Item - du hast 1 Item gepickt!)
- [4] = Snapshot von 22:31:00 (+1 Item mehr + Level 46!)
- [5] = Snapshot von 22:31:15 (2 Items mehr!)

### `/sync dbinfo` Output:

```
Letzte gespeicherte Inventar:
Zeit: 14.11.2025, 22:31:15

Items (erste 10):
  1. Slot 0: 1x diamond_sword (Sharpness V, Unbreaking III)
  2. Slot 1: 64x diamond
  3. Slot 2: 64x gold_ore
  4. Slot 3: 32x iron_ore
  5. Slot 4: 1x shield
  6. Slot 5: 1x bow (Power IV, Punch II)
  7. Slot 6: 64x arrow
  8. Slot 7: 32x cooked_beef
  9. Slot 8: 1x diamond_pickaxe (Efficiency V)
  10. Slot 9: 64x cobblestone

XP Level: 46
Health: 20/20
```

**Was das bedeutet:**
- Slot 0: Diamond Schwert mit Sharpness 5 & Unbreaking 3
- Slot 1: 64 Diamanten
- ...
- Insgesamt 28 Items (wenn man alle Slots zählt)
- Level 46
- Volle Gesundheit (20/20)

### `/sync dblogs` Output:

```
Letzte Logs für MyPlayer:

✅ 22:30:00 [VERBOSE] Inventar gecaptured: MyPlayer (25 Items, 15ms)
✅ 22:30:01 [VERBOSE] Inventar geladen und wiederhergestellt für MyPlayer: 25 Items + Armor + XP
📂 22:30:15 [VERBOSE] Lade Spieler: MyPlayer
💾 22:30:15 [VERBOSE] Speichere Spieler: MyPlayer (Grund: PERIODIC_SYNC)
✅ 22:30:15 [VERBOSE] Inventar gecaptured: MyPlayer (25 Items, 16ms)
📊 22:30:15 [VERBOSE] Sync-Zyklus: 3 Spieler verarbeitet
👋 22:31:00 [INFO] Spieler verlässt: MyPlayer
💾 22:31:00 [VERBOSE] Speichere Spieler: MyPlayer (Grund: PLAYER_LEAVE)
```

---

## ❓ HÄUFIGE FRAGEN

### Q: Wann wird was automatisch gespeichert?

**A:** Alle 15 Sekunden wird dein aktuelles Inventar AUTOMATISCH in der Datenbank gespeichert!

Du siehst das mit:
```bash
/sync dbread
```

Dort sollte ein neuer Eintrag alle 15 Sekunden hinzukommen.

### Q: Wie lange werden die Daten gespeichert?

**A:** Die Daten bleiben für immer (oder bis Server-Neustart/Reset). Es gibt aber max 100 alte Snapshots pro Spieler.

### Q: Kann ich alte Inventare wiederherstellen?

**A:** Mit `/sync dbinfo` siehst du nur die LETZTE. Mit `/sync dbread` siehst du die letzten 5. Der Server speichert bis zu 100 pro Spieler, du kannst aber nur die neuste direkt mit `/sync load` laden.

### Q: Sind Enchantments wirklich gespeichert?

**A:** JA! Mit `/sync dbinfo` siehst du genau welche Enchantments:

```
1x diamond_sword (Sharpness V, Unbreaking III)
1x bow (Power IV, Punch II)
```

### Q: Was wenn der Server crasht?

**A:** Dein Inventar ist maximal 15 Sekunden alt (beim nächsten Auto-Sync). Sieh mit `/sync dbinfo` wann es zuletzt gespeichert wurde.

---

## 🚀 SUMMARY

Mit diesen 3 neuen Befehlen kannst du JETZT:

✅ **`/sync dbread`** - Alle deine gespeicherten Snapshots mit Zeit sehen
✅ **`/sync dbinfo`** - Detaillierte Info deiner letzten Inventar
✅ **`/sync dblogs`** - Alle Logs was das System gemacht hat

**Du siehst ALLES was in der Datenbank gespeichert ist und WANN!**

---

**Version:** 5.0.0
**Neu in dieser Version:**
- `/sync dbread` - Snapshots anzeigen
- `/sync dbinfo` - Detaillierte Inventory-Info
- `/sync dblogs` - System-Logs anzeigen
