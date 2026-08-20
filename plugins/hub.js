/**
 * hub.js - Zentrales BridgeHub-Menü (registry-getrieben)
 *
 * Baut sich dynamisch aus der hubAPI-Registry auf und zeigt jedem Spieler NUR
 * die Einträge, für die er berechtigt ist. Öffnet per KOMPASS oder ?bridgehub.
 * Andere Plugins fügen eigene Menüpunkte via `import { hub } from "./hubAPI.js"`.
 */
import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";
import { variables } from "@minecraft/server-admin";
import { bridge } from "../addons";
import { hub } from "./hubAPI.js";

const ADMIN_TAG = "esploratori:admin";
const cfg = (n, d = "") => { try { const v = variables.get(n); return (v === undefined || v === null) ? d : String(v); } catch (e) { return d; } };
const OLLAMA = "http://10.8.0.100:11434/api/generate";
const AI_MODEL = "huihui_ai/llama3.2-abliterate:latest";
const PVQ_BASE = "https://pv-q.de/api/client/extensions/serversplitter/api";
const isAdmin = p => { try { return p.hasTag(ADMIN_TAG); } catch (e) { return false; } };
const dim = () => world.getDimension("overworld");
const HOME_PROP = "hub:home";
const sleep = t => new Promise(res => system.runTimeout(res, t));

// Zeigt ein Formular; wiederholt bei UserBusy (behebt das "lade…"-Hängen).
async function show(player, form) {
  for (let i = 0; i < 40; i++) {
    let r;
    try { r = await form.show(player); } catch (e) { return { canceled: true }; }
    if (r && r.cancelationReason === "UserBusy") { await sleep(8); continue; }
    return r || { canceled: true };
  }
  return { canceled: true };
}

// ---------- Haupt-Hub: rendert die Registry ----------
async function openHub(player) {
  const items = hub.visibleFor(player);
  if (!items.length) { player.sendMessage("§7Keine Menüpunkte für dich verfügbar."); return; }
  const f = new ActionFormData().title("§l§bBridgeHub")
    .body("§7Willkommen, §f" + player.name + "§7!  §8(" + items.length + " Bereiche)\n§7Wähle:");
  let lastCat = null;
  for (const it of items) {
    const cat = it.category || "";
    const label = (cat && cat !== lastCat ? "§8[" + cat + "]§r " : "") + it.title;
    lastCat = cat;
    if (it.icon) f.button(label, it.icon); else f.button(label);
  }
  const r = await show(player, f);
  if (r.canceled) return;
  const it = items[r.selection];
  if (it && it.handler) { try { it.handler(player); } catch (e) { player.sendMessage("§cFehler: " + e); } }
}

/* ================= Kern-Handler ================= */

async function openTeleport(player) {
  const hasHome = !!player.getDynamicProperty(HOME_PROP);
  const others = world.getAllPlayers().filter(p => p.name !== player.name);
  const f = new ActionFormData().title("§l🏠 Teleport & Homes")
    .body(hasHome ? "§7Du hast ein Zuhause gesetzt." : "§7Noch kein Zuhause gesetzt.")
    .button("§aZuhause setzen (hier)", "textures/items/bed_red")
    .button(hasHome ? "§bZum Zuhause teleportieren" : "§8(kein Zuhause)", "textures/items/ender_eye")
    .button("§eZu Spieler (Admin)", "textures/ui/friend_glyph")
    .button("§8« Zurück");
  const r = await show(player, f);
  if (r.canceled) return;
  if (r.selection === 0) {
    const l = player.location;
    player.setDynamicProperty(HOME_PROP, JSON.stringify({ x: l.x, y: l.y, z: l.z, dim: player.dimension.id }));
    player.sendMessage("§a🏠 Zuhause gesetzt bei " + Math.floor(l.x) + " " + Math.floor(l.y) + " " + Math.floor(l.z));
    return openTeleport(player);
  }
  if (r.selection === 1 && hasHome) {
    try { const h = JSON.parse(player.getDynamicProperty(HOME_PROP)); player.teleport({ x: h.x, y: h.y, z: h.z }, { dimension: world.getDimension(h.dim || "minecraft:overworld") }); player.sendMessage("§b🏠 Willkommen zuhause!"); } catch (e) { player.sendMessage("§cFehler beim Teleport."); }
    return;
  }
  if (r.selection === 2) {
    if (!isAdmin(player)) { player.sendMessage("§cNur für Admins."); return; }
    if (!others.length) { player.sendMessage("§7Keine anderen Spieler online."); return openTeleport(player); }
    const rr = await show(player, new ModalFormData().title("§lZu Spieler").dropdown("Spieler", others.map(p => p.name)));
    if (rr.canceled) return openTeleport(player);
    const t = others[rr.formValues[0]];
    player.teleport(t.location, { dimension: t.dimension });
    player.sendMessage("§a→ teleportiert zu " + t.name);
    return;
  }
  if (r.selection === 3) return openHub(player);
}

