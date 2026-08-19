// development_behavior_packs/Bedrock-Bridge/scripts/bridgePlugins/BlockCorrector.js

module.exports = {
    name: "BlockCorrector",
    version: "1.0.0",
    author: "RogueGamingHD",
    
    onLoad() {
        console.log("[BlockCorrector] Plugin loaded!");
    },

    onEnable() {
        console.log("[BlockCorrector] Plugin enabled!");
        // Run block correction every 5 seconds
        this.registerInterval(() => {
            try {
                this.runCommand('execute @a ~ ~ ~ function safezone/block_corrector');
                console.log("[BlockCorrector] Running block correction");
            } catch (error) {
                console.error("[BlockCorrector] Error: " + error);
            }
        }, 100);
    },

    onDisable() {
        console.log("[BlockCorrector] Plugin disabled!");
    }
};
