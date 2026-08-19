/**
 * Gemini Mob Plugin - Main Module (SIMPLE TEST)
 * Test: Can we load ANYTHING?
 */

import { world, system } from "@minecraft/server";

console.log("[TEST] Plugin module loading...");

world.afterEvents.worldLoad.subscribe(() => {
    console.log("[TEST] World loaded!");
});

console.log("[TEST] Subscriptions registered");
