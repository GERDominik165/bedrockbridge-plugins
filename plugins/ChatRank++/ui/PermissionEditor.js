/**
 * PermissionEditor - Permission management UI
 */

class PermissionEditor {
    constructor(managers) {
        this.managers = managers;
    }

    show(player) {
        const form = {
            type: 'form',
            title: '§6Permission Manager',
            content: 'Manage player permissions',
            buttons: [
                { text: '§lGrant Permission\n§r§7Give permission to player' },
                { text: '§lRevoke Permission\n§r§7Remove permission from player' },
                { text: '§lView Permissions\n§r§7View player permissions' },
                { text: '§lBack' },
            ]
        };

        return form;
    }
}

module.exports = PermissionEditor;
