/**
 * blueprintBuilder.js — Bauplan-System für BedrockBridge
 *
 * Nutzt die OFFIZIELLE @minecraft/server Script API:
 *   - dimension.setBlockPermutation(loc, BlockPermutation)     (Blöcke mit Zuständen)
 *   - BlockPermutation.resolve(id, states)                     (statisch)
 *   - block.permutation.getAllStates()                         (beim Aufnehmen)
 *   - world.setDynamicProperty / getDynamicProperty            (persistent, gestückelt)
 *   - system.runJob(generator)                                 (über viele Ticks verteilt)
 *
 * GOTCHAS (aus MS-Docs + jaylydev verifiziert):
 *   - `Vector3` ist KEIN Runtime-Export -> einfache {x,y,z}-Objekte verwenden.
 *   - getBlock()/setBlock* WERFEN bei ungeladenem Chunk / außerhalb Welt -> try/catch.
 *   - setBlock* nicht in restricted-execution (beforeEvents) -> aus Command/runJob heraus.
 *   - Command-Callback-Args sind CommandArgument-OBJEKTE -> .toString() nötig.
 *   - Dynamic-Property-String max ~32 KB -> große Baupläne chunken.
 *   - KEIN top-level await / kein await in nicht-async-Funktion (QuickJS) -> statische Imports.
 *
 * Befehle (Admin, Prefix ? ):  ?bp <sub>
 *   pos1 | pos2 | save <name> | build <name> [air] | list | info <name>
 *   delete <name> | undo | loadurl <name> <url> | json <name> <json>
 */
import { world, system, BlockPermutation } from "@minecraft/server";
import { variables } from "@minecraft/server-admin";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { http, HttpRequest, HttpRequestMethod } from "@minecraft/server-net";
import { bridge } from "../addons";
import { hub } from "./hubAPI.js";

const PREFIX = "§9[§bBP§9]§r ";
const ADMIN_TAG = "esploratori:admin";
const IDX_KEY = "bp:__index__";
const CHUNK = 30000; // Zeichen pro Dynamic-Property-Chunk (< 32 KB Limit)

function cfg(name, def) {
  try { const v = variables && variables.get(name); return (v === undefined || v === null) ? def : v; }
  catch (e) { return def; }
}

const sel = new Map(); // playerName -> { pos1, pos2 }
let lastUndo = null;    // { dimId, origin, bp }

// ============================ Kodierung ============================
function encodePerm(perm) {
  const id = perm.type.id;
  let states = {};
  try { states = perm.getAllStates() || {}; } catch (e) { states = {}; }
  const keys = Object.keys(states).sort();
  if (keys.length === 0) return id;
  return id + "|" + keys.map(k => k + "=" + String(states[k])).join(",");
}
function parseVal(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  return v;
}
function resolvePerm(entry) {
  const bar = entry.indexOf("|");
  if (bar < 0) return BlockPermutation.resolve(entry);
  const id = entry.slice(0, bar);
  const states = {};
  for (const kv of entry.slice(bar + 1).split(",")) {
    const eq = kv.indexOf("=");
    if (eq > 0) states[kv.slice(0, eq)] = parseVal(kv.slice(eq + 1));
  }
  return BlockPermutation.resolve(id, states);
}
function rleEncode(data) {
  const out = []; let i = 0;
  while (i < data.length) { let j = i; while (j < data.length && data[j] === data[i]) j++; out.push((j - i) + "*" + data[i]); i = j; }
  return out.join(";");
}
function rleDecode(str, total) {
  const data = new Array(total); let p = 0;
  if (str) for (const tok of str.split(";")) { const s = tok.indexOf("*"); const c = parseInt(tok.slice(0, s), 10); const idx = parseInt(tok.slice(s + 1), 10); for (let k = 0; k < c; k++) data[p++] = idx; }
  return data;
}
function serialize(bp) { return JSON.stringify({ w: bp.w, h: bp.h, d: bp.d, palette: bp.palette, rle: rleEncode(bp.data) }); }
function deserialize(str) { const o = JSON.parse(str); return { w: o.w, h: o.h, d: o.d, palette: o.palette, data: rleDecode(o.rle, o.w * o.h * o.d) }; }

// ============================ Persistenz ============================
function getIndex() { try { const s = world.getDynamicProperty(IDX_KEY); return s ? JSON.parse(s) : []; } catch (e) { return []; } }
function setIndex(list) { world.setDynamicProperty(IDX_KEY, JSON.stringify(list)); }

