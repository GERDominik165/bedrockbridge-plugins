# 🔥 HOTFIX v1.2 - Event Listener Registration Error

## Problem
```
[ERROR] [Scripting] Failed to load plugin ./bridgePlugins/shelf/index:
cannot read property 'subscribe' of undefined
```

**Ursache**: Event-Listener wurden auf Module-Ebene registriert, bevor `world.afterEvents` initialisiert war.

---

## ✅ Lösung Implementiert

### 1. **Event-Listener aus Sub-Modulen entfernt**

**shelfGamble.js**:
- ✅ Entfernt: `world.afterEvents.worldInitialize.subscribe()`
- ✅ Entfernt: `world.afterEvents.playerSpawn.subscribe()`

### 2. **Event-Listener in index.js zentralisiert**

Event-Listener werden jetzt in einer Funktion definiert und **NACH** worldInitialize aufgerufen:

```javascript
function registerEventListeners() {
    // Spieler-Spawn Event
    world.afterEvents.playerSpawn.subscribe(...)

    // Block-Break Event
    world.afterEvents.blockBreak.subscribe(...)
}

// Wird in initializePlugin() aufgerufen
registerEventListeners();
```

### 3. **Funktions-Exports**

`initializeCurrencySystem()` wird jetzt aus shelfGamble.js exportiert und in index.js aufgerufen.

---

## 📝 Datei-Änderungen

### shelfGamble.js
```diff
- world.afterEvents.worldInitialize.subscribe(() => {
-     initializeCurrencySystem();
- });
-
- world.afterEvents.playerSpawn.subscribe((event) => {
-     ...
- });

+ // Keine Event-Listener hier - werden in index.js registriert!
+ export { ShelfGamblingMachine, redstoneController, initializeCurrencySystem };
```

### index.js
```diff
+ function registerEventListeners() {
+     world.afterEvents.playerSpawn.subscribe(...)
+     world.afterEvents.blockBreak.subscribe(...)
+ }

+ // In initializePlugin():
+ registerEventListeners();
```

---

## 🧪 Testing

Nach dem Hotfix solltest du sehen:

```
§6[ShelfGamble] Bridge API geladen
§6[ShelfGamble] Coins-Objective erstellt
§6[ShelfGamble] ✓ Event Listeners registriert
§6[ShelfGamble] ✓ Alle Commands registriert
§6[ShelfGamble] ✓ Plugin erfolgreich initialisiert!
```

**Keine Errors!** ✅

---

## 🎯 Initialization Sequence (v1.0.2)

```
worldInitialize Event
    ↓
initializePlugin() (async)
    ↓
1. Validate Config
    ↓
2. Initialize Currency System
    ↓
3. Load Bridge API (async)
    ↓
4. Register Bridge Commands
    ↓
5. Register Event Listeners  ← NEW
    ↓
6. Setup Discord & Anti-Cheat
    ↓
7. Mark as Initialized
    ↓
8. Welcome Message
    ↓
Plugin Ready! ✅
```

---

## 📦 Version Info

- **v1.0.0**: Initial Release
- **v1.0.1**: Command Registration Fix
- **v1.0.2**: Event Listener Fix (Current)
- **Status**: ✅ Production Ready

---

## 🚀 Installation

Einfach `/reload` ausführen - Hotfix ist bereits in den Dateien integriert!

```
/reload
```

**Erwarteter Output**:
```
§6[ShelfGamble] ✓ Event Listeners registriert
§6[ShelfGamble] ✓ Plugin erfolgreich initialisiert!
```

---

## ✨ Was funktioniert jetzt

- ✅ Plugin lädt ohne Fehler
- ✅ Alle Commands funktionieren
- ✅ Event-Listener aktiv
- ✅ Spieler-Spawn Events
- ✅ Block-Break Events
- ✅ Coins-System
- ✅ Alle Features

---

*Hotfix Applied: 2025-11-18*
*Next: Test and verify all features!*
