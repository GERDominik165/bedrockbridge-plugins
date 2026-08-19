// up-git.js
// GitHub Release Notifier for BDS (Bedrock Dedicated Server)
// Features:
// - Polls GitHub "latest release" for one or more repositories
// - Uses ETag / If-None-Match to minimize rate limit usage
// - Caches latest tag/name/url in world Dynamic Properties
// - Notifies players in chat + on-screen; optional Discord embed via BedrockBridge
// - Commands: !upgit, !upgit check, !upgit latest, !upgit repo <index>
//
// Requires in manifest.json dependencies:
// { "module_name": "@minecraft/server", "version": "1.11.0" }
// { "module_name": "@minecraft/server-ui", "version": "1.4.0-beta" }
// { "module_name": "@minecraft/server-net", "version": "1.0.0-beta" }
// Docs: @minecraft/server-net is BDS-only. HttpRequest/http.request API. 
// https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server-net/minecraft-server-net
// https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server-net/httprequest
// GitHub REST "Get the latest release": /repos/{owner}/{repo}/releases/latest

import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { HttpRequest, HttpHeader, HttpRequestMethod, http } from "@minecraft/server-net";

// ====== Optional: BedrockBridge (Discord Embeds) ======
let bridgeDirect = null;
try {
  const addons = await import("../addons"); // falls das Addon-Layout ../addons exportiert
  bridgeDirect = addons.bridgeDirect;
  console.info("[up-git] BedrockBridge integration loaded");
} catch {
  console.warn("[up-git] Running without BedrockBridge");
}

// ====== Configuration ======
// Füge hier Repositories hinzu, die überwacht werden sollen:
const REPOS = [
  { owner: "InnateAlpaca", repo: "BedrockBridge", label: "BedrockBridge" },
  // Beispiel für euer eigenes Repo:
  // { owner: "TrophyNetwork", repo: "EuerRepoName", label: "TrophyNetwork Core" },
];

// Poll-Intervall: 10 Minuten (20 Ticks/s)
const INTERVAL_TICKS = 20 * 60 * 10;

// BedrockBridge Discord Channel (alias)
const DISCORD_CHANNEL = "GitHubUpdates";

// GitHub Header (Best Practices)
const GITHUB_HEADERS = [
  new HttpHeader("User-Agent", "BDS-GitHub-Notifier/1.0 (+minecraft)"),
  new HttpHeader("Accept", "application/json"),
  new HttpHeader("X-GitHub-Api-Version", "2022-11-28"),
];

// Dynamic Property Prefix
const DP_PREFIX = "upgit"; // z.B. upgit:etag:owner/repo

// Backoff bei RateLimit-Exhaustion (in Ticks); wenn 0 Remaining: pausiert X Minuten
const RATE_LIMIT_BACKOFF_TICKS = 20 * 60 * 15; // 15min

// ====== Helpers: Dynamic Properties ======
function dpKey(kind, repoKey) {
  // kind in {"etag","tag","name","url","pauseUntil"}
  return `${DP_PREFIX}:${kind}:${repoKey}`;
}
function dpGet(key) {
  try { return world.getDynamicProperty(key); } catch { return undefined; }
}
function dpSet(key, val) {
  try { world.setDynamicProperty(key, val); } catch {}
}
function repoKeyOf({ owner, repo }) {
  return `${owner}/${repo}`;
}

// ====== Helpers: Headers ======
function getHeader(headers, name) {
  if (!headers?.find) return undefined;
  const h = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return h?.value;
}