async function openInfo(player) {
  const players = world.getAllPlayers();
  const l = player.location;
  const body = "§7Spieler online: §f" + players.length +
    "\n§7Deine Koords: §f" + Math.floor(l.x) + " " + Math.floor(l.y) + " " + Math.floor(l.z) +
    "\n§7Dimension: §f" + player.dimension.id.replace("minecraft:", "") +
    "\n\n§7Online:\n§f" + players.map(p => "• " + p.name).join("\n");
  const r = await show(player, new ActionFormData().title("§l📊 Server-Info").body(body).button("§8« Zurück"));
  if (!r.canceled) return openHub(player);
}

async function openAI(player) {
  const r = await show(player, new ModalFormData().title("§l🤖 KI fragen").textField("Deine Frage:", "z.B. Wie baue ich einen Redstone-Timer?"));
  if (r.canceled) return;
  const q = String(r.formValues[0] || "").trim();
  if (!q) return openHub(player);
  player.sendMessage("§b🤖 §7denke nach…");
  let ans = "(keine Antwort)";
  try {
    const req = new HttpRequest(OLLAMA);
    req.method = HttpRequestMethod.Post;
    req.headers = [new HttpHeader("Content-Type", "application/json")];
    req.body = JSON.stringify({ model: AI_MODEL, stream: false, prompt: q, options: { num_predict: 160, num_thread: 4 } });
    const res = await http.request(req);
    ans = (JSON.parse(res.body).response || "").trim() || ans;
  } catch (e) { player.sendMessage("§cKI nicht erreichbar."); return; }
  const rr = await show(player, new ActionFormData().title("§l🤖 KI-Antwort").body("§7Frage: §f" + q + "\n\n§f" + ans).button("Nochmal fragen").button("§8« Hauptmenü"));
  if (rr.selection === 0) return openAI(player);
  if (rr.selection === 1) return openHub(player);
}

async function openAdmin(player) {
  if (!isAdmin(player)) { player.sendMessage("§cNur für Admins."); return; }
  const f = new ActionFormData().title("§l⚙️ Admin-Tools")
    .button("§eTag ☀️").button("§9Nacht 🌙").button("§bWetter klar").button("§7Regen 🌧️")
    .button("§aCreative").button("§6Survival").button("§dFly an/aus").button("§cHeilen + Sättigen").button("§8« Zurück");
  const r = await show(player, f);
  if (r.canceled) return;
  const acts = [
    () => dim().runCommand("time set day"),
    () => dim().runCommand("time set night"),
    () => dim().runCommand("weather clear"),
    () => dim().runCommand("weather rain"),
    () => player.runCommand("gamemode creative"),
    () => player.runCommand("gamemode survival"),
    () => { const on = player.hasTag("hub:fly"); if (on) { player.removeTag("hub:fly"); player.runCommand("ability @s mayfly false"); } else { player.addTag("hub:fly"); player.runCommand("ability @s mayfly true"); } player.sendMessage("§dFly " + (on ? "aus" : "an")); },
    () => { player.runCommand("effect @s instant_health 1 10 true"); player.runCommand("effect @s saturation 1 10 true"); player.sendMessage("§aGeheilt & gesättigt."); },
  ];
  if (r.selection === 8) return openHub(player);
  try { acts[r.selection](); if (r.selection < 6) player.sendMessage("§a✓ ausgeführt."); } catch (e) { player.sendMessage("§cFehler: " + e); }
  return openAdmin(player);
}

async function openServers(player) {
  if (!isAdmin(player)) { player.sendMessage("§cNur für Admins."); return; }
  const key = cfg("pvq_key"), uuid = cfg("pvq_uuid");
  if (!key || !uuid || key === "REDACTED") { player.sendMessage("§cpv-q nicht konfiguriert."); return; }
  player.sendMessage("§7lade Server…");
  let kids = [];
  try {
    const req = new HttpRequest(PVQ_BASE + "/" + uuid + "/children");
    req.method = HttpRequestMethod.Get;
    req.headers = [new HttpHeader("Authorization", "Bearer " + key), new HttpHeader("Accept", "application/json")];
    const res = await http.request(req);
    if (res.status !== 200) { player.sendMessage("§cAPI-Fehler HTTP " + res.status); return; }
    const raw = JSON.parse(res.body);
    kids = (raw.data || raw.children || raw || []).map(c => (c.attributes || c));
  } catch (e) { player.sendMessage("§cFehler: " + (e && e.message ? e.message : e)); return; }
  const f = new ActionFormData().title("§l🖥️ Server (pv-q)").body("§7" + kids.length + " Server:");
  for (const k of kids) f.button("§f" + (k.name || k.identifier) + "\n§8" + (k.identifier || ""));
  f.button("§8« Zurück");
  const r = await show(player, f);
  if (r.canceled) return;
  if (r.selection === kids.length) return openHub(player);
  const k = kids[r.selection];
  const a = k.relationships?.allocations?.data?.[0]?.attributes;
  const d = await show(player, new ActionFormData().title("§f" + (k.name || k.identifier))
    .body("§7ID: §f" + (k.identifier || "?") + "\n§7Node: §f" + (k.node || "?") +
          "\n§7RAM: §f" + (k.limits?.memory ?? "?") + " MB" + (a ? "\n§7Adresse: §f" + a.ip + ":" + a.port : "") +
          "\n\n§8Steuert den ECHTEN Server:")
    .button("§a▶ Start", "textures/ui/color_plus")
    .button("§c■ Stop", "textures/ui/cancel")
    .button("§e⟳ Restart", "textures/ui/refresh")
    .button("§8« Server-Liste"));
  if (d.canceled) return;
  if (d.selection === 3) return openServers(player);
  const signal = ["start", "stop", "restart"][d.selection];
  const conf = await show(player, new MessageFormData().title("§lBestätigen")
    .body("§7Server §f" + (k.name || k.identifier) + "§7 wirklich §f§l" + signal.toUpperCase() + "§r§7?\n§c⚠ steuert den echten Server!")
    .button1("§aJa, " + signal).button2("§8Abbrechen"));
  if (conf.selection === 0) await pvqPower(player, uuid, k.identifier, signal, k.name || k.identifier);
  return openServers(player);
}

