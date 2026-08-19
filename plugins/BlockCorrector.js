/**
 * BlockCorrector @version 2.0.0 - BedrockBridge Plugin
 *
 * Ported from the legacy module.exports plugin format to BedrockBridge ES modules.
 * Runs the `safezone/block_corrector` function on every player every 5 seconds
 * (100 ticks). Original author: RogueGamingHD.
 */
import { world, system } from "@minecraft/server";

console.warn("[BlockCorrector] loaded");

system.runInterval(() => {
  try {
    // Modern execute syntax; runs the function at each player's position.
    world.getDimension("overworld").runCommand(
      "execute as @a at @s run function safezone/block_corrector"
    );
  } catch (error) {
    console.warn("[BlockCorrector] Error: " + error);
  }
}, 100);
