/**
 * ClanCommands - Clan/team management commands
 */

class ClanCommands {
    constructor(managers) {
        this.managers = managers;
    }

    register(bridge) {
        // /clan create <name> <tag>
        bridge.registerCommand('clan create', (player, args) => {
            const [name, tag] = args;
            if (!name || !tag) {
                return player.sendMessage('§cUsage: /clan create <name> <tag>');
            }

            const clanId = name.toLowerCase();
            if (this.managers.clanTag.getClan(clanId)) {
                return player.sendMessage('§cClan already exists!');
            }

            this.managers.clanTag.createClan(clanId, {
                name,
                tag,
                owner: player.name
            });
            player.sendMessage(`§aCreated clan: ${name} [${tag}]`);
        });

        // /clan invite <player>
        bridge.registerCommand('clan invite', (player, args) => {
            const [targetName] = args;
            const clan = this.managers.clanTag.getPlayerClan(player.name);

            if (!clan) {
                return player.sendMessage('§cYou are not in a clan!');
            }

            if (!this.managers.clanTag.isOwner(player.name, clan.id) &&
                !this.managers.clanTag.isOfficer(player.name, clan.id)) {
                return player.sendMessage('§cYou do not have permission!');
            }

            this.managers.clanTag.invitePlayer(clan.id, targetName, player.name);
            player.sendMessage(`§aInvited ${targetName} to ${clan.name}`);
        });

        // /clan join <clan>
        bridge.registerCommand('clan join', (player, args) => {
            const [clanName] = args;
            const clanId = clanName.toLowerCase();
            const clan = this.managers.clanTag.getClan(clanId);

            if (!clan) {
                return player.sendMessage('§cClan not found!');
            }

            const invites = this.managers.clanTag.getInvites(player.name);
            const hasInvite = invites.some(inv => inv.clanId === clanId);

            if (!hasInvite && !clan.settings.public) {
                return player.sendMessage('§cYou need an invite to join this clan!');
            }

            this.managers.clanTag.addPlayerToClan(player.name, clanId);
            this.managers.clanTag.clearInvite(player.name, clanId);
            player.sendMessage(`§aJoined clan: ${clan.name}`);
        });

        // /clan leave
        bridge.registerCommand('clan leave', (player, args) => {
            const clan = this.managers.clanTag.getPlayerClan(player.name);
            if (!clan) {
                return player.sendMessage('§cYou are not in a clan!');
            }

            if (this.managers.clanTag.isOwner(player.name, clan.id)) {
                return player.sendMessage('§cOwners cannot leave! Transfer ownership or disband the clan.');
            }

            this.managers.clanTag.removePlayerFromClan(player.name);
            player.sendMessage(`§aLeft clan: ${clan.name}`);
        });

        // /clan disband
        bridge.registerCommand('clan disband', (player, args) => {
            const clan = this.managers.clanTag.getPlayerClan(player.name);
            if (!clan) {
                return player.sendMessage('§cYou are not in a clan!');
            }

            if (!this.managers.clanTag.isOwner(player.name, clan.id)) {
                return player.sendMessage('§cOnly the owner can disband the clan!');
            }

            this.managers.clanTag.deleteClan(clan.id);
            player.sendMessage(`§aDisbanded clan: ${clan.name}`);
        });

        // /clan list
        bridge.registerCommand('clan list', (player, args) => {
            const clans = this.managers.clanTag.getAllClans();
            player.sendMessage('§6=== Clans ===');
            clans.forEach(clan => {
                player.sendMessage(`§7${clan.name} [${clan.tag}] - ${clan.members.length} members`);
            });
        });
    }
}

module.exports = ClanCommands;