// Power-Aktion an einen pv-q Child-Server (start/stop/restart)
async function pvqPower(player, uuid, childId, signal, name) {
  const key = cfg("pvq_key");
  player.sendMessage("§7sende §f" + signal + "§7 an §f" + name + "§7…");
  try {
    const req = new HttpRequest(PVQ_BASE + "/" + uuid + "/children/" + childId + "/power");
    req.method = HttpRequestMethod.Post;
    req.headers = [new HttpHeader("Authorization", "Bearer " + key), new HttpHeader("Content-Type", "application/json"), new HttpHeader("Accept", "application/json")];
    req.body = JSON.stringify({ signal });
    const res = await http.request(req);
    if (res.status === 204 || res.status === 200) player.sendMessage("§a✓ " + signal.toUpperCase() + " an §f" + name + " §agesendet.");
    else player.sendMessage("§c" + signal + " fehlgeschlagen (HTTP " + res.status + "): §7" + String(res.body || "").slice(0, 90));
  } catch (e) { player.sendMessage("§cFehler: " + (e && e.message ? e.message : e)); }
}

async function openFire(player) {
  if (!isAdmin(player)) { player.sendMessage("§cNur für Admins."); return; }
  const key = cfg("fire_api_key");
  if (!key || key === "REDACTED") { player.sendMessage("§c24fire nicht konfiguriert."); return; }
  player.sendMessage("§7lade 24fire…");
  let body = "§7—";
  try {
    const req = new HttpRequest("https://manage.24fire.de/api/account");
    req.method = HttpRequestMethod.Get;
    req.headers = [new HttpHeader("X-FIRE-APIKEY", key)];
    const res = await http.request(req);
    try { const d = JSON.parse(res.body); const acc = d.data || d; body = "§7Konto: §f" + (acc.firstname || acc.email || "?") + "\n§7API: §f" + (d.message || res.status); }
    catch (e) { body = "§7HTTP " + res.status; }
  } catch (e) { player.sendMessage("§c24fire nicht erreichbar."); return; }
  const r = await show(player, new ActionFormData().title("§l🔥 24fire").body(body).button("§8« Zurück"));
  if (!r.canceled) return openHub(player);
}

/* ================= Kern-Bereiche in die Registry ================= */
hub.register({ id: "teleport", title: "🏠 Teleport & Homes", icon: "textures/items/ender_pearl", category: "Allgemein", order: 10, handler: openTeleport });
hub.register({ id: "info", title: "📊 Server-Info", icon: "textures/items/clock_item", category: "Allgemein", order: 20, handler: openInfo });
hub.register({ id: "ai", title: "🤖 KI fragen", icon: "textures/items/book_writable", category: "Allgemein", order: 30, handler: openAI });
hub.register({ id: "admin", title: "⚙️ Admin-Tools", icon: "textures/items/diamond_sword", category: "Admin", order: 10, permission: ADMIN_TAG, handler: openAdmin });
hub.register({ id: "servers", title: "🖥️ Server-Steuerung (pv-q)", icon: "textures/blocks/redstone_torch_on", category: "Admin", order: 20, permission: ADMIN_TAG, handler: openServers });
hub.register({ id: "fire", title: "🔥 24fire", icon: "textures/items/blaze_powder", category: "Admin", order: 30, permission: ADMIN_TAG, handler: openFire });

/* ================= Trigger ================= */
world.afterEvents.itemUse.subscribe(ev => {
  if (ev.itemStack?.typeId === "minecraft:compass") openHub(ev.source);
});
function reg(tries = 0) {
  if (bridge?.bedrockCommands) {
    bridge.bedrockCommands.registerCommand("bridgehub", p => openHub(p), "Öffnet das zentrale BridgeHub-Menü");
    bridge.bedrockCommands.registerCommand("bhub", p => openHub(p), "Öffnet das zentrale BridgeHub-Menü");
    console.warn("[hub] bereit (registry-getrieben) — Kompass oder ?bridgehub / ?bhub");
  } else if (tries < 200) system.runTimeout(() => reg(tries + 1), 5);
}
reg();
