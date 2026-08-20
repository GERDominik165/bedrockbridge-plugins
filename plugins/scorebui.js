// universalScoreboard.js
// A single-file universal scoreboard plugin
// Version: 1.0.0

import { Player, world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

/* -------------------------------------------------------------------------- */
/*                               Database Class                                */
/* -------------------------------------------------------------------------- */
/**
 * A small, universal key-value Database that stores JSON in
 * Minecraft world's DynamicProperties. If you have your own system,
 * you can replace or unify this.
 */
export const Database = function (name = "default") {
  const prefix = `db_${name}::`;
  const parse = (json) => {
    try { return JSON.parse(json); } catch { return undefined; }
  };

  return {
    get(key) {
      const raw = world.getDynamicProperty(prefix + key);
      return parse(raw);
    },
    set(key, value) {
      world.setDynamicProperty(prefix + key, JSON.stringify(value));
    },
    del(key) {
      world.setDynamicProperty(prefix + key, undefined);
    },
    getAll() {
      const allKeys = world.getDynamicPropertyIds();
      const list = [];
      for (const id of allKeys) {
        if (!id.startsWith(prefix)) continue;
        const raw = world.getDynamicProperty(id);
        const val = parse(raw);
        if (val !== undefined) list.push(id.substring(prefix.length));
      }
      return list;
    },
    new(key) {
      if (this.get(key)) throw new Error(`Key "${key}" already exists.`);
      this.set(key, true);
    }
  };
};

/* -------------------------------------------------------------------------- */
/*                    Universal Scoreboard Plugin Logic                       */
/* -------------------------------------------------------------------------- */

// 1) We create 3 small Database instances for storing scoreboard data
const ranksDb = new Database("Ranks");
const SettingsDb = new Database("UniScoreSettings");
const SettingsLang = new Database("UniScoreLang");

// 2) Global references
let scoreboard = 'actionbar {"rawtext":[{"rawtext":[{"text":" §4§k44§r§o§4§l Universal Scoreboard §4§k44§r\\n"},{"text":"§7 Player: §6"},{"selector":"@s"}';  
let MONEY = "Money";  // default objective name for money

// 3) Available color codes
const colors = [
  '§f','§1','§2','§3','§4','§5','§6','§7','§8','§9','§a','§b','§c','§d','§e'
];

/* -------------------------------------------------------------------------- */
/*                         Language / Translation Map                          */
/* -------------------------------------------------------------------------- */
const translations = {
  English: {
    timePlayed: "Time Played: §2",
    money: "Money: §6$",
    kdr: "KDR: §e",
    killstreak: "Killstreak: §4",
    playerKills: "Player Kills: §4",
    deaths: "Deaths: §4",
    warnings: "Warnings: §4",
    entities: "Entities: §4",
    rank: "Rank: ",
    online: "Online: §4",
    MemberCount: "Members: §6",
    blocksBroken: "Blocks Broken: §4",
    blocksPlaced: "Blocks Placed: §6",
    itemsUsed: "Items Used: §a",
    totalXP: "Current XP: §b",
    cps: "CPS: §b",
    realmCode: "Realm Code: ",
    tikTok: "TikTok: ",
    youtube: "YouTube: ",
    discord: "Discord: ",
    playerName: "Player: §6"
  },
  // Feel free to adapt or remove the languages you don't need:
  French: {
    timePlayed: "Temps joué: §2",
    money: "Argent: §6$",
    kdr: "KDR: §e",
    killstreak: "Killstreak: §4",
    playerKills: "Tués joueurs: §4",
    deaths: "Morts: §4",
    warnings: "Avertissements: §4",
    entities: "Entités: §4",
    rank: "Rang: ",
    online: "En ligne: §4",
    MemberCount: "Membres: §6",
    blocksBroken: "Blocs cassés: §4",
    blocksPlaced: "Blocs placés: §6",
    itemsUsed: "Objets utilisés: §a",
    totalXP: "XP actuel: §b",
    cps: "CPS: §b",
    realmCode: "Code du royaume: ",
    tikTok: "TikTok: ",
    youtube: "YouTube: ",
    discord: "Discord: ",
    playerName: "Joueur: §6"
  },
  // Add or adapt more translations if you want
};

// 4) Ensure scoreboard objectives exist
const scoreboardObjectives = [
  'Days','Hours','Minutes','Seconds','Warning','deaths','PlayersOn','Entites','welcomer','Members',
  'BlocksBroken','BlocksPlaced','ItemsUsed','PlayerKills','KDR','KDR0.1','KDR0.01','Killstreak',
  'TotalXP','CPS','RealmCode','TikTok','coOwnerOwner'
];
scoreboardObjectives.forEach(obj => {
  try {
    world.getDimension("overworld").runCommand(`scoreboard objectives add ${obj} dummy`);
  } catch {}
});

// 5) Helper function to increment a scoreboard objective when an event occurs
function trackAction(eventName, objective, entityKey = "player") {
  world.afterEvents[eventName].subscribe(ev => {
    const ent = ev[entityKey];
    if (!(ent instanceof Player)) return;
    try {
      world.getDimension("overworld")
        .runCommand(`scoreboard players add "${ent.name}" ${objective} 1`);
    } catch {}
  });
}
// Example usage:
trackAction("playerBreakBlock", "BlocksBroken");
trackAction("playerPlaceBlock", "BlocksPlaced");
trackAction("itemUse", "ItemsUsed", "source");

// scoreboard cache
const objCache = {};
function getScore(player, objective) {
  try {
    const so = objCache[objective] ??= world.scoreboard.getObjective(objective);
    return so?.getScore(player.scoreboardIdentity) ?? 0;
  } catch {
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/*                           KDR Calculation                                  */
/* -------------------------------------------------------------------------- */
function calcKDR() {
  for (const p of world.getPlayers()) {
    const kills = getScore(p, "PlayerKills") ?? 0;
    const death = getScore(p, "deaths") ?? 0;
    const kVal = death > 0 ? kills / death : kills;

    const kdr1 = Math.floor(kVal);
    const kdr0_1 = Math.floor((kVal - kdr1) * 10);
    const kdr0_01 = Math.floor((kVal - kdr1 - kdr0_1/10) * 100);

    try {
      p.runCommandAsync(`scoreboard players set @s KDR ${kdr1}`);
      p.runCommandAsync(`scoreboard players set @s KDR0.1 ${kdr0_1}`);
      p.runCommandAsync(`scoreboard players set @s KDR0.01 ${kdr0_01}`);
    } catch {}
  }
}

// add kill for pvp kills
world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  const killer = damageSource?.damagingEntity;
  if (!(killer instanceof Player)) return;
  if (deadEntity instanceof Player) {
    try {
      killer.runCommandAsync(`scoreboard players add @s PlayerKills 1`);
      killer.runCommandAsync(`scoreboard players add @s Killstreak 1`);
    } catch {}
  }
});

/* -------------------------------------------------------------------------- */
/*                     Example function for "XP" logic                        */
/* -------------------------------------------------------------------------- */
function getPlayerLevel(p) {
  // You can write your own logic to fetch actual XP or scoreboard-based levels
  // For demonstration, we do a static approach:
  return 30;
}

/* -------------------------------------------------------------------------- */
/*                            CPS Tracking                                    */
/* -------------------------------------------------------------------------- */
const clicks = new Map();
function getCPS(player) {
  const now = Date.now();
  const arr = clicks.get(player) ?? [];
  const recent = arr.filter(o => now - 1000 < o.timestamp);
  clicks.set(player, recent);
  return recent.length;
}

world.afterEvents.entityHitBlock.subscribe(({ damagingEntity }) => {
  if (!(damagingEntity instanceof Player)) return;
  const arr = clicks.get(damagingEntity) || [];
  arr.push({ timestamp: Date.now() });
  clicks.set(damagingEntity, arr);

  // update scoreboard
  const cVal = getCPS(damagingEntity);
  try {
    world.getDimension("overworld").runCommand(`scoreboard players set "${damagingEntity.name}" CPS ${cVal}`);
  } catch {}
});
world.afterEvents.entityHitEntity.subscribe(({ damagingEntity }) => {
  if (!(damagingEntity instanceof Player)) return;
  const arr = clicks.get(damagingEntity) || [];
  arr.push({ timestamp: Date.now() });
  clicks.set(damagingEntity, arr);

  const cVal = getCPS(damagingEntity);
  try {
    world.getDimension("overworld").runCommand(`scoreboard players set "${damagingEntity.name}" CPS ${cVal}`);
  } catch {}
});

/* -------------------------------------------------------------------------- */
/*   Interval loop: Update scoreboard, KDR, XP, reset CPS, etc. (every 1s)    */
/* -------------------------------------------------------------------------- */
system.runInterval(() => {
  calcKDR();
  for (const p of world.getPlayers()) {
    const levelVal = getPlayerLevel(p);
    try {
      world.getDimension("overworld").runCommand(`scoreboard players set "${p.name}" TotalXP ${levelVal}`);
      world.getDimension("overworld").runCommand(`scoreboard players set @a CPS 0`);
      // ensure each objective has +0
      scoreboardObjectives.forEach(obj => {
        world.getDimension("overworld").runCommand(`scoreboard players add @a ${obj} 0`);
      });
    } catch {}
  }
  // update scoreboard for each "rank" in DB
  const allRanks = ranksDb.getAll();
  allRanks.forEach(r => updateBoardForRank(r));
}, 20);

function updateBoardForRank(DBrank) {
  const sets = getSettings();
  scoreboard = buildScoreboard(sets, DBrank);

  if (sets.sidebar) {
    try {
      world.getDimension("overworld").runCommand(
        `execute @a[tag=${DBrank}] ~~~ titleraw @s ${scoreboard}]}`
      );
    } catch {}
  } else {
    // clear scoreboard
    try {
      world.getDimension("overworld").runCommand(
        `execute @a ~~~ titleraw @s title {"rawtext":[{"text":" "}]}`
      );
    } catch {}
    // set scoreboard
    try {
      world.getDimension("overworld").runCommand(
        `execute @a[tag=${DBrank}] ~~~ titleraw @s ${scoreboard}]}`
      );
    } catch {}
  }

  // optional welcome message
  if (sets.Welcome) {
    try {
      world.getDimension("overworld").runCommand('execute @a[scores={welcomer=..1}] ~~~ scoreboard players add MemberCounter Members 1');
      world.getDimension("overworld").runCommand('scoreboard players operation @a Members = MemberCounter Members');
      world.getDimension("overworld").runCommand(`execute @a[scores={welcomer=..1}] ~~~ tellraw @a {"rawtext":[{"text":"§e[Universal Scoreboard] "},{"selector":"@s"},{"text":" is new! Enjoy :D"},{"text":"\\nNow we have "},{"score":{"name":"*","objective":"Members"}},{"text":" members!"}]}`);
      world.getDimension("overworld").runCommand('scoreboard players add @a welcomer 5');
    } catch {}
  }
}

/* -------------------------------------------------------------------------- */
/*                       Read scoreboard settings                              */
/* -------------------------------------------------------------------------- */
function getSettings() {
  const keys = [
    'bold','tiny','italic','timePlayed','money','deaths','warnings',
    'entities','rank','online','blocksBroken','blocksPlaced','itemsUsed',
    'playerKills','sidebar','PlayerName','kdr','killstreak','totalXP','cps','Welcome','MemberCount'
  ];
  // default fallback
  const data = {
    TitleColor: SettingsDb.get('UniScoreSettings:TitleColor') || '1',
    OnlineValue: SettingsDb.get('UniScoreSettings:OnlineValue') || '1',
    Title: SettingsDb.get('UniScoreSettings:Title') || '§lUniversalSB',
    Title_Descrption: SettingsDb.get('UniScoreSettings:Title_Descrption') || 'Universal Scoreboard plugin!',
    objective_money: SettingsDb.get('UniScoreSettings:Objective_Money') || 'Money',
    Youtube_Descrption: SettingsDb.get('UniScoreSettings:Youtube_Descrption') || 'YouTube: ChannelHere',
    Discord_Descrption: SettingsDb.get('UniScoreSettings:Discord_Descrption') || 'Discord: LinkHere',
    TikTok: SettingsDb.get('UniScoreSettings:TikTok') || 'TikTok: MyTikTok',
    RealmCode: SettingsDb.get('UniScoreSettings:RealmCode') || 'Realm: ABCD',
    coOwnerOwner: SettingsDb.get('UniScoreSettings:coOwnerOwner') || 'Owner: AdminName'
  };
  keys.forEach(k => {
    data[k] = SettingsDb.get(`UniScoreSettings:${k}`) === "1";
  });
  return data;
}

/* -------------------------------------------------------------------------- */
/*                      Build scoreboard lines (JSON)                         */
/* -------------------------------------------------------------------------- */
function buildScoreboard(sets, DBrank) {
  const userLang = SettingsLang.get('UniScoreLang:language') || "English";
  const lang = translations[userLang] || translations["English"];
  MONEY = sets.objective_money ?? 'Money';
  const onlineVal = Number(sets.OnlineValue ?? '1');

  let sb = 'actionbar {"rawtext":[';
  if (sets.sidebar) sb = `title {"rawtext":[`;

  // style
  if (sets.bold) sb += `{"text": "§l"},`;
  if (sets.tiny) sb += `{"text": "✨"},`;
  if (sets.italic) sb += `{"text": "§o"},`;
  if (sets.TitleColor) {
    const idx = Number(sets.TitleColor) - 1;
    sb += `{"text": "${colors[idx] ?? '§f'}"},`;
  }

  // Title, desc, owner line
  if (sets.Title?.trim()) {
    sb += `{"text": "${sets.Title.trim()}"},`;
  }
  if (sets.Title_Descrption?.trim()) {
    sb += `{"text": "§7\\n ${sets.Title_Descrption.trim()}"},`;
  }
  if (sets.coOwnerOwner?.trim()) {
    sb += `{"text": "§7\\n ${sets.coOwnerOwner.trim()}"},`;
  }

  // scoreboard lines
  if (sets.timePlayed) {
    sb += `{"text":"§7\\n ${lang.timePlayed}"},{"score":{"name":"*","objective":"Days"}},{"text":"D "},{"score":{"name":"*","objective":"Hours"}},{"text":"H "},{"score":{"name":"*","objective":"Minutes"}},{"text":"M "},{"score":{"name":"*","objective":"Seconds"}},{"text":"S"},`;
  }
  if (sets.money) {
    sb += `{"text":"§7\\n ${lang.money}"},{"score":{"name":"*","objective":"${MONEY}"}},`;
  }
  if (sets.kdr) {
    sb += `{"text":"§7\\n ${lang.kdr}"},{"score":{"name":"*","objective":"KDR"}},{"text":"."},{"score":{"name":"*","objective":"KDR0.1"}},{"score":{"name":"*","objective":"KDR0.01"}},`;
  }
  if (sets.killstreak) {
    sb += `{"text":"§7\\n ${lang.killstreak}"},{"score":{"name":"*","objective":"Killstreak"}},`;
  }
  if (sets.playerKills) {
    sb += `{"text":"§7\\n ${lang.playerKills}"},{"score":{"name":"*","objective":"PlayerKills"}},`;
  }
  if (sets.deaths) {
    sb += `{"text":"§7\\n ${lang.deaths}"},{"score":{"name":"*","objective":"deaths"}},`;
  }
  if (sets.warnings) {
    sb += `{"text":"§7\\n ${lang.warnings}"},{"score":{"name":"*","objective":"Warning"}},`;
  }
  if (sets.entities) {
    sb += `{"text":"§7\\n ${lang.entities}"},{"score":{"name":"*","objective":"Entites"}},`;
  }
  if (sets.rank) {
    sb += `{"text":"§7\\n ${lang.rank}${DBrank}"},`;
  }
  if (sets.online) {
    sb += `{"text":"§7\\n ${lang.online}"},{"score":{"name":"*","objective":"PlayersOn"}},{"text":" / ${onlineVal}"},`;
  }
  if (sets.MemberCount) {
    sb += `{"text":"§7\\n ${lang.MemberCount}"},{"score":{"name":"*","objective":"Members"}},`;
  }
  if (sets.blocksBroken) {
    sb += `{"text":"§7\\n ${lang.blocksBroken}"},{"score":{"name":"*","objective":"BlocksBroken"}},`;
  }
  if (sets.blocksPlaced) {
    sb += `{"text":"§7\\n ${lang.blocksPlaced}"},{"score":{"name":"*","objective":"BlocksPlaced"}},`;
  }
  if (sets.itemsUsed) {
    sb += `{"text":"§7\\n ${lang.itemsUsed}"},{"score":{"name":"*","objective":"ItemsUsed"}},`;
  }
  if (sets.totalXP) {
    sb += `{"text":"§7\\n ${lang.totalXP}"},{"score":{"name":"*","objective":"TotalXP"}},`;
  }
  if (sets.cps) {
    sb += `{"text":"§7\\n ${lang.cps}"},{"score":{"name":"*","objective":"CPS"}},`;
  }

  // realm code + socials
  if (sets.RealmCode?.trim()) {
    sb += `{"text":"\\n§7 ${sets.RealmCode.trim()}"},`;
  }
  if (sets.TikTok?.trim()) {
    sb += `{"text":"\\n§7 ${sets.TikTok.trim()}"},`;
  }
  if (sets.Youtube_Descrption?.trim()) {
    sb += `{"text":"\\n§7 ${sets.Youtube_Descrption.trim()}"},`;
  }
  if (sets.Discord_Descrption?.trim()) {
    sb += `{"text":"\\n§7 ${sets.Discord_Descrption.trim()}"},`;
  }
  if (sets.PlayerName) {
    sb += `{"text":"\\n§7 ${lang.playerName}"},{"selector":"@s"},`;
  }
  sb += `{"text":""}`;
  return sb;
}

/* -------------------------------------------------------------------------- */
/*                      UI Activation via "scoreboard:universal_config"        */
/* -------------------------------------------------------------------------- */
world.beforeEvents.itemUse.subscribe(ev => {
  const pl = ev.source;
  if (!(pl instanceof Player)) return;
  // Feel free to rename your item type id to something else
  if (ev.itemStack.typeId !== "scoreboard:universal_config") return;
  // open main menu
  system.run(() => showMainMenu(pl));
});

function showMainMenu(player) {
  const form = new ActionFormData()
    .title("Universal Scoreboard – Main Menu")
    .body("Manage scoreboard settings, ranks, and more.")
    .button("Scoreboard Settings","textures/ui/accessibility_glyph_color")
    .button("Add Rank","textures/ui/icon_best3")
    .button("Clear Rank","textures/ui/enable_editor")
    .button("Set Language","textures/ui/gear")
    .button("Credits","textures/ui/blue_info_glyph");

  form.show(player).then(res => {
    if (res.canceled) return;
    switch (res.selection) {
      case 0: openScoreboardSettingsUI(player); break;
      case 1: openAddRankUI(player); break;
      case 2: openRemoveRankUI(player); break;
      case 3: openLanguageUI(player); break;
      case 4: openCreditsUI(player); break;
    }
  });
}

function openScoreboardSettingsUI(pl) {
  const sets = getSettings();
  const colorVal = Number(sets.TitleColor);
  const onVal = Number(sets.OnlineValue);

  const form = new ModalFormData()
    .title("Scoreboard Settings")
    .textField("Title: (shown above scoreboard)","§lUniversalSB", sets.Title)
    .slider(
      "Pick Title Color (1=White..15=Yellow)",
      1,15,1, colorVal
    )
    .textField("Title Description: (below title)","Map By: Example", sets.Title_Descrption)
    .textField("Co-Owner/Owner:","Owner: SomeName", sets.coOwnerOwner)

    .toggle(toggleText("Bold Font"), sets.bold)
    .toggle(toggleText("Tiny Font"), sets.tiny)
    .toggle(toggleText("Italic Font"), sets.italic)
    .toggle(toggleText("Show Time Played"), sets.timePlayed)
    .toggle(toggleText("Show Money"), sets.money)
    .textField("Money Objective: (for scoreboard)","Money", sets.objective_money)

    .toggle(toggleText("Show KDR"), sets.kdr)
    .toggle(toggleText("Show Killstreak"), sets.killstreak)
    .toggle(toggleText("Show Player Kills"), sets.playerKills)
    .toggle(toggleText("Show Deaths"), sets.deaths)
    .toggle(toggleText("Show Warnings"), sets.warnings)
    .toggle(toggleText("Show Entities"), sets.entities)
    .toggle(toggleText("Show Rank"), sets.rank)
    .toggle(toggleText("Show Online #"), sets.online)
    .slider("Set Max Players Online",10,1000,10, onVal)
    .toggle(toggleText("Show Member Count"), sets.MemberCount)
    .toggle(toggleText("Show Blocks Broken"), sets.blocksBroken)
    .toggle(toggleText("Show Blocks Placed"), sets.blocksPlaced)
    .toggle(toggleText("Show Items Used"), sets.itemsUsed)
    .toggle(toggleText("Show Current XP"), sets.totalXP)
    .toggle(toggleText("Show CPS"), sets.cps)
    .toggle(toggleText("Use Sidebar Mode"), sets.sidebar)

    .textField("YouTube Link/Descr","YT: ChannelHere", sets.Youtube_Descrption)
    .textField("Discord Link/Descr","DC: LinkHere", sets.Discord_Descrption)
    .textField("TikTok Link/Descr","TikTok: ??", sets.TikTok)
    .textField("Realm Code/Descr","Realm: ABCD", sets.RealmCode)

    .toggle(toggleText("Show Player Name"), sets.PlayerName)
    .toggle(toggleText("Enable Welcome Msg"), sets.Welcome);

  function toggleText(label) {
    return label;
  }

  form.show(pl).then(r => {
    if (r.canceled) return;
    const fv = r.formValues;
    // read them in order:
    const [
      Title,
      TitleColor,
      TitleDesc,
      coOwner,
      bold, tiny, italic, tPlayed,
      moneyOn, moneyObj,
      kdR, killstreak, pKills, deths, warn, ents, rank, onln,
      onlnVal, memCnt, bBroken, bPlaced, iUsed, tXP, cPS, sideBar,
      yDesc, dDesc, tTik, rCode,
      pName, welc
    ] = fv;

    // store them
    SettingsDb.set("UniScoreSettings:Title", Title.trim() || " ");
    SettingsDb.set("UniScoreSettings:TitleColor", `${TitleColor}`);
    SettingsDb.set("UniScoreSettings:OnlineValue", `${onlnVal}`);
    SettingsDb.set("UniScoreSettings:Title_Descrption", TitleDesc.trim() || " ");
    SettingsDb.set("UniScoreSettings:coOwnerOwner", coOwner.trim() || " ");
    SettingsDb.set("UniScoreSettings:Objective_Money", moneyObj.trim() || " ");
    SettingsDb.set("UniScoreSettings:Youtube_Descrption", yDesc.trim() || " ");
    SettingsDb.set("UniScoreSettings:Discord_Descrption", dDesc.trim() || " ");
    SettingsDb.set("UniScoreSettings:TikTok", tTik.trim() || " ");
    SettingsDb.set("UniScoreSettings:RealmCode", rCode.trim() || " ");

    if (moneyObj.trim() !== "Money") {
      try {
        world.getDimension("overworld").runCommand(
          `scoreboard objectives add ${moneyObj.trim()} dummy`
        );
      } catch {}
      MONEY = moneyObj.trim();
    }

    const toggles = {
      bold, tiny, italic, timePlayed: tPlayed, money: moneyOn,
      kdr: kdR, killstreak, playerKills: pKills, deaths: deths, warnings: warn,
      entities: ents, rank, online: onln, blocksBroken: bBroken, blocksPlaced: bPlaced,
      itemsUsed: iUsed, totalXP: tXP, cps: cPS, sidebar: sideBar,
      PlayerName: pName, Welcome: welc, MemberCount: memCnt
    };
    for (const [k, v] of Object.entries(toggles)) {
      SettingsDb.set(`UniScoreSettings:${k}`, v ? "1" : "0");
    }
  });
}

function openAddRankUI(pl) {
  const f = new ModalFormData()
    .title("Add Ranks Menu")
    .textField("Add Ranks:\n(This displays on scoreboard)", "§lMember, §dVIP");
  f.show(pl).then(r => {
    if (r.canceled) return;
    const val = r.formValues[0];
    if (!val) return;
    try {
      ranksDb.new(val);
      world.sendMessage(`[Scoreboard] Added new rank: ${val}`);
      world.sendMessage(`(Remember to tag yourself: /tag @s add "${val}" )`);
    } catch (e) {
      world.sendMessage(`Could not add rank: ${e.message}`);
    }
  });
}

async function openRemoveRankUI(pl) {
  const all = ranksDb.getAll();
  if (all.length === 0) {
    world.sendMessage("No ranks to remove!");
    return;
  }
  let page = 0;
  const totalPages = Math.ceil(all.length / 5);

  while (true) {
    const start = page * 4;
    const end = start + 4;
    const pageItems = all.slice(start, end);

    const form = new ActionFormData()
      .title("Remove Ranks Menu")
      .body(`Select a rank to remove.\nPage ${page+1} of ${totalPages}`);
    pageItems.forEach(r => {
      form.button(`Remove: [${r}]`, "textures/ui/anvil_icon");
    });
    let navCount = 0;
    if (page > 0) {
      form.button("<- Prev Page", "textures/ui/generic_dpad_left");
      navCount++;
    }
    if (end < all.length) {
      form.button("Next Page ->", "textures/ui/generic_dpad_right");
      navCount++;
    }
    form.button("Close", "textures/ui/icon_map");
    const resp = await form.show(pl);
    if (!resp || resp.canceled) return;

    const idx = resp.selection;
    const pLen = pageItems.length;
    if (idx === pLen + navCount) return; // close
    if (page > 0 && idx === pLen) {
      page--;
      continue;
    }
    if (end < all.length && idx === pLen + (page>0?1:0)) {
      page++;
      continue;
    }
    const rankToRemove = pageItems[idx];
    if (!rankToRemove) return;

    // confirm
    const confirmForm = new ActionFormData()
      .title("Confirm Rank Removal")
      .body(`Really remove rank: ${rankToRemove}?`)
      .button("Go Back","textures/ui/icon_map")
      .button("Remove","textures/ui/anvil_icon");
    const cResp = await confirmForm.show(pl);
    if (!cResp || cResp.selection !== 1) continue;
    try {
      ranksDb.del(rankToRemove);
      world.sendMessage(`[Scoreboard] Removed rank: ${rankToRemove}`);
    } catch (e) {
      world.sendMessage(`Failed removing: ${e.message}`);
    }
  }
}

function openLanguageUI(pl) {
  const curr = SettingsLang.get('UniScoreLang:language') || "English";
  const languages = [
    "English","French","German","Spanish","Italian","Portuguese","Dutch","Russian","Chinese"
  ];
  let idx = languages.indexOf(curr);
  if (idx<0) idx=0;
  const f = new ModalFormData()
    .title("Set Language")
    .dropdown("Pick a language:", languages, idx);
  f.show(pl).then(r => {
    if (!r || r.canceled) return;
    const sel = r.formValues[0];
    const chosen = languages[sel];
    SettingsLang.set('UniScoreLang:language', chosen);
    world.sendMessage(`Scoreboard language set to: ${chosen}`);
  });
}

function openCreditsUI(pl) {
  const f = new ActionFormData()
    .title("Scoreboard Credits")
    .body(`Universal Scoreboard Plugin\nFully customizable scoreboard for Bedrock!\n\nContributors: Dev1, Dev2\nThank you for using our universal scoreboard!`)
    .button("Close","textures/ui/icon_map");
  f.show(pl).then(()=>{});
}


// --- In das zentrale BridgeHub registrieren ---
import { hub as _bridgeHub } from "./hubAPI.js";
try {
  _bridgeHub.register({ id: "scoreboard", title: "📋 Scoreboard", icon: "textures/ui/icon_book_writable", category: "Anzeige", order: 20, handler: showMainMenu });
  console.warn("[scoreboard] im Hub registriert");
} catch (e) { console.warn("[scoreboard] hub-reg: " + e); }
