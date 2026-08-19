/**
 * FilterManager UI - Word filter management
 */

class FilterManagerUI {
    constructor(managers) {
        this.managers = managers;
    }

    show(player) {
        const form = {
            type: 'form',
            title: '§6Word Filter Manager',
            content: 'Manage blocked words and filters',
            buttons: [
                { text: '§lAdd Word\n§r§7Block a new word' },
                { text: '§lRemove Word\n§r§7Unblock a word' },
                { text: '§lView List\n§r§7View blocked words' },
                { text: '§lWhitelist Player\n§r§7Exempt player from filter' },
                { text: '§lBack' },
            ]
        };

        return form;
    }
}

module.exports = FilterManagerUI;
