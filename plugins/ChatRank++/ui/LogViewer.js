/**
 * LogViewer - System log viewing UI
 */

class LogViewer {
    constructor(managers) {
        this.managers = managers;
    }

    show(player, filter = {}) {
        const logs = this.managers.log.getLogs(filter).slice(-20).reverse();

        const content = logs.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            return `§8[${time}] §7[${log.level}] §f${log.message}`;
        }).join('\n');

        const form = {
            type: 'form',
            title: '§6System Logs',
            content: content || '§7No logs found',
            buttons: [
                { text: '§lFilter by Level' },
                { text: '§lFilter by Category' },
                { text: '§lClear Logs' },
                { text: '§lExport Logs' },
                { text: '§lBack' },
            ]
        };

        return form;
    }
}

module.exports = LogViewer;
