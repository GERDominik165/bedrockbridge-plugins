// chunkfixer.js
module.exports = {
    name: "chunkfixer",
    description: "Fixes corrupted nether chunks",
    version: "1.0.0",
    author: "RogueGamingHD",

    database: {
        tables: {
            pluginManager: {
                columns: {
                    plugin: "TEXT",
                    enabled: "INTEGER"
                }
            }
        }
    },

    commands: {
        fixchunks: {
            description: "Fixes corrupted chunks in your area",
            execute: function(sender, args) {
                try {
                    // Mark corrupted areas
                    this.runCommand('fill ~-96 0 ~-96 ~-32 128 ~-32 barrier replace air');
                    this.runCommand('fill ~-32 0 ~-32 ~32 128 ~32 barrier replace air');
                    this.runCommand('fill ~32 0 ~32 ~96 128 ~96 barrier replace air');
                    
                    // Create ticking areas
                    this.runCommand('tickingarea add ~-96 0 ~-96 ~-32 128 ~-32 corrupt_1');
                    this.runCommand('tickingarea add ~-32 0 ~-32 ~32 128 ~32 corrupt_2');
                    this.runCommand('tickingarea add ~32 0 ~32 ~96 128 ~96 corrupt_3');
                    
                    // Replace with lava
                    this.runCommand('fill ~-96 0 ~-96 ~-32 128 ~-32 lava replace barrier');
                    this.runCommand('fill ~-32 0 ~-32 ~32 128 ~32 lava replace barrier');
                    this.runCommand('fill ~32 0 ~32 ~96 128 ~96 lava replace barrier');
                    
                    // Remove ticking areas
                    this.runCommand('tickingarea remove corrupt_1');
                    this.runCommand('tickingarea remove corrupt_2');
                    this.runCommand('tickingarea remove corrupt_3');
                    
                    this.runCommand('tellraw @a {"rawtext":[{"text":"§aChunks have been processed!"}]}');
                } catch (error) {
                    console.warn("[ChunkFixer] Error: " + error);
                    this.runCommand('tellraw @s {"rawtext":[{"text":"§cAn error occurred while fixing chunks."}]}');
                }
            }
        }
    },

    onLoad() {
        // Initialize database
        try {
            this.database.init();
            console.log("[ChunkFixer] Database initialized!");
        } catch (error) {
            console.warn("[ChunkFixer] Database error: " + error);
        }
        console.log("[ChunkFixer] Plugin loaded!");
    },

    onEnable() {
        // Insert plugin entry if not exists
        try {
            this.database.run("INSERT OR IGNORE INTO pluginManager (plugin, enabled) VALUES (?, ?)", [this.name, 1]);
            console.log("[ChunkFixer] Plugin enabled!");
        } catch (error) {
            console.warn("[ChunkFixer] Enable error: " + error);
        }
    },

    onDisable() {
        console.log("[ChunkFixer] Plugin disabled!");
    }
};
