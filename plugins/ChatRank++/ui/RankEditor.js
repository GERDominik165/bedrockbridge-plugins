/**
 * RankEditor - Rank editing UI
 */

class RankEditor {
    constructor(managers) {
        this.managers = managers;
    }

    show(player, rankId = null) {
        const rank = rankId ? this.managers.rank.getRank(rankId) : null;

        const form = {
            type: 'custom_form',
            title: rank ? `§6Edit Rank: ${rank.name}` : '§6Create New Rank',
            content: [
                {
                    type: 'input',
                    text: 'Rank ID:',
                    default: rank?.id || '',
                    placeholder: 'vip, moderator, etc.'
                },
                {
                    type: 'input',
                    text: 'Display Name:',
                    default: rank?.name || '',
                    placeholder: 'VIP, Moderator, etc.'
                },
                {
                    type: 'input',
                    text: 'Prefix:',
                    default: rank?.prefix || '',
                    placeholder: '§a[VIP]§r'
                },
                {
                    type: 'input',
                    text: 'Suffix:',
                    default: rank?.suffix || '',
                    placeholder: '§a⭐§r'
                },
                {
                    type: 'input',
                    text: 'Color Code:',
                    default: rank?.color || '§7',
                    placeholder: '§a'
                },
                {
                    type: 'slider',
                    text: 'Priority:',
                    min: 0,
                    max: 1000,
                    default: rank?.priority || 100
                },
                {
                    type: 'input',
                    text: 'Permissions (comma-separated):',
                    default: rank?.permissions.join(', ') || '',
                    placeholder: 'chatrank.vip, chatrank.colors'
                }
            ]
        };

        return form;
    }

    handleResponse(player, response) {
        if (response === null) return;

        const [id, name, prefix, suffix, color, priority, permsStr] = response;
        const permissions = permsStr.split(',').map(p => p.trim()).filter(p => p);

        this.managers.rank.createRank(id, {
            name,
            prefix,
            suffix,
            color,
            priority,
            permissions
        });

        player.sendMessage(`§aRank ${name} saved successfully!`);
    }
}

export default RankEditor;
