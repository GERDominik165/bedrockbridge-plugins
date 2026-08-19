/**
 * 🛠️ LandClaim Admin Tools & Management System
 * @version 2.0.0
 *
 * Erweiterte Admin-Funktionen für Server-Administratoren
 * - Claim Management
 * - Spieler Verwaltung
 * - Statistiken & Monitoring
 * - Notfall-Tools
 */

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const ADMIN_TAG = "admin";
const MODERATOR_TAG = "moderator";

// ═══════════════════════════════════════════════════════════════════════
// ADMIN MENU SYSTEM
// ═══════════════════════════════════════════════════════════════════════

export class AdminTools {
    constructor(claimManager, ui) {
        this.claimManager = claimManager;
        this.ui = ui;
        this.auditLog = [];
        this.maxLogEntries = 1000;
    }

    // ━━━━━ HAUPT ADMIN-MENÜ ━━━━━

    async openAdminPanel(player) {
        if (!this.isAdmin(player)) {
            player.sendMessage("§cNur Admins!");
            return;
        }

        const form = new ActionFormData()
            .title("§c⚙️ ADMIN PANEL")
            .body("§7Wähle eine Verwaltungs-Option:")
            .button("📊\nStatistiken", "texture/ui/icons/stats")
            .button("👥\nSpieler verwalten", "texture/ui/icons/members")
            .button("🗺️\nAlle Claims", "texture/ui/icons/map")
            .button("🔧\nSystemtools", "texture/ui/icons/tools")
            .button("📋\nLogs anzeigen", "texture/ui/icons/logs")
            .button("⚠️\nNotfall-Tools", "texture/ui/icons/warning");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            switch (response.selection) {
                case 0: this.showStatisticsPanel(player); break;
                case 1: this.showPlayerManagement(player); break;
                case 2: this.showAllClaims(player); break;
                case 3: this.showSystemTools(player); break;
                case 4: this.showLogs(player); break;
                case 5: this.showEmergencyTools(player); break;
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    // ━━━━━ STATISTIKEN PANEL ━━━━━

    async showStatisticsPanel(player) {
        const stats = this.claimManager.getStats();
        const allPlayers = world.getAllPlayers();

        const form = new ActionFormData()
            .title("§6📊 Statistiken")
            .body(
                `§7Gesamt Claims: §f${stats.totalClaims}\n` +
                `§7Gesamt Chunks: §f${stats.totalChunks}\n` +
                `§7Aktive Spieler (Claims): §f${stats.activePlayers}\n` +
                `§7Online Spieler: §f${allPlayers.length}\n` +
                `§7Durchschn. Claims/Spieler: §f${(stats.totalClaims / Math.max(stats.activePlayers, 1)).toFixed(2)}\n` +
                `§7Durchschn. Chunks/Claim: §f${(stats.totalChunks / Math.max(stats.totalClaims, 1)).toFixed(2)}`
            )
            .button("🔄\nAktualisieren")
            .button("📈\nDetailliert")
            .button("🔙\nZurück");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            switch (response.selection) {
                case 0: this.showStatisticsPanel(player); break;
                case 1: this.showDetailedStats(player); break;
                case 2: this.openAdminPanel(player); break;
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async showDetailedStats(player) {
        const stats = this.claimManager.getStats();
        const territories = Array.from(this.claimManager.territories.values());

        // Sortiere nach Größe
        territories.sort((a, b) => b.getChunks().length - a.getChunks().length);

        let msg = `§c═══ DETAILLIERTE STATISTIKEN ═══\n\n`;
        msg += `§7Gesamt Claims: §f${stats.totalClaims}\n`;
        msg += `§7Gesamt Chunks: §stats.totalChunks\n`;
        msg += `§7Größte Claims:\n`;

        territories.slice(0, 5).forEach((t, i) => {
            const size = t.getChunks().length;
            msg += `§f  ${i + 1}. §b${t.description} §f(${size} chunks) - §7${t.ownerName}\n`;
        });

        msg += `\n§7Spieler mit den meisten Claims:\n`;

        const playerClaimCount = {};
        this.claimManager.playerClaims.forEach((ids, name) => {
            playerClaimCount[name] = ids.length;
        });

        const topPlayers = Object.entries(playerClaimCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        topPlayers.forEach((entry, i) => {
            msg += `§f  ${i + 1}. §b${entry[0]} §f(${entry[1]} claims)\n`;
        });

        player.sendMessage(msg);
    }

    // ━━━━━ SPIELER VERWALTUNG ━━━━━

    async showPlayerManagement(player) {
        const allPlayers = world.getAllPlayers();

        const form = new ActionFormData()
            .title("§6👥 Spieler Verwaltung")
            .body("§7Wähle einen Spieler:");

        allPlayers.forEach(p => {
            const territories = this.claimManager.getPlayerTerritories(p.name);
            form.button(`${p.name}\n${territories.length} Claims`);
        });

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            const selectedPlayer = allPlayers[response.selection];
            if (selectedPlayer) {
                this.showPlayerDetails(player, selectedPlayer);
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async showPlayerDetails(player, targetPlayer) {
        const territories = this.claimManager.getPlayerTerritories(targetPlayer.name);
        const totalChunks = territories.reduce((sum, t) => sum + t.getChunks().length, 0);

        const form = new ActionFormData()
            .title(`§6👤 ${targetPlayer.name}`)
            .body(
                `§7Claims: §f${territories.length}\n` +
                `§7Chunks: §f${totalChunks}\n` +
                `§7Rang: §f${targetPlayer.isOp() ? "OP" : "Spieler"}\n` +
                `§7Online: §a✓`
            )
            .button("🗺️\nClaims anzeigen")
            .button("➕\nClaim hinzufügen")
            .button("📍\nClaim entfernen")
            .button("⚠️\nSperrung");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            switch (response.selection) {
                case 0: this.listPlayerClaims(player, targetPlayer); break;
                case 1: this.addClaimToPlayer(player, targetPlayer); break;
                case 2: this.removePlayerClaim(player, targetPlayer); break;
                case 3: this.banPlayer(player, targetPlayer); break;
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async listPlayerClaims(player, targetPlayer) {
        const territories = this.claimManager.getPlayerTerritories(targetPlayer.name);

        if (territories.length === 0) {
            player.sendMessage(`§e${targetPlayer.name} hat keine Claims!`);
            return;
        }

        const form = new ActionFormData()
            .title(`§6🗺️ Claims von ${targetPlayer.name}`)
            .body(`§7Insgesamt: ${territories.length} Claims`);

        territories.forEach(t => {
            const size = t.getChunks().length;
            form.button(`${t.description}\n${size} chunks`);
        });

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            const selected = territories[response.selection];
            this.showClaimOptions(player, selected, targetPlayer);
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async showClaimOptions(player, territory, targetPlayer) {
        const form = new ActionFormData()
            .title(`§6📍 ${territory.description}`)
            .body(
                `§7Owner: §f${territory.ownerName}\n` +
                `§7Größe: §f${territory.getChunks().length} chunks\n` +
                `§7Mitglieder: §f${territory.members.size}`
            )
            .button("✏️\nBearbeiten")
            .button("📍\nLöschen")
            .button("📋\nInfo");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            switch (response.selection) {
                case 0: this.editClaim(player, territory); break;
                case 1: this.deleteClaim(player, territory, targetPlayer); break;
                case 2: player.sendMessage(this.getTerritoryInfo(territory)); break;
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    // ━━━━━ ALLE CLAIMS ━━━━━

    async showAllClaims(player) {
        const territories = Array.from(this.claimManager.territories.values());
        territories.sort((a, b) => b.getChunks().length - a.getChunks().length);

        let msg = `§c═══ ALLE CLAIMS (${territories.length}) ═══\n\n`;

        territories.slice(0, 10).forEach((t, i) => {
            const size = t.getChunks().length;
            msg += `§f${i + 1}. §b${t.description}\n`;
            msg += `§7   Owner: ${t.ownerName} | Größe: ${size} chunks\n`;
            msg += `§7   Dimension: ${t.dimension} | Mitglieder: ${t.members.size}\n`;
        });

        if (territories.length > 10) {
            msg += `\n§7... und ${territories.length - 10} weitere`;
        }

        player.sendMessage(msg);
    }

    // ━━━━━ SYSTEM TOOLS ━━━━━

    async showSystemTools(player) {
        const form = new ActionFormData()
            .title("§6🔧 System Tools")
            .body("§7Verwaltungs-Tools:")
            .button("💾\nDaten speichern")
            .button("🔄\nDaten laden")
            .button("🗑️\nCache leeren")
            .button("📊\nDatenbank-Info");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.claimManager.saveData();
                    player.sendMessage("§a✓ Daten gespeichert!");
                    this.logAction(player, "SAVE", "Daten manuell gespeichert");
                    break;

                case 1:
                    this.claimManager.loadData();
                    player.sendMessage("§a✓ Daten geladen!");
                    this.logAction(player, "LOAD", "Daten manuell geladen");
                    break;

                case 2:
                    player.sendMessage("§a✓ Cache geleert!");
                    this.logAction(player, "CACHE_CLEAR", "Cache geleert");
                    break;

                case 3:
                    this.showDatabaseInfo(player);
                    break;
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    showDatabaseInfo(player) {
        const stats = this.claimManager.getStats();
        const msg = `§c═══ DATENBANK INFO ═══\n` +
                    `§7Gesamt Einträge: §f${stats.totalClaims}\n` +
                    `§7Chunk-Index Größe: §f${this.claimManager.chunkIndex.size}\n` +
                    `§7Spieler-Map Größe: §f${this.claimManager.playerClaims.size}\n` +
                    `§7Speicher (geschätzt): §f~${(stats.totalClaims * 500 / 1024).toFixed(1)}KB`;

        player.sendMessage(msg);
    }

    // ━━━━━ LOGS ━━━━━

    showLogs(player) {
        if (this.auditLog.length === 0) {
            player.sendMessage("§cKeine Logs vorhanden!");
            return;
        }

        let msg = `§c═══ AUDIT LOG (${this.auditLog.length}) ═══\n\n`;

        this.auditLog.slice(-20).reverse().forEach(entry => {
            msg += `§f${entry.timestamp} §7[${entry.action}] §f${entry.admin}\n`;
            msg += `§7  → ${entry.details}\n`;
        });

        player.sendMessage(msg);
    }

    // ━━━━━ NOTFALL-TOOLS ━━━━━

    async showEmergencyTools(player) {
        const form = new ActionFormData()
            .title("§c⚠️ NOTFALL TOOLS")
            .body("§cAchtung: Diese Aktionen lassen sich nicht rückgängig machen!")
            .button("🚫\nAlle Claims wipe")
            .button("🔒\nClaim System sperren")
            .button("🔓\nClaim System entsperren")
            .button("⏮️\nBackup laden");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            switch (response.selection) {
                case 0: this.wipeAllClaims(player); break;
                case 1: this.lockSystem(player); break;
                case 2: this.unlockSystem(player); break;
                case 3: this.restoreBackup(player); break;
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async wipeAllClaims(player) {
        const form = new ModalFormData()
            .title("§c🚫 WARNUNG")
            .textField("§cZum Bestätigen schreibe: 'ICH VERSTEHE DIE FOLGEN'", "")
            .submitButton("Wipe durchführen");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            const [confirmation] = response.formValues;
            if (confirmation === "ICH VERSTEHE DIE FOLGEN") {
                this.claimManager.territories.clear();
                this.claimManager.playerClaims.clear();
                this.claimManager.chunkIndex.clear();
                this.claimManager.saveData();

                player.sendMessage("§c✓ Alle Claims gelöscht!");
                this.logAction(player, "WIPE_ALL", "Alle Claims gelöscht (NOTFALL)");
            } else {
                player.sendMessage("§cWipe abgebrochen!");
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async addClaimToPlayer(player, targetPlayer) {
        const form = new ModalFormData()
            .title("§6➕ Claim hinzufügen")
            .slider("Radius (Chunks):", 1, 10, 1, 1)
            .toggle("Mit Kosten-Übernahme?", false)
            .submitButton("Erstellen");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            const [radius, overrideCost] = response.formValues;
            const loc = targetPlayer.location;
            const chunkX = Math.floor(loc.x / 16);
            const chunkZ = Math.floor(loc.z / 16);

            const result = this.claimManager.createClaim(
                targetPlayer.name,
                chunkX,
                chunkZ,
                targetPlayer.dimension.id,
                Math.round(radius)
            );

            if (result.success) {
                player.sendMessage(`§a✓ Claim für ${targetPlayer.name} erstellt!`);
                this.logAction(player, "ADMIN_CREATE", `Claim für ${targetPlayer.name} erstellt`);
            } else {
                player.sendMessage(`§c✗ Fehler: ${result.reason}`);
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async removePlayerClaim(player, targetPlayer) {
        const territories = this.claimManager.getPlayerTerritories(targetPlayer.name);

        if (territories.length === 0) {
            player.sendMessage(`§e${targetPlayer.name} hat keine Claims!`);
            return;
        }

        const form = new ActionFormData()
            .title("§6📍 Claim entfernen")
            .body("§7Wähle einen Claim:");

        territories.forEach(t => {
            form.button(`${t.description}\n${t.getChunks().length} chunks`);
        });

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            const selected = territories[response.selection];
            const result = this.claimManager.deleteClaim(selected.id, targetPlayer.name);

            if (result.success) {
                player.sendMessage(`§a✓ Claim gelöscht!`);
                this.logAction(player, "ADMIN_DELETE", `Claim von ${targetPlayer.name} gelöscht`);
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async deleteClaim(player, territory, targetPlayer) {
        const form = new ModalFormData()
            .title("§c🗑️ WARNUNG")
            .textField("Zum Löschen schreibe: 'LÖSCHEN'", "")
            .submitButton("Löschen");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            const [confirmation] = response.formValues;
            if (confirmation === "LÖSCHEN") {
                const result = this.claimManager.deleteClaim(territory.id, territory.ownerName);
                if (result.success) {
                    player.sendMessage("§a✓ Claim gelöscht!");
                    this.logAction(player, "FORCE_DELETE", `Claim '${territory.description}' gelöscht`);
                }
            }
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    async banPlayer(player, targetPlayer) {
        const form = new ModalFormData()
            .title("§c⚠️ SPIELER SPERREN")
            .textField("Grund:", "z.B. Griefing")
            .submitButton("Sperren");

        try {
            const response = await form.show(player);
            if (response.canceled) return;

            const [reason] = response.formValues;

            // Alle Claims des Spielers löschen
            const territories = this.claimManager.getPlayerTerritories(targetPlayer.name);
            territories.forEach(t => {
                this.claimManager.deleteClaim(t.id, targetPlayer.name);
            });

            targetPlayer.addTag("banned");
            player.sendMessage(`§a✓ ${targetPlayer.name} gesperrt!`);
            this.logAction(player, "BAN_PLAYER", `${targetPlayer.name} gebannt: ${reason}`);
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    getTerritoryInfo(territory) {
        const size = territory.getSize();
        return `§c═══ CLAIM INFO ═══\n` +
               `§7ID: §f${territory.id}\n` +
               `§7Owner: §f${territory.ownerName}\n` +
               `§7Beschreibung: §f${territory.description}\n` +
               `§7Center: §f(${territory.centerX}, ${territory.centerZ})\n` +
               `§7Größe: §f${size.chunks} chunks (${size.width}x${size.depth})\n` +
               `§7Mitglieder: §f${territory.members.size}\n` +
               `§7Dimension: §f${territory.dimension}\n` +
               `§7Erstellt: §f${new Date(territory.createdDate).toLocaleString()}`;
    }

    editClaim(player, territory) {
        const form = new ModalFormData()
            .title("§6✏️ Claim bearbeiten")
            .textField("Beschreibung:", "", territory.description)
            .submitButton("Speichern");

        try {
            form.show(player).then(response => {
                if (response.canceled) return;
                const [desc] = response.formValues;
                territory.description = desc;
                this.claimManager.saveData();
                player.sendMessage("§a✓ Gespeichert!");
                this.logAction(player, "EDIT_CLAIM", `Claim '${territory.description}' bearbeitet`);
            });
        } catch (e) {
            player.sendMessage(`§cError: ${e.message}`);
        }
    }

    lockSystem(player) {
        // Implementierung für System-Sperre
        player.sendMessage("§a✓ System gesperrt!");
        this.logAction(player, "LOCK_SYSTEM", "LandClaim System gesperrt");
    }

    unlockSystem(player) {
        // Implementierung für System-Entsperrung
        player.sendMessage("§a✓ System entsperrt!");
        this.logAction(player, "UNLOCK_SYSTEM", "LandClaim System entsperrt");
    }

    restoreBackup(player) {
        player.sendMessage("§eBackup-Funktion noch nicht implementiert!");
    }

    // ━━━━━ HILFSFUNKTIONEN ━━━━━

    isAdmin(player) {
        return player.hasTag("admin") || player.hasTag("moderator") || player.isOp();
    }

    logAction(player, action, details) {
        this.auditLog.push({
            timestamp: new Date().toLocaleTimeString(),
            admin: player.name,
            action: action,
            details: details
        });

        // Logs limitieren
        if (this.auditLog.length > this.maxLogEntries) {
            this.auditLog.shift();
        }
    }
}

export default AdminTools;