// ====== Core: Fetch Latest Release with ETag ======
async function fetchLatestRelease(repo) {
  const repoKey = repoKeyOf(repo);
  const uri = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`; // latest full release (non-draft, non-prerelease)
  const req = new HttpRequest(uri);
  req.method = HttpRequestMethod.Get;
  req.headers = [...GITHUB_HEADERS];

  // Optional: ETag zum Sparen (304 Not Modified)
  const etag = dpGet(dpKey("etag", repoKey));
  if (etag) req.headers.push(new HttpHeader("If-None-Match", etag));

  // Optional: Timeout (Sekunden)
  req.timeout = 15;

  const res = await http.request(req);

  // RateLimit Handling: wenn 0 remaining → Backoff setzen
  const remaining = Number(getHeader(res.headers, "x-ratelimit-remaining") ?? "1");
  const resetUnix = Number(getHeader(res.headers, "x-ratelimit-reset") ?? "0");
  if (remaining <= 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    const waitSec = Math.max(0, resetUnix - nowSec) + 10; // kleine Pufferzeit
    const pauseUntilTick = currentTick() + Math.max(RATE_LIMIT_BACKOFF_TICKS, waitSec * 20);
    dpSet(dpKey("pauseUntil", repoKey), String(pauseUntilTick));
    console.warn(`[up-git] Rate limit hit for ${repoKey}, pausing ~${waitSec}s`);
  }

  if (res.status === 304) {
    return { updated: false, latest: null, status: 304 };
  }

  if (res.status !== 200) {
    throw new Error(`GitHub ${repoKey} ${res.status}: ${(res.body ?? "").slice(0, 200)}`);
  }

  // ETag speichern
  const newEtag = getHeader(res.headers, "etag");
  if (newEtag) dpSet(dpKey("etag", repoKey), newEtag);

  // Parse JSON
  const j = JSON.parse(res.body); // fields: tag_name, name, html_url, published_at, body, assets[...]
  const latest = {
    tag: j.tag_name,
    name: j.name ?? j.tag_name ?? "(no name)",
    url: j.html_url,
    published_at: j.published_at,
    notes: j.body ?? "",
    assets: Array.isArray(j.assets) ? j.assets.map(a => ({
      name: a.name, url: a.browser_download_url
    })) : [],
  };

  const prevTag = dpGet(dpKey("tag", repoKey));
  const updated = !!prevTag && prevTag !== latest.tag;

  // Cache aktualisieren (immer, damit !upgit latest sofort was hat)
  dpSet(dpKey("tag", repoKey), latest.tag ?? "");
  dpSet(dpKey("name", repoKey), latest.name ?? "");
  dpSet(dpKey("url", repoKey), latest.url ?? "");

  return { updated, latest, status: 200 };
}

// ====== Tick helper ======
let _tickCounter = 0;
system.runInterval(() => { _tickCounter += 1; }, 1);
function currentTick() { return _tickCounter; }

// ====== Notify: In-Game & Discord ======
function notifyAll(repo, latest) {
  const repoKey = repoKeyOf(repo);
  const line = "§6" + "═".repeat(50);
  world.sendMessage(line);
  world.sendMessage(`§b§lGitHub Release §7[§f${repoKey}§7] → §e${latest.name} §8(${latest.tag})`);
  world.sendMessage(`§7URL: §9${latest.url}`);
  if (latest.assets?.length) {
    // zeige max. 2 Assets inline
    const top = latest.assets.slice(0, 2).map(a => `§8• §7${a.name}: §9${a.url}`).join("\n");
    world.sendMessage(top);
  }
  world.sendMessage(line);

  for (const p of world.getAllPlayers()) {
    try {
      p.onScreenDisplay.setTitle(`§6New Release: §e${latest.tag}`, {
        subtitle: `§7${repoKey}`, fadeInDuration: 10, stayDuration: 70, fadeOutDuration: 20
      });
      p.playSound?.("random.levelup", { volume: 0.4, pitch: 1.1 });
    } catch {}
  }

  if (bridgeDirect) {
    try {
      const fields = [
        { name: "Repository", value: repoKey, inline: true },
        { name: "Tag", value: latest.tag ?? "-", inline: true },
      ];
      if (latest.assets?.length) {
        const l = latest.assets.slice(0, 3).map(a => `• [${a.name}](${a.url})`).join("\n");
        fields.push({ name: "Assets", value: l, inline: false });
      }
      bridgeDirect.sendEmbed({
        title: "📦 New GitHub Release",
        description: `**${latest.name}**`,
        url: latest.url,
        color: 0x00b2ff,
        fields,
        timestamp: latest.published_at ?? new Date().toISOString(),
        footer: { text: "up-git notifier" }
      }, DISCORD_CHANNEL);
    } catch (e) {
      console.warn("[up-git] Discord embed failed:", e?.message ?? e);
    }
  }
}

// ====== UI ======
async function openMenu(player) {
  const form = new ActionFormData()
    .title("§b§lGitHub Update Center")
    .body("Wähle ein Repository oder nutze 'Check now'.");

  for (const r of REPOS) {
    const repoKey = repoKeyOf(r);
    const tag = dpGet(dpKey("tag", repoKey)) ?? "—";
    const name = dpGet(dpKey("name", repoKey)) ?? "—";
    form.button(`🧩 ${r.label || repoKey}\n§7${name} §8(${tag})`);
  }
  form.button("🔎 Check now (all)");
  form.button("❓ About");

  const res = await form.show(player);
  if (res.canceled) return;

  const idx = res.selection;
  if (idx < REPOS.length) {
    showLatest(player, REPOS[idx]);
  } else if (idx === REPOS.length) {
    await manualCheck(player);
  } else {
    showAbout(player);
  }
}

function showLatest(player, repo = REPOS[0]) {
  const repoKey = repoKeyOf(repo);
  const tag = dpGet(dpKey("tag", repoKey)) ?? "n/a";
  const name = dpGet(dpKey("name", repoKey)) ?? "n/a";
  const url = dpGet(dpKey("url", repoKey)) ?? "n/a";

  new MessageFormData()
    .title(`${repo.label || repoKey}`)
    .body(`§b${name}\n§7Tag: §e${tag}\n§7URL: §9${url}`)
    .button1("Close")
    .button2("Share")
    .show(player).then(r => {
      if (r.selection === 1) {
        world.sendMessage(`§b[${player.name}] §7Latest (§f${repoKey}§7): §e${name} §8(${tag}) §7→ §9${url}`);
      }
    });
}

function showAbout(player) {
  new MessageFormData()
    .title("About up-git")
    .body(
      "§bup-git – GitHub Release Notifier\n" +
      "• !upgit – Menü öffnen\n" +
      "• !upgit check – jetzt prüfen\n" +
      "• !upgit latest – letztes Release (Repo 1)\n" +
      "• !upgit repo <index> – Repo wählen (1..n)\n"
    )
    .button1("OK")
    .show(player);
}

// ====== Commands ======
world.beforeEvents.chatSend.subscribe(ev => {
  const msg = ev.message.trim();
  const p = ev.sender;
  if (!/^!upgit\b/i.test(msg)) return;

  ev.cancel = true;
  const [, sub, arg] = msg.split(/\s+/, 3);

  system.run(async () => {
    switch ((sub ?? "").toLowerCase()) {
      case "":
        await openMenu(p);
        break;
      case "check":
        await manualCheck(p);
        break;
      case "latest":
        showLatest(p, REPOS[0]);
        break;
      case "repo": {
        const idx = Math.max(1, Math.min(REPOS.length, Number(arg || "1") || 1)) - 1;
        showLatest(p, REPOS[idx]);
        break;
      }
      default:
        await openMenu(p);
    }
  });
});

// ====== Manual check (all repos) ======
async function manualCheck(player) {
  try {
    player?.sendMessage?.("§7[up-git] Checking all repositories…");
    for (const r of REPOS) {
      const repoKey = repoKeyOf(r);
      // RateLimit-Pause beachten
      const pauseUntil = Number(dpGet(dpKey("pauseUntil", repoKey)) ?? "0");
      if (pauseUntil > currentTick()) {
        const secs = Math.ceil((pauseUntil - currentTick()) / 20);
        player?.sendMessage?.(`§8[up-git] Skip ${repoKey} (rate limit backoff ~${secs}s)`);
        continue;
      }
      try {
        const res = await fetchLatestRelease(r);
        if (res.updated && res.latest) {
          notifyAll(r, res.latest);
        } else if (player) {
          const tag = dpGet(dpKey("tag", repoKey)) ?? "n/a";
          player.sendMessage(`§7[up-git] ${repoKey}: no update (latest §e${tag}§7)`);
        }
      } catch (e) {
        const m = e?.message ?? String(e);
        player?.sendMessage?.(`§c[up-git] ${repoKey}: ${m}`);
        console.warn(`[up-git] ${repoKey} error:`, m);
      }
    }
  } catch (e) {
    player?.sendMessage?.(`§c[up-git] Error: ${e?.message ?? e}`);
  }
}

// ====== Auto Poller ======
system.runInterval(async () => {
  for (const r of REPOS) {
    const repoKey = repoKeyOf(r);
    // RateLimit-Pause beachten
    const pauseUntil = Number(dpGet(dpKey("pauseUntil", repoKey)) ?? "0");
    if (pauseUntil > currentTick()) continue;

    try {
      const res = await fetchLatestRelease(r);
      if (res.updated && res.latest) {
        notifyAll(r, res.latest);
      }
    } catch (e) {
      console.warn(`[up-git] Poll error ${repoKey}:`, e?.message ?? e);
    }
  }
}, INTERVAL_TICKS);

// ====== Player Join Hint ======
world.afterEvents.playerJoin.subscribe(ev => {
  const p = ev.player;
  system.runTimeout(() => {
    try {
      p.sendMessage("§7[§bup-git§7] Nutze §b!upgit §7für GitHub-Updates.");
    } catch {}
  }, 60);
});

console.log("[up-git] GitHub Release Notifier loaded");
