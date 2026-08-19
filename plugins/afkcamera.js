// ═══════════════════════════════════════════════════════════════════════════
// 🎥 AFK CAMERA PLUGIN – ULTIMATE PROFESSIONAL EDITION
// ═══════════════════════════════════════════════════════════════════════════
// Complete Fully-Configurable AFK System with Advanced Admin Controls
// by poweroffapt | TrophyNetwork
// ═══════════════════════════════════════════════════════════════════════════

import { system, world, DisplaySlotId } from "@minecraft/server";
import { ModalFormData, ActionFormData } from "@minecraft/server-ui";
import { bridge, bridgeDirect, database } from "../addons";

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

bridge.events.bridgeInitialize.subscribe(e => {
  e.registerAddition("discord_direct");
  console.warn("✅ DiscordDirect activated for AFK Plugin");
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const AFK_TAG = "isAfk";
const WHITELIST_TAG = "afk_immune";

const CAMERA_PRESETS = [
  { name: "Top-Right", x: 2, y: 1.5, z: 2 },
  { name: "Bottom-Left", x: -2, y: 2, z: -2 },
  { name: "Top-Center", x: 0, y: 3, z: 0 },
  { name: "Side-View", x: 1, y: 2, z: -1 },
  { name: "Far-Back", x: 3, y: 2.5, z: 3 },
  { name: "Close-Up", x: 0.5, y: 1, z: 0.5 },
  { name: "Wide-Angle", x: 4, y: 3, z: 4 },
  { name: "High-View", x: 0, y: 5, z: 0 }
];

const PUNISHMENT_LEVELS = {
  0: { minutes: 0, name: "🟢 Active", effect: null },
  1: { minutes: 5, name: "🟡 Warning", effect: "slowness", duration: 60 },
  2: { minutes: 10, name: "🟠 Caution", effect: "mining_fatigue", duration: 120 },
  3: { minutes: 15, name: "🔴 Critical", effect: "weakness", duration: 180 }
};

const CONFIG_KEYS = {
  idleTime: "afk_idleTime",
  kickEnabled: "afk_kickEnabled",
  kickDelay: "afk_kickDelay",
  kickWarning: "afk_kickWarning",
  kickMessage: "afk_kickMessage",
  afkMessage: "afk_afkMessage",
  notAfkMessage: "afk_notAfkMessage",
  warnMessage: "afk_warnMessage",
  kickReason: "afk_kickReason",
  ignoreAdmins: "afk_ignoreAdmins",
  notifyAll: "afk_notifyAll",
  notifyStatusChanges: "afk_notifyStatusChanges",
  punishmentEnabled: "afk_punishmentEnabled",
  punishmentDuration: "afk_punishmentDuration",
  analyticsEnabled: "afk_analyticsEnabled",
  chatDetection: "afk_chatDetection",
  cameraPush: "afk_cameraPush",
  cameraEffectInterval: "afk_cameraEffectInterval",
  scoreboardEnabled: "afk_scoreboardEnabled",
  discordNotifications: "afk_discordNotifications"
};

const defaultConfig = {
  idleTime: 300,
  kickEnabled: true,
  kickDelay: 180,
  kickWarning: true,
  kickMessage: "Inactivity Notice",
  afkMessage: "§7{player} is now AFK.",
  notAfkMessage: "§7{player} is no longer AFK.",
  warnMessage: "§cIf you remain AFK, you will be kicked in {kickDelay} seconds!",
  kickReason: "You were AFK for too long.",
  ignoreAdmins: true,
  notifyAll: true,
  notifyStatusChanges: true,
  punishmentEnabled: false,
  punishmentDuration: 60,
  analyticsEnabled: true,
  chatDetection: true,
  cameraPush: true,
  cameraEffectInterval: 80,
  scoreboardEnabled: true,
  discordNotifications: true
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA STORAGE
// ═══════════════════════════════════════════════════════════════════════════

const config = {};
const playerStates = new Map();
const playerAnalytics = database.makeTable("afkCameraAnalytics");
const afkStats = database.makeTable("afkCameraStats");
const afkLeaderboard = database.makeTable("afkCameraLeaderboard");
const afkTimeObjective = world.scoreboard.getObjective("afk_time") ||
  world.scoreboard.addObjective("afk_time", "AFK time in minutes");

// Load config from world properties
for (const [key, def] of Object.entries(defaultConfig)) {
  let val = world.getDynamicProperty(CONFIG_KEYS[key]);
  if (val === undefined) {
    val = def;
    world.setDynamicProperty(CONFIG_KEYS[key], val);
  }
  config[key] = val;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatDuration(ticks) {
  const totalSec = Math.floor(ticks / 20);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min > 0 ? min + "m " : ""}${sec}s`;
}

function sendDiscordEmbed(title, description, color, playerName) {
  if (!config.discordNotifications || !bridgeDirect?.ready) return;
  try {
    bridgeDirect.sendEmbed({
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: { text: `Tick: ${system.currentTick}` }
    }, "AFK-System", `https://mc-heads.net/avatar/${playerName}`);
  } catch (e) {
    console.warn(`[AFK] Discord error: ${e}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS & LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════

function recordAnalytics(playerName, eventType, data = {}) {
  if (!config.analyticsEnabled) return;
  try {
    const key = `${playerName}_${eventType}_${system.currentTick}`;
    playerAnalytics.set(key, {
      player: playerName,
      event: eventType,
      timestamp: new Date().toISOString(),
      tick: system.currentTick,
      ...data
    });
  } catch (e) {
    console.warn(`[AFK] Analytics error: ${e}`);
  }
}

function updateLeaderboard(playerName, afkMinutes) {
  try {
    const existing = afkLeaderboard.get(playerName) || { player: playerName, totalMinutes: 0, sessions: 0 };
    existing.totalMinutes += afkMinutes;
    existing.sessions += 1;
    existing.lastUpdate = system.currentTick;
    afkLeaderboard.set(playerName, existing);
  } catch (e) {
    console.warn(`[AFK] Leaderboard error: ${e}`);
  }
}

function getLeaderboard(limit = 10) {
  try {
    const entries = [];
    const keys = [];
    for (const key of afkLeaderboard.keys?.() || []) {
      keys.push(key);
    }
    for (const key of keys) {
      const data = afkLeaderboard.get(key);
      if (data) entries.push(data);
    }
    return entries.sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, limit);
  } catch (e) {
    console.warn(`[AFK] Leaderboard fetch error: ${e}`);
    return [];
  }
}

function getAFKPlayersList() {
  const afkPlayers = [];
  for (const player of world.getPlayers()) {
    if (player?.hasTag?.(AFK_TAG)) {
      const state = playerStates.get(player.name);
      if (state) {
        const afkMinutes = Math.floor(state.idle / 1200);
        afkPlayers.push({
          name: player.name,
          minutes: afkMinutes,
          duration: formatDuration(state.idle)
        });
      }
    }
  }
  return afkPlayers;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUNISHMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function applyPunishment(player, afkMinutes) {
  if (!config.punishmentEnabled) return;
  try {
    let level = 0;
    for (const [lvl, data] of Object.entries(PUNISHMENT_LEVELS)) {
      if (afkMinutes >= data.minutes) level = parseInt(lvl);
    }

    const punishment = PUNISHMENT_LEVELS[level];
    if (punishment && punishment.effect) {
      try {
        const duration = Math.max(punishment.duration, config.punishmentDuration);
        player.addEffect(punishment.effect, duration, { amplifier: 1 });
      } catch (e) {
        console.warn(`[AFK] Effect error: ${e}`);
      }
    }
  } catch (e) {
    console.warn(`[AFK] Punishment error: ${e}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

function applyCameraEffect(player) {
  try {
    if (!player || !config.cameraPush) return;
    if (!CAMERA_PRESETS || CAMERA_PRESETS.length === 0) return;

    const preset = CAMERA_PRESETS[Math.floor(Math.random() * CAMERA_PRESETS.length)];
    if (!preset) return;

    const fade = Math.random();
    const headLoc = player.getHeadLocation();
    const playerLoc = player.location;

    if (fade > 0.7) {
      try {
        player.camera.fade({
          fadeTime: {
            fadeInTime: Math.min(fade, 1),
            holdTime: 0.5,
            fadeOutTime: Math.min(fade, 1)
          }
        });
      } catch (e) {
        console.warn(`[AFK] Fade error: ${e}`);
      }
    }

    try {
      player.camera.setCamera("minecraft:free", {
        location: {
          x: playerLoc.x + preset.x,
          y: headLoc.y + preset.y,
          z: playerLoc.z + preset.z
        },
        facingLocation: headLoc,
        rotation: {
          x: (Math.random() - 0.5) * 60,
          y: (Math.random() - 0.5) * 60
        },
        zoom: 1 + Math.random() * 0.5,
        easeOptions: { easeTime: 2.5 }
      });
    } catch (e) {
      console.warn(`[AFK] Camera error: ${e}`);
    }
  } catch (e) {
    console.warn(`[AFK] Camera effect error: ${e}`);
  }
}

function clearCameraIfAFK(player) {
  try {
    if (player?.hasTag?.(AFK_TAG)) {
      player?.removeTag?.(AFK_TAG);
      try {
        player.camera.clear();
      } catch (e) {
        console.warn(`[AFK] Clear camera error: ${e}`);
      }
    }
  } catch (e) {
    console.warn(`[AFK] Clear AFK error: ${e}`);
  }
}

function removePlayerFromScoreboard(player) {
  try {
    afkTimeObjective.removeParticipant(player);
  } catch (e) {
    console.warn(`[AFK] Scoreboard remove error: ${e}`);
  }
}

function cleanupOfflinePlayersFromScoreboard() {
  try {
    const activePlayers = new Set(world.getPlayers().map(p => p.name));
    const participants = afkTimeObjective.getParticipants();

    for (const participant of participants) {
      const playerName = participant.displayName;
      if (!activePlayers.has(playerName)) {
        try {
          afkTimeObjective.removeParticipant(participant);
        } catch (e) {
          console.warn(`[AFK] Remove offline player error: ${e}`);
        }
      }
    }
  } catch (e) {
    console.warn(`[AFK] Cleanup offline error: ${e}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SETTINGS MENUS – COMPREHENSIVE GUI SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function showMainSettingsMenu(player) {
  new ActionFormData()
    .title("§6🎯 AFK Camera Control Panel")
    .body("§7━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n§eSelect configuration area:\n§7━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    .button("⏱️ Timeout Settings", "")
    .button("🚪 Kick Settings", "")
    .button("🔔 Notification Settings", "")
    .button("⚡ Punishment Settings", "")
    .button("📊 Analytics Settings", "")
    .button("📝 Message Templates", "")
    .button("🎥 Camera Settings", "")
    .button("💬 Discord Settings", "")
    .button("📋 View Statistics", "")
    .button("🏆 View Leaderboard", "")
    .button("🛠️ Admin Tools", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;
      switch(response.selection) {
        case 0: showTimeoutSettings(player); break;
        case 1: showKickSettings(player); break;
        case 2: showNotificationSettings(player); break;
        case 3: showPunishmentSettings(player); break;
        case 4: showAnalyticsSettings(player); break;
        case 5: showMessageSettings(player); break;
        case 6: showCameraSettings(player); break;
        case 7: showDiscordSettings(player); break;
        case 8: showFullStatistics(player); break;
        case 9: showLeaderboardGUI(player); break;
        case 10: showAdminTools(player); break;
      }
    });
}

function showTimeoutSettings(player) {
  new ModalFormData()
    .title("⏱️ Timeout Configuration")
    .slider("AFK Idle Time (seconds)", 60, 900, 60, config.idleTime)
    .show(player)
    .then(({ canceled, formValues }) => {
      if (canceled) return;
      try {
        config.idleTime = formValues[0];
        world.setDynamicProperty(CONFIG_KEYS.idleTime, config.idleTime);

        player.sendMessage("§a✓ Timeout settings updated!");
        player.sendMessage(`§eIdle Time: §a${config.idleTime}s`);
        sendDiscordEmbed("Timeout Settings Updated",
          `Idle: ${config.idleTime}s\nBy: ${player.name}`,
          0x00aaff, player.name);
        showMainSettingsMenu(player);
      } catch (e) {
        console.warn(`[AFK] Timeout error: ${e}`);
        player.sendMessage("§cError: " + e);
      }
    });
}

function showKickSettings(player) {
  new ActionFormData()
    .title("🚪 Kick System")
    .body(`Status: ${config.kickEnabled ? "§aENABLED" : "§cDISABLED"}`)
    .button("§eToggle Kick", "")
    .button("⏱️ Kick Delay", "")
    .button("⚠️ Warning Toggle", "")
    .button("📝 Kick Messages", "")
    .button("ℹ️ Kick Info", "")
    .button("§8← Back", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;
      switch(response.selection) {
        case 0: toggleKickSystem(player); break;
        case 1: setKickDelay(player); break;
        case 2: toggleKickWarning(player); break;
        case 3: showKickMessages(player); break;
        case 4: showKickInfo(player); break;
        case 5: showMainSettingsMenu(player); break;
      }
    });
}

function toggleKickSystem(player) {
  config.kickEnabled = !config.kickEnabled;
  world.setDynamicProperty(CONFIG_KEYS.kickEnabled, config.kickEnabled);

  player.sendMessage(`§a✓ Kick system ${config.kickEnabled ? "§aENABLED" : "§cDISABLED"}!`);
  sendDiscordEmbed("Kick System",
    `Status: ${config.kickEnabled ? "ENABLED" : "DISABLED"}\nBy: ${player.name}`,
    config.kickEnabled ? 0x00ff00 : 0xff0000, player.name);
  showKickSettings(player);
}

function setKickDelay(player) {
  new ModalFormData()
    .title("⏱️ Kick Delay")
    .slider("Delay (seconds)", 60, 600, 60, config.kickDelay)
    .show(player)
    .then(({ canceled, formValues }) => {
      if (canceled) return;
      try {
        config.kickDelay = formValues[0];
        world.setDynamicProperty(CONFIG_KEYS.kickDelay, config.kickDelay);

        player.sendMessage("§a✓ Kick delay updated!");
        player.sendMessage(`§eKick after: §a${config.kickDelay}s`);
        sendDiscordEmbed("Kick Delay", `${config.kickDelay}s by ${player.name}`, 0x00aaff, player.name);
        showKickSettings(player);
      } catch (e) {
        console.warn(`[AFK] Kick delay error: ${e}`);
        player.sendMessage("§cError: " + e);
      }
    });
}

function toggleKickWarning(player) {
  config.kickWarning = !config.kickWarning;
  world.setDynamicProperty(CONFIG_KEYS.kickWarning, config.kickWarning);

  player.sendMessage(`§a✓ Warnings ${config.kickWarning ? "§aENABLED" : "§cDISABLED"}!`);
  sendDiscordEmbed("Kick Warning",
    `Status: ${config.kickWarning ? "ENABLED" : "DISABLED"}\nBy: ${player.name}`,
    config.kickWarning ? 0x00ff00 : 0xff0000, player.name);
  showKickSettings(player);
}

function showKickMessages(player) {
  new ModalFormData()
    .title("📝 Kick Messages")
    .textField("Kick Message", config.kickMessage)
    .textField("Kick Reason", config.kickReason)
    .show(player)
    .then(({ canceled, formValues }) => {
      if (canceled) return;
      try {
        config.kickMessage = formValues[0] || defaultConfig.kickMessage;
        config.kickReason = formValues[1] || defaultConfig.kickReason;

        world.setDynamicProperty(CONFIG_KEYS.kickMessage, config.kickMessage);
        world.setDynamicProperty(CONFIG_KEYS.kickReason, config.kickReason);

        player.sendMessage("§a✓ Kick messages updated!");
        sendDiscordEmbed("Kick Messages", `By: ${player.name}`, 0x00aaff, player.name);
        showKickSettings(player);
      } catch (e) {
        console.warn(`[AFK] Kick messages error: ${e}`);
        player.sendMessage("§cError: " + e);
      }
    });
}

function showKickInfo(player) {
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  player.sendMessage("§6🚪 Kick System Info:");
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  player.sendMessage(`§eKick: ${config.kickEnabled ? "§a✓" : "§c✗"}`);
  player.sendMessage(`§eDelay: §a${config.kickDelay}s`);
  player.sendMessage(`§eWarning: ${config.kickWarning ? "§a✓" : "§c✗"}`);
  player.sendMessage(`§eReason: §a${config.kickReason}`);
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  showKickSettings(player);
}

function showNotificationSettings(player) {
  new ModalFormData()
    .title("🔔 Notifications")
    .show(player)
    .then(({ canceled }) => {
      if (canceled) return;
      try {
        new ActionFormData()
          .title("🔔 Notification Settings")
          .body(`Notify All: ${config.notifyAll ? "§a✓" : "§c✗"}\nStatus: ${config.notifyStatusChanges ? "§a✓" : "§c✗"}\nChat: ${config.chatDetection ? "§a✓" : "§c✗"}`)
          .button("§eNotify All", "")
          .button("§eStatus Changes", "")
          .button("§eChat Detection", "")
          .button("§8← Back", "")
          .show(player)
          .then(response => {
            if (response.canceled) return;
            switch(response.selection) {
              case 0:
                config.notifyAll = !config.notifyAll;
                world.setDynamicProperty(CONFIG_KEYS.notifyAll, config.notifyAll);
                player.sendMessage(`§a✓ Notify All: ${config.notifyAll ? "ON" : "OFF"}`);
                break;
              case 1:
                config.notifyStatusChanges = !config.notifyStatusChanges;
                world.setDynamicProperty(CONFIG_KEYS.notifyStatusChanges, config.notifyStatusChanges);
                player.sendMessage(`§a✓ Status Changes: ${config.notifyStatusChanges ? "ON" : "OFF"}`);
                break;
              case 2:
                config.chatDetection = !config.chatDetection;
                world.setDynamicProperty(CONFIG_KEYS.chatDetection, config.chatDetection);
                player.sendMessage(`§a✓ Chat Detection: ${config.chatDetection ? "ON" : "OFF"}`);
                break;
              case 3:
                showMainSettingsMenu(player);
                return;
            }
            sendDiscordEmbed("Notifications", `By: ${player.name}`, 0x00aaff, player.name);
            showNotificationSettings(player);
          });
      } catch (e) {
        console.warn(`[AFK] Notification error: ${e}`);
        player.sendMessage("§cError: " + e);
      }
    });
}

function showPunishmentSettings(player) {
  new ActionFormData()
    .title("⚡ Punishment")
    .body(`Status: ${config.punishmentEnabled ? "§aENABLED" : "§cDISABLED"}`)
    .button("§eToggle System", "")
    .button("⏱️ Duration", "")
    .button("ℹ️ Levels", "")
    .button("§8← Back", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;
      switch(response.selection) {
        case 0:
          config.punishmentEnabled = !config.punishmentEnabled;
          world.setDynamicProperty(CONFIG_KEYS.punishmentEnabled, config.punishmentEnabled);
          player.sendMessage(`§a✓ Punishment: ${config.punishmentEnabled ? "ON" : "OFF"}`);
          sendDiscordEmbed("Punishment", `Status: ${config.punishmentEnabled ? "ON" : "OFF"}\nBy: ${player.name}`, config.punishmentEnabled ? 0x00ff00 : 0xff0000, player.name);
          showPunishmentSettings(player);
          break;
        case 1:
          new ModalFormData()
            .title("⏱️ Effect Duration")
            .slider("Duration (ticks)", 20, 600, 20, config.punishmentDuration)
            .show(player)
            .then(({ canceled: c, formValues }) => {
              if (c) return;
              config.punishmentDuration = formValues[0];
              world.setDynamicProperty(CONFIG_KEYS.punishmentDuration, config.punishmentDuration);
              player.sendMessage(`§a✓ Duration: §a${config.punishmentDuration} ticks`);
              showPunishmentSettings(player);
            });
          break;
        case 2:
          player.sendMessage("§6Punishment Levels:");
          for (const [lvl, data] of Object.entries(PUNISHMENT_LEVELS)) {
            player.sendMessage(`${data.name} - ${data.minutes}m${data.effect ? ` (${data.effect})` : ""}`);
          }
          showPunishmentSettings(player);
          break;
        case 3:
          showMainSettingsMenu(player);
          break;
      }
    });
}

function showAnalyticsSettings(player) {
  new ActionFormData()
    .title("📊 Analytics")
    .body(`Status: ${config.analyticsEnabled ? "§aENABLED" : "§cDISABLED"}`)
    .button("§eToggle Analytics", "")
    .button("§8← Back", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;
      if (response.selection === 0) {
        config.analyticsEnabled = !config.analyticsEnabled;
        world.setDynamicProperty(CONFIG_KEYS.analyticsEnabled, config.analyticsEnabled);
        player.sendMessage(`§a✓ Analytics: ${config.analyticsEnabled ? "ON" : "OFF"}`);
        sendDiscordEmbed("Analytics", `Status: ${config.analyticsEnabled ? "ON" : "OFF"}\nBy: ${player.name}`, config.analyticsEnabled ? 0x00ff00 : 0xff0000, player.name);
        showAnalyticsSettings(player);
      } else {
        showMainSettingsMenu(player);
      }
    });
}

function showMessageSettings(player) {
  new ModalFormData()
    .title("📝 Messages")
    .textField("AFK Start", config.afkMessage)
    .textField("AFK End", config.notAfkMessage)
    .textField("Kick Warning", config.warnMessage)
    .show(player)
    .then(({ canceled, formValues }) => {
      if (canceled) return;
      try {
        config.afkMessage = formValues[0] || defaultConfig.afkMessage;
        config.notAfkMessage = formValues[1] || defaultConfig.notAfkMessage;
        config.warnMessage = formValues[2] || defaultConfig.warnMessage;

        world.setDynamicProperty(CONFIG_KEYS.afkMessage, config.afkMessage);
        world.setDynamicProperty(CONFIG_KEYS.notAfkMessage, config.notAfkMessage);
        world.setDynamicProperty(CONFIG_KEYS.warnMessage, config.warnMessage);

        player.sendMessage("§a✓ Messages updated!");
        sendDiscordEmbed("Messages", `By: ${player.name}`, 0x00aaff, player.name);
        showMainSettingsMenu(player);
      } catch (e) {
        console.warn(`[AFK] Message error: ${e}`);
        player.sendMessage("§cError: " + e);
      }
    });
}

function showCameraSettings(player) {
  new ActionFormData()
    .title("🎥 Camera")
    .body(`Status: ${config.cameraPush ? "§aENABLED" : "§cDISABLED"}`)
    .button("§eToggle Camera", "")
    .button("⏱️ Interval", "")
    .button("📋 Presets", "")
    .button("§8← Back", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;
      switch(response.selection) {
        case 0:
          config.cameraPush = !config.cameraPush;
          world.setDynamicProperty(CONFIG_KEYS.cameraPush, config.cameraPush);
          player.sendMessage(`§a✓ Camera: ${config.cameraPush ? "ON" : "OFF"}`);
          sendDiscordEmbed("Camera", `Status: ${config.cameraPush ? "ON" : "OFF"}\nBy: ${player.name}`, config.cameraPush ? 0x00ff00 : 0xff0000, player.name);
          showCameraSettings(player);
          break;
        case 1:
          new ModalFormData()
            .title("⏱️ Interval")
            .slider("Interval (ticks)", 20, 200, 20, config.cameraEffectInterval)
            .show(player)
            .then(({ canceled: c, formValues }) => {
              if (c) return;
              config.cameraEffectInterval = formValues[0];
              world.setDynamicProperty(CONFIG_KEYS.cameraEffectInterval, config.cameraEffectInterval);
              player.sendMessage(`§a✓ Interval: §a${config.cameraEffectInterval} ticks`);
              showCameraSettings(player);
            });
          break;
        case 2:
          player.sendMessage("§6Camera Presets:");
          for (let i = 0; i < CAMERA_PRESETS.length; i++) {
            const p = CAMERA_PRESETS[i];
            player.sendMessage(`§e${i + 1}. §f${p.name}§8 (${p.x}, ${p.y}, ${p.z})`);
          }
          showCameraSettings(player);
          break;
        case 3:
          showMainSettingsMenu(player);
          break;
      }
    });
}

function showDiscordSettings(player) {
  new ActionFormData()
    .title("💬 Discord")
    .body(`Status: ${config.discordNotifications ? "§aENABLED" : "§cDISABLED"}`)
    .button("§eToggle Discord", "")
    .button("§8← Back", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;
      if (response.selection === 0) {
        config.discordNotifications = !config.discordNotifications;
        world.setDynamicProperty(CONFIG_KEYS.discordNotifications, config.discordNotifications);
        player.sendMessage(`§a✓ Discord: ${config.discordNotifications ? "ON" : "OFF"}`);
        sendDiscordEmbed("Discord", `Status: ${config.discordNotifications ? "ON" : "OFF"}\nBy: ${player.name}`, config.discordNotifications ? 0x00ff00 : 0xff0000, player.name);
        showDiscordSettings(player);
      } else {
        showMainSettingsMenu(player);
      }
    });
}

function showFullStatistics(player) {
  try {
    const afkPlayers = getAFKPlayersList();
    const totalMinutes = afkPlayers.reduce((sum, p) => sum + p.minutes, 0);
    const allPlayers = world.getPlayers();

    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    player.sendMessage("§6📊 Statistics");
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    player.sendMessage(`§eServer: §a${allPlayers.length}`);
    player.sendMessage(`§eAFK: §a${afkPlayers.length}`);
    player.sendMessage(`§eTotal Minutes: §a${totalMinutes}`);
    player.sendMessage(`§eKick: ${config.kickEnabled ? "§a✓" : "§c✗"}`);
    player.sendMessage(`§ePunishment: ${config.punishmentEnabled ? "§a✓" : "§c✗"}`);
    player.sendMessage(`§eAnalytics: ${config.analyticsEnabled ? "§a✓" : "§c✗"}`);
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (afkPlayers.length > 0) {
      player.sendMessage("§6AFK Players:");
      for (const afk of afkPlayers) {
        player.sendMessage(`§e• §f${afk.name}§8 - §7${afk.duration}`);
      }
      player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }

    showMainSettingsMenu(player);
  } catch (e) {
    console.warn(`[AFK] stats error: ${e}`);
    player.sendMessage("§cError: " + e);
  }
}

function showLeaderboardGUI(player) {
  try {
    const lb = getLeaderboard(15);
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    player.sendMessage("§6🏆 Leaderboard (Top 15)");
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (lb.length === 0) {
      player.sendMessage("§7No data yet...");
    } else {
      for (let i = 0; i < lb.length; i++) {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        player.sendMessage(`§e${medal} §f${lb[i].player}§8 - §a${lb[i].totalMinutes}m`);
      }
    }
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    showMainSettingsMenu(player);
  } catch (e) {
    console.warn(`[AFK] leaderboard error: ${e}`);
    player.sendMessage("§cError: " + e);
  }
}

function showAdminTools(player) {
  new ActionFormData()
    .title("🛠️ Admin Tools")
    .body("§7Advanced admin controls:")
    .button("🧹 Clear All Offline", "")
    .button("📊 Config Status", "")
    .button("🔄 Reload Config", "")
    .button("⚠️ Reset Config", "")
    .button("📋 View All Players", "")
    .button("§8← Back", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;
      switch(response.selection) {
        case 0:
          playerStates.clear();
          cleanupOfflinePlayersFromScoreboard();
          player.sendMessage("§a✓ Cleared all offline players!");
          sendDiscordEmbed("Admin: Cleanup", `By: ${player.name}`, 0xffaa00, player.name);
          showAdminTools(player);
          break;
        case 1:
          player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          player.sendMessage("§6Config Status:");
          player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          player.sendMessage(`§eIdle: §a${config.idleTime}s`);
          player.sendMessage(`§eKick: ${config.kickEnabled ? "§a✓" : "§c✗"} (${config.kickDelay}s)`);
          player.sendMessage(`§eWarning: ${config.kickWarning ? "§a✓" : "§c✗"}`);
          player.sendMessage(`§ePunishment: ${config.punishmentEnabled ? "§a✓" : "§c✗"}`);
          player.sendMessage(`§eCamera: ${config.cameraPush ? "§a✓" : "§c✗"}`);
          player.sendMessage(`§eAnalytics: ${config.analyticsEnabled ? "§a✓" : "§c✗"}`);
          player.sendMessage(`§eChat Detection: ${config.chatDetection ? "§a✓" : "§c✗"}`);
          player.sendMessage(`§eScoreboard: ${config.scoreboardEnabled ? "§a✓" : "§c✗"}`);
          player.sendMessage(`§eDiscord: ${config.discordNotifications ? "§a✓" : "§c✗"}`);
          player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          showAdminTools(player);
          break;
        case 2:
          let reloaded = 0;
          for (const [key, def] of Object.entries(defaultConfig)) {
            const val = world.getDynamicProperty(CONFIG_KEYS[key]);
            config[key] = val !== undefined ? val : def;
            reloaded++;
          }
          player.sendMessage(`§a✓ Config reloaded! (${reloaded} properties)`);
          sendDiscordEmbed("Admin: Reload", `By: ${player.name}`, 0x00aaff, player.name);
          showAdminTools(player);
          break;
        case 3:
          new ActionFormData()
            .title("⚠️ Reset All?")
            .body("§cThis will reset ALL settings to defaults!")
            .button("§a✓ Yes", "")
            .button("§c✗ No", "")
            .show(player)
            .then(resetResponse => {
              if (resetResponse.canceled || resetResponse.selection === 1) {
                showAdminTools(player);
                return;
              }
              for (const [key, def] of Object.entries(defaultConfig)) {
                config[key] = def;
                world.setDynamicProperty(CONFIG_KEYS[key], def);
              }
              player.sendMessage("§a✓ All settings reset!");
              sendDiscordEmbed("Admin: Reset", `By: ${player.name}`, 0xff6600, player.name);
              showAdminTools(player);
            });
          break;
        case 4:
          const allPlayers = world.getPlayers();
          player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          player.sendMessage(`§6Online Players (${allPlayers.length}):`);
          player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          for (const p of allPlayers) {
            const isAfk = p.hasTag(AFK_TAG);
            const isImmune = p.hasTag(WHITELIST_TAG);
            const isAdmin = p.hasTag("admin");
            player.sendMessage(`§e• §f${p.name}${isAfk ? " §8[§cAFK§8]" : ""}${isImmune ? " §8[§bIMMUNE§8]" : ""}${isAdmin ? " §8[§6ADMIN§8]" : ""}`);
          }
          player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          showAdminTools(player);
          break;
        case 5:
          showMainSettingsMenu(player);
          break;
      }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

world.afterEvents.playerSpawn.subscribe(ev => {
  if (!ev?.player || !ev.player.id) return; // skip SimulatedPlayers
  try {
    if(ev?.player) clearCameraIfAFK(ev.player);
    const playerName = ev.player.name;
    if (playerStates.has(playerName)) {
      playerStates.delete(playerName);
    }
    recordAnalytics(playerName, "player_join", {});
  } catch (e) {
    console.warn("[AFK] Join error: " + e);
  }
});

world.afterEvents.playerLeave.subscribe(ev => {
  try {
    removePlayerFromScoreboard(ev.player);
    playerStates.delete(ev.player.name);
    if (ev.player.hasTag(AFK_TAG)) {
      try {
        ev.player?.removeTag?.(AFK_TAG);
      } catch (e) {}
    }
    recordAnalytics(ev.player.name, "player_leave", {});
  } catch (e) {
    console.warn(`[AFK] Leave error: ${e}`);
  }
});

world.afterEvents.chatSend.subscribe(ev => {
  try {
    if (!config.chatDetection) return;

    const player = ev.sender;
    if (!player || player.hasTag(WHITELIST_TAG)) return;

    if (player?.hasTag?.(AFK_TAG)) {
      clearCameraIfAFK(player);
      removePlayerFromScoreboard(player);

      const state = playerStates.get(player.name);
      if (state) {
        const afkMinutes = Math.floor(state.idle / 1200);
        recordAnalytics(player.name, "afk_end_chat", { duration: afkMinutes });
        updateLeaderboard(player.name, afkMinutes);
      }

      if (config.notifyStatusChanges) {
        world.sendMessage(config.notAfkMessage.replace("{player}", player.name));
      }

      sendDiscordEmbed("AFK ended (Chat)", `💬 ${player.name} sent message`, 0x0066ff, player.name);
      playerStates.delete(player.name);
    }
  } catch (e) {
    console.warn(`[AFK] Chat error: ${e}`);
  }
});

world.afterEvents.itemUse.subscribe(ev => {
  try {
    if (ev.itemStack && ev.itemStack.typeId === "minecraft:slime_ball" && ev.source.hasTag("admin")) {
      showMainSettingsMenu(ev.source);
    }
  } catch (e) {
    console.warn(`[AFK] Item use error: ${e}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN AFK TRACKING LOOP
// ═══════════════════════════════════════════════════════════════════════════

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      if (!player?.isValid || typeof player?.hasTag !== "function") continue;
      if (config.ignoreAdmins && player.hasTag("admin")) continue;
      if (player?.hasTag?.(WHITELIST_TAG)) continue;

      const name = player.name;
      const state = playerStates.get(name) || {
        lastX: player.location.x,
        lastY: player.location.y,
        lastZ: player.location.z,
        rotX: player.getRotation().x,
        rotY: player.getRotation().y,
        idle: 0,
        afkStartTick: 0,
        warned: false,
        kickWarned: false
      };

      const moved =
        Math.abs(player.location.x - state.lastX) > 0.05 ||
        Math.abs(player.location.y - state.lastY) > 0.05 ||
        Math.abs(player.location.z - state.lastZ) > 0.05 ||
        Math.abs(player.getRotation().x - state.rotX) > 2 ||
        Math.abs(player.getRotation().y - state.rotY) > 2;

      if (moved) {
        if (player?.hasTag?.(AFK_TAG)) {
          clearCameraIfAFK(player);
          removePlayerFromScoreboard(player);
          if (config.notifyStatusChanges) {
            world.sendMessage(config.notAfkMessage.replace("{player}", name));
          }
          const afkMinutes = Math.floor(state.idle / 1200);
          sendDiscordEmbed("AFK ended", `✅ ${name} moved`, 0x00ff00, name);
          recordAnalytics(name, "afk_end_movement", { duration: afkMinutes });
          updateLeaderboard(name, afkMinutes);
        }
        state.idle = 0;
        state.warned = false;
        state.kickWarned = false;
      } else {
        state.idle++;

        if (!player.hasTag(AFK_TAG) && state.idle >= config.idleTime * 20) {
          try {
            player?.addTag?.(AFK_TAG);
          } catch (e) {
            console.warn(`[AFK] Tag error: ${e}`);
          }
          state.afkStartTick = system.currentTick;
          if (config.notifyStatusChanges) {
            world.sendMessage(config.afkMessage.replace("{player}", name));
          }
          sendDiscordEmbed("AFK started", `🛌 ${name} AFK`, 0xffff00, name);
          recordAnalytics(name, "afk_start", { tick: system.currentTick });
          try {
            if (config.scoreboardEnabled) {
              world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
                objective: afkTimeObjective
              });
            }
          } catch (e) {
            console.warn(`[AFK] Scoreboard error: ${e}`);
          }
        }

        if (player?.hasTag?.(AFK_TAG)) {
          const afkMinutes = Math.floor(state.idle / 1200);

          if (config.punishmentEnabled && afkMinutes >= 5) {
            applyPunishment(player, afkMinutes);
          }

          if (config.kickWarning && config.kickEnabled && !state.kickWarned && state.idle >= (config.idleTime + config.kickDelay - 40) * 20) {
            try {
              player.sendMessage(config.warnMessage.replace("{kickDelay}", config.kickDelay.toString()));
              state.kickWarned = true;
            } catch (e) {
              console.warn(`[AFK] Warn error: ${e}`);
            }
          }

          if (config.kickEnabled && state.idle >= (config.idleTime + config.kickDelay) * 20) {
            try {
              world.getDimension("overworld").runCommand(`kick ${name} ${config.kickReason}`);
              if (config.notifyAll) {
                world.sendMessage(`§c⏱ ${name} kicked (AFK).`);
              }
              sendDiscordEmbed("AFK kick", `🔨 ${name} kicked`, 0xff0000, name);
              recordAnalytics(name, "afk_kick", { duration: afkMinutes });
              removePlayerFromScoreboard(player);
              playerStates.delete(name);
            } catch (e) {
              console.warn(`[AFK] Kick error: ${e}`);
            }
            continue;
          }

          if (state.idle % config.cameraEffectInterval === 0) {
            applyCameraEffect(player);
          }

          try {
            if (config.scoreboardEnabled) {
              afkTimeObjective.setScore(player, Math.floor(state.idle / 1200));
            }
          } catch (e) {
            console.warn(`[AFK] Score error: ${e}`);
          }
        }
      }

      state.lastX = player.location.x;
      state.lastY = player.location.y;
      state.lastZ = player.location.z;
      state.rotX = player.getRotation().x;
      state.rotY = player.getRotation().y;
      playerStates.set(name, state);
    } catch (e) {
      console.warn(`[AFK] Loop error: ${e}`);
    }
  }
}, 1);

// ═══════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

function toggleAFKMode(player) {
  try {
    const state = playerStates.get(player.name) || {
      lastX: player.location.x,
      lastY: player.location.y,
      lastZ: player.location.z,
      rotX: player.getRotation().x,
      rotY: player.getRotation().y,
      idle: 0,
      afkStartTick: 0,
      warned: false,
      kickWarned: false
    };

    if (player?.hasTag?.(AFK_TAG)) {
      clearCameraIfAFK(player);
      removePlayerFromScoreboard(player);
      player.sendMessage("§a✓ AFK ended.");
      if (config.notifyStatusChanges) {
        world.sendMessage(`§7${player.name} left AFK.`);
      }
      sendDiscordEmbed("AFK ended", `✅ ${player.name}`, 0x00ff00, player.name);
      state.idle = 0;
    } else {
      try {
        player?.addTag?.(AFK_TAG);
      } catch (e) {
        console.warn(`[AFK] Tag error: ${e}`);
      }
      state.afkStartTick = system.currentTick;
      state.idle = 0;
      state.warned = false;
      state.kickWarned = false;
      player.sendMessage("§e✓ AFK enabled.");
      if (config.notifyStatusChanges) {
        world.sendMessage(config.afkMessage.replace("{player}", player.name));
      }
      sendDiscordEmbed("AFK started", `🛌 ${player.name}`, 0xffff00, player.name);
      applyCameraEffect(player);
      try {
        if (config.scoreboardEnabled) {
          world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
            objective: afkTimeObjective
          });
        }
      } catch (e) {
        console.warn(`[AFK] Scoreboard error: ${e}`);
      }
    }
    playerStates.set(player.name, state);
  } catch (e) {
    console.warn(`[AFK] Toggle error: ${e}`);
    player.sendMessage("§cError: " + e);
  }
}