function saveBlueprint(name, bp) {
  const str = serialize(bp);
  const n = Math.ceil(str.length / CHUNK);
  for (let i = 0; i < n; i++) world.setDynamicProperty(`bp:${name}#${i}`, str.slice(i * CHUNK, (i + 1) * CHUNK));
  world.setDynamicProperty(`bp:${name}#meta`, JSON.stringify({ n, w: bp.w, h: bp.h, d: bp.d }));
  const idx = getIndex(); if (!idx.includes(name)) { idx.push(name); setIndex(idx); }
}
function loadBlueprint(name) {
  const metaStr = world.getDynamicProperty(`bp:${name}#meta`); if (!metaStr) return null;
  const meta = JSON.parse(metaStr); let str = "";
  for (let i = 0; i < meta.n; i++) str += (world.getDynamicProperty(`bp:${name}#${i}`) || "");
  return deserialize(str);
}
function deleteBlueprint(name) {
  const metaStr = world.getDynamicProperty(`bp:${name}#meta`);
  if (metaStr) { const meta = JSON.parse(metaStr); for (let i = 0; i < meta.n; i++) world.setDynamicProperty(`bp:${name}#${i}`, undefined); }
  world.setDynamicProperty(`bp:${name}#meta`, undefined);
  setIndex(getIndex().filter(x => x !== name));
}

// ============================ Aufnehmen ============================
function captureRegion(dim, a, b) {
  const min = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) };
  const max = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) };
  const w = max.x - min.x + 1, h = max.y - min.y + 1, d = max.z - min.z + 1;
  const palette = [], pIndex = new Map(), data = [];
  const intern = (e) => { let i = pIndex.get(e); if (i === undefined) { i = palette.length; palette.push(e); pIndex.set(e, i); } return i; };
  const AIR = intern("minecraft:air");
  for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    let entry = null;
    try { const blk = dim.getBlock({ x: min.x + x, y: min.y + y, z: min.z + z }); if (blk) entry = encodePerm(blk.permutation); } catch (e) { entry = null; }
    data.push(entry === null ? AIR : intern(entry));
  }
  return { w, h, d, palette, data };
}

// ============================ Platzieren ============================
function idxAt(bp, x, y, z) { return ((y * bp.d) + z) * bp.w + x; }

function buildBlueprint(player, dim, origin, bp, placeAir) {
  try {
    lastUndo = { dimId: dim.id, origin: { ...origin }, bp: captureRegion(dim, origin, { x: origin.x + bp.w - 1, y: origin.y + bp.h - 1, z: origin.z + bp.d - 1 }) };
  } catch (e) { lastUndo = null; }

  const permCache = new Map();
  const getPerm = (i) => { let p = permCache.get(i); if (p === undefined) { try { p = resolvePerm(bp.palette[i]); } catch (e) { p = null; } permCache.set(i, p); } return p; };
  const total = bp.w * bp.h * bp.d;
  let placed = 0, failed = 0, skipped = 0, seen = 0;

  function* gen() {
    for (let y = 0; y < bp.h; y++) for (let z = 0; z < bp.d; z++) for (let x = 0; x < bp.w; x++) {
      seen++;
      const i = bp.data[idxAt(bp, x, y, z)];
      const entry = bp.palette[i];
      if (!placeAir && (entry === "minecraft:air" || entry === "air")) { skipped++; }
      else {
        const perm = getPerm(i);
        if (perm) { try { dim.setBlockPermutation({ x: origin.x + x, y: origin.y + y, z: origin.z + z }, perm); placed++; } catch (e) { failed++; } }
        else failed++;
      }
      if ((seen & 255) === 0) yield;
    }
    player.sendMessage(`${PREFIX}§aFertig: §f${placed}§a gesetzt, §7${skipped} Luft übersprungen, §c${failed} fehlgeschlagen§a (von ${total}). §7\`?bp undo\` macht es rückgängig.`);
  }

  player.sendMessage(`${PREFIX}§7Baue §f${bp.w}×${bp.h}×${bp.d}§7 (${total} Blöcke)…`);
  if (typeof system.runJob === "function") system.runJob(gen());
  else { const it = gen(); const step = () => { for (let k = 0; k < 1024; k++) { if (it.next().done) return; } system.runTimeout(step, 1); }; step(); }
}

