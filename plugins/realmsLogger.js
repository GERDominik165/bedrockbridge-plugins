/**
 * RealmsStoryLogger – BedrockBridge Plugin
 *
 * Liest Realms Story Logs wie "NamedMob", "metadata.metatext", etc.
 * und leitet sie an Discord weiter.
 */

import { system } from "@minecraft/server";
import { bridgeDirect } from "../addons";

const realmsRegex = /Realms Story :: event: (\w+), xuids: \[ (.+?) \], metadata: (.+)/;

function scanConsoleLine(line) {
  const match = line.match(realmsRegex);
  if (!match) return;

  const [_, eventName, xuidsRaw, metadataRaw] = match;
  const xuids = xuidsRaw.trim();
  let metadata;

  try {
    metadata = JSON.parse(metadataRaw);
  } catch {
    metadata = { metatext: "Unbekannt" };
  }

  const metatext = metadata.metatext || "Unbenannt";

  bridgeDirect.sendEmbed({
    title: `📖 Realms Story: ${eventName}`,
    description: `**XUIDs**: \`${xuids}\`\n**Metatext**: \`${metatext}\``,
    color: 0x3498db,
    footer: { text: `Realms Logger` },
    timestamp: new Date().toISOString()
  }, "RealmsLogger", "https://mc-heads.net/avatar/RealmsLogger");

  console.log(`[RealmsLogger] Logged Realms event '${eventName}' for ${xuids}`);
}

// Wenn serverLogs existiert (z. B. in einem erweiterten BedrockBridge-System mit log-hook)
// Hier pseudo-event, das z. B. von deinem Log-Watcher aufgerufen wird:
// serverLogs.on("info", scanConsoleLine);

// Alternativ: Manuelles Parsen aus externem Tool, NodeJS, Docker oder modifizierter Engine
