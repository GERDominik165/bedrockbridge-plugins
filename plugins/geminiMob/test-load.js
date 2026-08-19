// Test if imports work without trying to use world.afterEvents

console.log("Starting import test...");

try {
    console.log("Importing minecraft/server...");
    const { world, system } = await import("@minecraft/server");
    console.log("✓ minecraft/server imported");
    console.log("  world:", typeof world);
    console.log("  system:", typeof system);
    console.log("  world.afterEvents:", typeof world?.afterEvents);

    console.log("\nImporting config.js...");
    const config = await import("./config.js");
    console.log("✓ config.js imported");

    console.log("\nImporting mobPersonality.js...");
    const personality = await import("./mobPersonality.js");
    console.log("✓ mobPersonality.js imported");

    console.log("\nImporting mobMemory.js...");
    const memory = await import("./mobMemory.js");
    console.log("✓ mobMemory.js imported");

    console.log("\nImporting mobInteractions.js...");
    const interactions = await import("./mobInteractions.js");
    console.log("✓ mobInteractions.js imported");

    console.log("\nImporting mobActions.js...");
    const actions = await import("./mobActions.js");
    console.log("✓ mobActions.js imported");

    console.log("\nImporting conversationManager.js...");
    const conversation = await import("./conversationManager.js");
    console.log("✓ conversationManager.js imported");

    console.log("\nImporting mobDatabase.js...");
    const database = await import("./mobDatabase.js");
    console.log("✓ mobDatabase.js imported");

    console.log("\nImporting messageFormatter.js...");
    const formatter = await import("./messageFormatter.js");
    console.log("✓ messageFormatter.js imported");

    console.log("\n✅ All imports successful!");
    console.log("\nChecking world.afterEvents availability:");
    console.log("  world:", typeof world);
    console.log("  world.afterEvents:", typeof world?.afterEvents);
    console.log("  world.afterEvents.worldLoad:", typeof world?.afterEvents?.worldLoad);
    console.log("  Can subscribe?:", typeof world?.afterEvents?.worldLoad?.subscribe);

} catch (e) {
    console.error("❌ Import failed:", e.message);
    console.error(e.stack);
}
