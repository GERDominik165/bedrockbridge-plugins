/**
 * hubAPI.js - Zentrale Menü-Registry für das BridgeHub
 *
 * Jedes Plugin kann sich mit Menü-Einträgen registrieren; der Hub baut sich
 * daraus dynamisch auf und zeigt jedem Spieler NUR, wofür er berechtigt ist.
 *
 * Nutzung in einem Plugin:
 *   import { hub } from "./hubAPI.js";
 *   hub.register({
 *     id: "warps",                       // eindeutig
 *     title: "🌀 Warps",                 // Button-Text
 *     icon: "textures/items/ender_pearl",// optional
 *     category: "Teleport",              // Gruppierung (optional)
 *     order: 20,                         // Sortierung (kleiner = weiter oben)
 *     permission: null,                  // null=jeder · "tag"=braucht Tag · fn(player)=>bool
 *     handler: (player) => { ... }       // wird bei Klick aufgerufen
 *   });
 */
const _entries = [];

function _canSee(entry, player) {
  const p = entry.permission;
  if (p === undefined || p === null) return true;
  try {
    if (typeof p === "function") return !!p(player);
    if (Array.isArray(p)) return p.some(t => player.hasTag(t));
    return player.hasTag(String(p));
  } catch (e) { return false; }
}

export const hub = {
  /** Eintrag registrieren (idempotent über id). */
  register(entry) {
    if (!entry || !entry.id || typeof entry.handler !== "function") {
      console.warn("[hubAPI] ungültiger Eintrag ignoriert: " + (entry && entry.id));
      return;
    }
    const i = _entries.findIndex(e => e.id === entry.id);
    if (i >= 0) _entries[i] = entry; else _entries.push(entry);
  },
  /** Eintrag entfernen. */
  unregister(id) {
    const i = _entries.findIndex(e => e.id === id);
    if (i >= 0) _entries.splice(i, 1);
  },
  /** Alle Einträge (ungefiltert). */
  all() { return _entries.slice(); },
  /** Nur die für diesen Spieler sichtbaren, sortiert nach category+order. */
  visibleFor(player) {
    return _entries
      .filter(e => _canSee(e, player))
      .sort((a, b) =>
        (a.category || "").localeCompare(b.category || "") ||
        (a.order ?? 100) - (b.order ?? 100) ||
        (a.title || "").localeCompare(b.title || ""));
  }
};