// ============================ HTTP (optional) ============================
async function loadFromUrl(player, name, url) {
  const allow = String(cfg("bp_allow_host", "")).trim();
  if (!allow) { player.sendMessage(`${PREFIX}§cURL-Laden ist deaktiviert (config §fbp_allow_host§c leer).`); return; }
  let host = ""; try { host = url.split("/")[2] || ""; } catch (e) {}
  if (!allow.split(",").map(s => s.trim()).includes(host)) { player.sendMessage(`${PREFIX}§cHost §f${host}§c nicht erlaubt (bp_allow_host=§f${allow}§c).`); return; }
  try {
    const req = new HttpRequest(url); req.method = HttpRequestMethod.Get;
    const res = await http.request(req);
    if (res.status < 200 || res.status >= 300) { player.sendMessage(`${PREFIX}§cHTTP ${res.status}`); return; }
    importJson(player, name, res.body);
  } catch (e) { player.sendMessage(`${PREFIX}§cFehler beim Laden: §f${e}`); }
}

// JSON: { "blocks":[{"x","y","z","type","states"?}, ...] }  ODER  { w,h,d,palette,rle }
function importJson(player, name, jsonStr) {
  let o; try { o = JSON.parse(jsonStr); } catch (e) { player.sendMessage(`${PREFIX}§cUngültiges JSON: §f${e}`); return; }
  let bp;
  if (o && Array.isArray(o.blocks)) { bp = fromBlocksArray(o.blocks); }
  else if (o && o.palette && o.rle) { bp = deserialize(jsonStr); }
  else { player.sendMessage(`${PREFIX}§cUnbekanntes Format. Erwartet {blocks:[…]} oder {w,h,d,palette,rle}.`); return; }
  saveBlueprint(name, bp);
  player.sendMessage(`${PREFIX}§aBauplan §f${name}§a importiert (§f${bp.w}×${bp.h}×${bp.d}§a). §7\`?bp build ${name}\``);
}

function fromBlocksArray(blocks) {
  let maxX = 0, maxY = 0, maxZ = 0;
  for (const b of blocks) { maxX = Math.max(maxX, b.x | 0); maxY = Math.max(maxY, b.y | 0); maxZ = Math.max(maxZ, b.z | 0); }
  const w = maxX + 1, h = maxY + 1, d = maxZ + 1;
  const palette = ["minecraft:air"], pIndex = new Map([["minecraft:air", 0]]);
  const intern = (e) => { let i = pIndex.get(e); if (i === undefined) { i = palette.length; palette.push(e); pIndex.set(e, i); } return i; };
  const data = new Array(w * h * d).fill(0);
  for (const b of blocks) {
    let entry = b.type || "minecraft:air";
    if (b.states && typeof b.states === "object") { const keys = Object.keys(b.states).sort(); if (keys.length) entry += "|" + keys.map(k => k + "=" + String(b.states[k])).join(","); }
    data[(((b.y | 0) * d) + (b.z | 0)) * w + (b.x | 0)] = intern(entry);
  }
  return { w, h, d, palette, data };
}

// ============================ Sample-Baupläne ============================
function ensureSamples() {
  const idx = getIndex();
  if (!idx.includes("huette")) {
    const blocks = []; const W = 5, H = 4, D = 5;
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) blocks.push({ x, y: 0, z, type: "minecraft:oak_planks" });
    for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
      const edge = (x === 0 || x === W - 1 || z === 0 || z === D - 1);
      if (edge && !(z === 0 && x === 2 && y === 1)) blocks.push({ x, y, z, type: "minecraft:oak_planks" });
    }
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) blocks.push({ x, y: H - 1, z, type: "minecraft:oak_slab" });
    saveBlueprint("huette", fromBlocksArray(blocks));
  }
  if (!idx.includes("turm")) {
    const blocks = []; const R = 2, H = 12;
    for (let y = 0; y < H; y++) for (let x = 0; x <= R * 2; x++) for (let z = 0; z <= R * 2; z++) {
      const edge = (x === 0 || x === R * 2 || z === 0 || z === R * 2);
      if (edge) blocks.push({ x, y, z, type: (y % 4 === 3) ? "minecraft:stonebrick" : "minecraft:cobblestone" });
    }
    saveBlueprint("turm", fromBlocksArray(blocks));
  }
}

// ============================ Command-Registrierung ============================
function _registerWhenReady(fn, tries) {
  tries = tries || 0;
  if (bridge && bridge.bedrockCommands) { try { fn(); } catch (e) { console.warn("[blueprintBuilder] reg: " + e); } }
  else if (tries < 200) system.runTimeout(() => _registerWhenReady(fn, tries + 1), 5);
}

function argStr(a) { return (a === undefined || a === null) ? "" : a.toString(); }