// Player Commands
bridge.bedrockCommands.registerCommand("afk", (player) => {
  toggleAFKMode(player);
}, "Toggle AFK");

bridge.bedrockCommands.registerCommand("afklist", (player) => {
  try {
    const afkPlayers = getAFKPlayersList();
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    player.sendMessage(`§6AFK Players (${afkPlayers.length}):`);
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (afkPlayers.length === 0) {
      player.sendMessage("§7None");
    } else {
      for (const afk of afkPlayers) {
        player.sendMessage(`§e• §f${afk.name}§8 - §7${afk.duration}`);
      }
    }
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (e) {
    console.warn(`[AFK] afklist error: ${e}`);
    player.sendMessage("§cError: " + e);
  }
}, "View AFK players");

bridge.bedrockCommands.registerCommand("afkleaderboard", (player) => {
  try {
    const lb = getLeaderboard(10);
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    player.sendMessage("§6🏆 Leaderboard:");
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (lb.length === 0) {
      player.sendMessage("§7No data");
    } else {
      for (let i = 0; i < lb.length; i++) {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        player.sendMessage(`§e${medal} §f${lb[i].player}§8 - §a${lb[i].totalMinutes}m`);
      }
    }
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (e) {
    console.warn(`[AFK] leaderboard error: ${e}`);
    player.sendMessage("§cError: " + e);
  }
}, "View leaderboard");

bridge.bedrockCommands.registerCommand("afkhelp", (player) => {
  const prefix = bridge.bedrockCommands.prefix;
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  player.sendMessage("§6Commands:");
  player.sendMessage(`§e${prefix}afk§f - Toggle AFK`);
  player.sendMessage(`§e${prefix}afklist§f - View AFK`);
  player.sendMessage(`§e${prefix}afkleaderboard§f - Leaderboard`);
  player.sendMessage("§6Admin:");
  player.sendMessage(`§e${prefix}afkcameragui§f - Panel`);
  player.sendMessage(`§e${prefix}afkimmune <p>§f - Immunity`);
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}, "Commands");

// Admin Commands
bridge.bedrockCommands.registerAdminCommand("afkcameragui", (player) => {
  showMainSettingsMenu(player);
}, "Control Panel");

bridge.bedrockCommands.registerAdminCommand("afkstats", (player) => {
  try {
    const afkPlayers = getAFKPlayersList();
    const totalMinutes = afkPlayers.reduce((sum, p) => sum + p.minutes, 0);

    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    player.sendMessage("§6📊 Statistics:");
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    player.sendMessage(`§eAFK: §a${afkPlayers.length}`);
    player.sendMessage(`§eMinutes: §a${totalMinutes}`);
    player.sendMessage(`§eServer: §a${world.getPlayers().length}`);
    player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (e) {
    console.warn(`[AFK] stats error: ${e}`);
    player.sendMessage("§cError: " + e);
  }
}, "Statistics");

bridge.bedrockCommands.registerAdminCommand("afkimmune", (player, target) => {
  try {
    const targetPlayer = target?.readPlayer();
    if (!targetPlayer) {
      player.sendMessage("§cNot found!");
      return;
    }

    if (targetPlayer.hasTag(WHITELIST_TAG)) {
      targetPlayer.removeTag(WHITELIST_TAG);
      player.sendMessage(`§c${targetPlayer.name} not immune`);
      sendDiscordEmbed("Immunity", `Removed: ${targetPlayer.name}`, 0xffaa00, targetPlayer.name);
    } else {
      targetPlayer.addTag(WHITELIST_TAG);
      player.sendMessage(`§a${targetPlayer.name} immune`);
      sendDiscordEmbed("Immunity", `Added: ${targetPlayer.name}`, 0x00ff00, targetPlayer.name);
    }
  } catch (e) {
    console.warn(`[AFK] immune error: ${e}`);
    player.sendMessage("§cError: " + e);
  }
}, "Toggle immunity");

bridge.bedrockCommands.registerAdminCommand("afkreset", (player) => {
  try {
    new ActionFormData()
      .title("⚠️ Reset")
      .body("Reset all settings?")
      .button("§aYes", "")
      .button("§cNo", "")
      .show(player)
      .then(response => {
        if (response.canceled || response.selection !== 0) return;

        for (const [key, def] of Object.entries(defaultConfig)) {
          config[key] = def;
          world.setDynamicProperty(CONFIG_KEYS[key], def);
        }

        player.sendMessage("§a✓ Reset!");
        sendDiscordEmbed("Reset", `By: ${player.name}`, 0xff6600, player.name);
        showMainSettingsMenu(player);
      });
  } catch (e) {
    console.warn(`[AFK] reset error: ${e}`);
    player.sendMessage("§cError: " + e);
  }
}, "Reset");

// ═══════════════════════════════════════════════════════════════════════════
// PERIODIC CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

system.runInterval(() => {
  try {
    const activePlayers = new Set(world.getPlayers().map(p => p.name));
    const keysToDelete = [];

    for (const playerName of playerStates.keys()) {
      if (!activePlayers.has(playerName)) {
        keysToDelete.push(playerName);
      }
    }

    keysToDelete.forEach(name => {
      playerStates.delete(name);
    });

    cleanupOfflinePlayersFromScoreboard();
  } catch (e) {
    console.warn(`[AFK] Cleanup error: ${e}`);
  }
}, 1200);

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP LOG
// ═══════════════════════════════════════════════════════════════════════════

const prefix = bridge.bedrockCommands.prefix;
console.log("\n╔═══════════════════════════════════════════════════════════════╗");
console.log("║  🎥 AFK CAMERA PLUGIN – ULTIMATE PROFESSIONAL EDITION 🎥      ║");
console.log("║     Fully Configurable Complete AFK System                    ║");
console.log("╚═══════════════════════════════════════════════════════════════╝");
console.log("\n📋 Commands:");
console.log(`   ${prefix}afkcameragui - Main control panel`);
console.log(`   ${prefix}afk - Toggle AFK`);
console.log(`   ${prefix}afklist - View AFK players`);
console.log(`   ${prefix}afkleaderboard - Leaderboard`);
console.log(`   ${prefix}afkstats - Statistics`);
console.log(`   ${prefix}afkimmune <player> - Immunity`);
console.log("\n✨ Features:");
console.log("   ✓ Complete Kick System (on/off, delay, warning, messages)");
console.log("   ✓ Auto-unAFK on movement, rotation, chat");
console.log("   ✓ 8 Camera presets with intervals");
console.log("   ✓ Punishment levels with durations");
console.log("   ✓ Analytics & leaderboards");
console.log("   ✓ Discord integration");
console.log("   ✓ Player immunity");
console.log("   ✓ Advanced admin tools");
console.log("\n╔═══════════════════════════════════════════════════════════════╗");
console.log("║  ✅ Ready | All Features | Production Ready                   ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");
