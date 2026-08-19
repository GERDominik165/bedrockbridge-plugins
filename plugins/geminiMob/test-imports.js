/**
 * Test imports - Check if all modules load correctly
 */

console.log("Testing imports...");

try {
    console.log("1. Loading config.js...");
    import("./config.js").then(() => console.log("✓ config.js OK")).catch(e => console.error("✗ config.js:", e));
} catch (e) {
    console.error("config.js error:", e);
}

try {
    console.log("2. Loading mobPersonality.js...");
    import("./mobPersonality.js").then(() => console.log("✓ mobPersonality.js OK")).catch(e => console.error("✗ mobPersonality.js:", e));
} catch (e) {
    console.error("mobPersonality.js error:", e);
}

try {
    console.log("3. Loading mobMemory.js...");
    import("./mobMemory.js").then(() => console.log("✓ mobMemory.js OK")).catch(e => console.error("✗ mobMemory.js:", e));
} catch (e) {
    console.error("mobMemory.js error:", e);
}

try {
    console.log("4. Loading mobInteractions.js...");
    import("./mobInteractions.js").then(() => console.log("✓ mobInteractions.js OK")).catch(e => console.error("✗ mobInteractions.js:", e));
} catch (e) {
    console.error("mobInteractions.js error:", e);
}

try {
    console.log("5. Loading mobActions.js...");
    import("./mobActions.js").then(() => console.log("✓ mobActions.js OK")).catch(e => console.error("✗ mobActions.js:", e));
} catch (e) {
    console.error("mobActions.js error:", e);
}

try {
    console.log("6. Loading mobAI.js...");
    import("./mobAI.js").then(() => console.log("✓ mobAI.js OK")).catch(e => console.error("✗ mobAI.js:", e));
} catch (e) {
    console.error("mobAI.js error:", e);
}

try {
    console.log("7. Loading httpClient.js...");
    import("./httpClient.js").then(() => console.log("✓ httpClient.js OK")).catch(e => console.error("✗ httpClient.js:", e));
} catch (e) {
    console.error("httpClient.js error:", e);
}

try {
    console.log("8. Loading conversationManager.js...");
    import("./conversationManager.js").then(() => console.log("✓ conversationManager.js OK")).catch(e => console.error("✗ conversationManager.js:", e));
} catch (e) {
    console.error("conversationManager.js error:", e);
}

try {
    console.log("9. Loading mobDatabase.js...");
    import("./mobDatabase.js").then(() => console.log("✓ mobDatabase.js OK")).catch(e => console.error("✗ mobDatabase.js:", e));
} catch (e) {
    console.error("mobDatabase.js error:", e);
}

try {
    console.log("10. Loading messageFormatter.js...");
    import("./messageFormatter.js").then(() => console.log("✓ messageFormatter.js OK")).catch(e => console.error("✗ messageFormatter.js:", e));
} catch (e) {
    console.error("messageFormatter.js error:", e);
}

console.log("Test complete!");