_registerWhenReady(function () {
  system.run(() => { try { ensureSamples(); } catch (e) { console.warn("[blueprintBuilder] samples: " + e); } });

  bridge.bedrockCommands.registerAdminCommand("bp", (player, ...rawArgs) => {
    const a = rawArgs.map(argStr);
    const sub = (a[0] || "help").toLowerCase();
    const loc = { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) };
    const dim = player.dimension;
    const mine = () => { let s = sel.get(player.name); if (!s) { s = {}; sel.set(player.name, s); } return s; };

    if (sub === "pos1") { mine().pos1 = loc; player.sendMessage(`${PREFIX}§aEcke 1 = §f${loc.x} ${loc.y} ${loc.z}`); return; }
    if (sub === "pos2") { mine().pos2 = loc; player.sendMessage(`${PREFIX}§aEcke 2 = §f${loc.x} ${loc.y} ${loc.z}`); return; }

    if (sub === "save") {
      const name = a[1]; const s = sel.get(player.name);
      if (!name) return player.sendMessage(`${PREFIX}§cUsage: ?bp save <name>`);
      if (!s || !s.pos1 || !s.pos2) return player.sendMessage(`${PREFIX}§cErst §f?bp pos1§c und §f?bp pos2§c setzen.`);
      try { const bp = captureRegion(dim, s.pos1, s.pos2); saveBlueprint(name, bp); player.sendMessage(`${PREFIX}§aGespeichert §f${name}§a (§f${bp.w}×${bp.h}×${bp.d}§a, ${bp.palette.length} Blocktypen).`); }
      catch (e) { player.sendMessage(`${PREFIX}§cFehler: §f${e}`); }
      return;
    }
    if (sub === "build") {
      const name = a[1]; const placeAir = (a[2] || "").toLowerCase() === "air";
      if (!name) return player.sendMessage(`${PREFIX}§cUsage: ?bp build <name> [air]`);
      const bp = loadBlueprint(name); if (!bp) return player.sendMessage(`${PREFIX}§cKein Bauplan §f${name}§c. §7?bp list`);
      try { buildBlueprint(player, dim, loc, bp, placeAir); } catch (e) { player.sendMessage(`${PREFIX}§cFehler: §f${e}`); }
      return;
    }
    if (sub === "list") { const idx = getIndex(); return player.sendMessage(`${PREFIX}§7Baupläne (${idx.length}): §f` + (idx.join(", ") || "—")); }
    if (sub === "info") {
      const name = a[1]; const metaStr = name && world.getDynamicProperty(`bp:${name}#meta`);
      if (!metaStr) return player.sendMessage(`${PREFIX}§cKein Bauplan §f${name}`);
      const m = JSON.parse(metaStr); return player.sendMessage(`${PREFIX}§f${name}§7: ${m.w}×${m.h}×${m.d} = §f${m.w * m.h * m.d}§7 Blöcke, ${m.n} Chunk(s).`);
    }
    if (sub === "delete") { const name = a[1]; if (!name) return player.sendMessage(`${PREFIX}§cUsage: ?bp delete <name>`); deleteBlueprint(name); return player.sendMessage(`${PREFIX}§aGelöscht §f${name}`); }
    if (sub === "undo") {
      if (!lastUndo) return player.sendMessage(`${PREFIX}§cNichts zum Rückgängigmachen.`);
      const u = lastUndo; lastUndo = null;
      try { buildBlueprint(player, world.getDimension(u.dimId), u.origin, u.bp, true); player.sendMessage(`${PREFIX}§aUndo läuft…`); } catch (e) { player.sendMessage(`${PREFIX}§cUndo-Fehler: §f${e}`); }
      return;
    }
    if (sub === "loadurl") { const name = a[1], url = a[2]; if (!name || !url) return player.sendMessage(`${PREFIX}§cUsage: ?bp loadurl <name> <url>`); loadFromUrl(player, name, url); return; }
    if (sub === "json") { const name = a[1]; const json = a.slice(2).join(" "); if (!name || !json) return player.sendMessage(`${PREFIX}§cUsage: ?bp json <name> <json>`); importJson(player, name, json); return; }

    player.sendMessage(`${PREFIX}§bBauplan-Befehle:§7 pos1 · pos2 · save <n> · build <n> [air] · list · info <n> · delete <n> · undo · loadurl <n> <url> · json <n> <json>`);
  }, "Bauplan-System (aufnehmen/platzieren)");

  console.warn("[blueprintBuilder] Command ?bp registriert");

  try {
    hub.register({ id: "blueprint", title: "🏗 Baupläne", icon: "textures/ui/hammer_l", category: "Verwaltung", order: 20, permission: ADMIN_TAG, handler: (p) => openBlueprintUI(p) });
    console.warn("[blueprintBuilder] im Hub registriert");
  } catch (e) { console.warn("[blueprintBuilder] hub-reg: " + e); }
});

