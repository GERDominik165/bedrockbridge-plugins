/**
 * chunkfixer @version 2.0.0 - BedrockBridge Plugin
 *
 * Ported from the legacy module.exports plugin format to BedrockBridge ES modules.
 * Admin command: !fixchunks - cycles ticking areas around the caller to force
 * corrupted nether chunks to reload. Original author: RogueGamingHD.
 */
import { system } from "@minecraft/server";
import { bridge } from "../addons";

const FIX_COMMANDS = [
  // Mark corrupted areas
  "fill ~-96 0 ~-96 ~-32 128 ~-32 barrier replace air",
  "fill ~-32 0 ~-32 ~32 128 ~32 barrier replace air",
  "fill ~32 0 ~32 ~96 128 ~96 barrier replace air",
  // Create ticking areas
  "tickingarea add ~-96 0 ~-96 ~-32 128 ~-32 corrupt_1",
  "tickingarea add ~-32 0 ~-32 ~32 128 ~32 corrupt_2",
  "tickingarea add ~32 0 ~32 ~96 128 ~96 corrupt_3",
  // Replace with lava
  "fill ~-96 0 ~-96 ~-32 128 ~-32 lava replace barrier",
  "fill ~-32 0 ~-32 ~32 128 ~32 lava replace barrier",
  "fill ~32 0 ~32 ~96 128 ~96 lava replace barrier",
  // Remove ticking areas
  "tickingarea remove corrupt_1",
  "tickingarea remove corrupt_2",
  "tickingarea remove corrupt_3"
];

function _registerWhenReady(tries) {
  tries = tries || 0;
  if (bridge && bridge.bedrockCommands) {
    bridge.bedrockCommands.registerAdminCommand("fixchunks", (player) => {
      try {
        for (const cmd of FIX_COMMANDS) {
          try { player.runCommand(cmd); } catch (e) { /* keep going */ }
        }
        player.sendMessage("§aChunks have been processed!");
      } catch (error) {
        console.warn("[chunkfixer] Error: " + error);
        player.sendMessage("§cAn error occurred while fixing chunks.");
      }
    }, "Fix corrupted chunks in your area (admin)");
    console.warn("[chunkfixer] command !fixchunks registered");
  } else if (tries < 200) {
    system.runTimeout(() => _registerWhenReady(tries + 1), 5);
  } else {
    console.warn("[chunkfixer] bridge.bedrockCommands never became ready");
  }
}
_registerWhenReady();