// ============================ Hub-UI ============================
async function showBusy(form, player, tries) {
  tries = tries || 0;
  const r = await form.show(player);
  if (r && r.cancelationReason === "UserBusy" && tries < 10) { await new Promise(res => system.runTimeout(res, 10)); return showBusy(form, player, tries + 1); }
  return r;
}

async function openBlueprintUI(player) {
  const idx = getIndex();
  const s0 = sel.get(player.name) || {};
  const form = new ActionFormData().title("🏗 Baupläne")
    .body(`§7Auswahl: §f${s0.pos1 ? "P1✓" : "P1✗"} ${s0.pos2 ? "P2✓" : "P2✗"}\n§7Gespeichert: §f${idx.length}`)
    .button("§aEcke 1 = hier", "textures/ui/color_plus")
    .button("§aEcke 2 = hier", "textures/ui/color_plus")
    .button("§bRegion speichern…", "textures/ui/save");
  const names = idx.slice(0, 20);
  for (const n of names) form.button("§f▶ " + n, "textures/ui/hammer_l");
  form.button("§cSchließen", "textures/ui/redX1");

  const r = await showBusy(form, player);
  if (!r || r.canceled) return;
  const s = (() => { let x = sel.get(player.name); if (!x) { x = {}; sel.set(player.name, x); } return x; })();
  const loc = { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) };
  if (r.selection === 0) { s.pos1 = loc; player.sendMessage(`${PREFIX}§aEcke 1 = §f${loc.x} ${loc.y} ${loc.z}`); return system.runTimeout(() => openBlueprintUI(player), 6); }
  if (r.selection === 1) { s.pos2 = loc; player.sendMessage(`${PREFIX}§aEcke 2 = §f${loc.x} ${loc.y} ${loc.z}`); return system.runTimeout(() => openBlueprintUI(player), 6); }
  if (r.selection === 2) return system.runTimeout(() => saveDialog(player), 6);
  const pick = r.selection - 3;
  if (pick >= 0 && pick < names.length) return system.runTimeout(() => blueprintActions(player, names[pick]), 6);
}

async function saveDialog(player) {
  const s = sel.get(player.name);
  if (!s || !s.pos1 || !s.pos2) { player.sendMessage(`${PREFIX}§cErst beide Ecken setzen.`); return; }
  const form = new ModalFormData().title("Region speichern").textField("Name des Bauplans", "z.B. turm", "");
  const r = await showBusy(form, player);
  if (!r || r.canceled) return;
  const name = (r.formValues[0] || "").trim(); if (!name) return;
  try { saveBlueprint(name, captureRegion(player.dimension, s.pos1, s.pos2)); player.sendMessage(`${PREFIX}§aGespeichert §f${name}`); }
  catch (e) { player.sendMessage(`${PREFIX}§cFehler: §f${e}`); }
}

async function blueprintActions(player, name) {
  const metaStr = world.getDynamicProperty(`bp:${name}#meta`); const m = metaStr ? JSON.parse(metaStr) : { w: 0, h: 0, d: 0 };
  const form = new ActionFormData().title("🏗 " + name)
    .body(`§7Maße: §f${m.w}×${m.h}×${m.d}§7 = §f${m.w * m.h * m.d}§7 Blöcke`)
    .button("§aHier bauen (ohne Luft)", "textures/ui/hammer_l")
    .button("§aHier bauen (mit Luft)", "textures/ui/hammer_l")
    .button("§cLöschen", "textures/ui/trash")
    .button("§7Zurück", "textures/ui/back_button_default");
  const r = await showBusy(form, player);
  if (!r || r.canceled) return;
  const loc = { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) };
  if (r.selection === 0 || r.selection === 1) { const bp = loadBlueprint(name); if (!bp) return player.sendMessage(`${PREFIX}§cKein Bauplan.`); return buildBlueprint(player, player.dimension, loc, bp, r.selection === 1); }
  if (r.selection === 2) { deleteBlueprint(name); player.sendMessage(`${PREFIX}§aGelöscht §f${name}`); return; }
  if (r.selection === 3) return system.runTimeout(() => openBlueprintUI(player), 6);
}
