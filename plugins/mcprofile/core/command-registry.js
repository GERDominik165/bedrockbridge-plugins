/**
 * Command Registry
 * @version 2.0.0
 *
 * Handles command registration with Bedrock Bridge API
 * Manages command metadata and execution
 */

class CommandRegistry {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.commandGroups = new Map();
    }

    /**
     * Register a command
     */
    registerCommand(name, handler, description = '', options = {}) {
        const command = {
            name,
            handler,
            description,
            aliases: options.aliases || [],
            permission: options.permission || 'admin',
            usage: options.usage || `${name}`,
            category: options.category || 'MCProfile',
            cooldown: options.cooldown || 0,
            enabled: options.enabled !== false,
            ...options
        };

        this.commands.set(name, command);

        // Register aliases
        if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => {
                this.aliases.set(alias, name);
            });
        }

        return command;
    }

    /**
     * Register a command group
     */
    registerGroup(groupName, description = '') {
        this.commandGroups.set(groupName, {
            name: groupName,
            description,
            commands: []
        });
    }

    /**
     * Add command to group
     */
    addCommandToGroup(groupName, commandName) {
        if (this.commandGroups.has(groupName)) {
            const group = this.commandGroups.get(groupName);
            if (!group.commands.includes(commandName)) {
                group.commands.push(commandName);
            }
        }
    }

    /**
     * Get command
     */
    getCommand(name) {
        // Check if it's an alias
        if (this.aliases.has(name)) {
            return this.commands.get(this.aliases.get(name));
        }

        return this.commands.get(name);
    }

    /**
     * Execute command
     */
    async executeCommand(name, player, ...args) {
        const command = this.getCommand(name);

        if (!command) {
            throw new Error(`Command not found: ${name}`);
        }

        if (!command.enabled) {
            throw new Error(`Command is disabled: ${name}`);
        }

        try {
            return await command.handler(player, ...args);
        } catch (error) {
            throw new Error(`Error executing command ${name}: ${error.message}`);
        }
    }

    /**
     * Get all commands
     */
    getAllCommands() {
        return Array.from(this.commands.values());
    }

    /**
     * Get commands by permission
     */
    getCommandsByPermission(permission) {
        return Array.from(this.commands.values())
            .filter(cmd => cmd.permission === permission);
    }

    /**
     * Get command help
     */
    getCommandHelp(name) {
        const command = this.getCommand(name);
        if (!command) return null;

        return {
            name: command.name,
            description: command.description,
            usage: command.usage,
            aliases: command.aliases,
            permission: command.permission
        };
    }

    /**
     * Get help for all commands
     */
    getAllHelp() {
        const help = [];
        for (const command of this.commands.values()) {
            help.push(this.getCommandHelp(command.name));
        }
        return help;
    }

    /**
     * Format command help as chat message
     */
    formatCommandHelp(name) {
        const help = this.getCommandHelp(name);
        if (!help) return `Command not found: ${name}`;

        return [
            `§6Command: §f${help.name}`,
            `§6Description: §f${help.description}`,
            `§6Usage: §f/${help.usage}`,
            help.aliases.length > 0 ? `§6Aliases: §f${help.aliases.join(', ')}` : '',
            `§6Permission: §f${help.permission}`
        ].filter(line => line.length > 0).join('\n');
    }

    /**
     * Check if command exists
     */
    exists(name) {
        return this.commands.has(name) || this.aliases.has(name);
    }

    /**
     * Get command count
     */
    getCount() {
        return this.commands.size;
    }

    /**
     * Get all aliases
     */
    getAliases(commandName) {
        const command = this.commands.get(commandName);
        return command ? command.aliases : [];
    }

    /**
     * Resolve command (handle aliases)
     */
    resolve(name) {
        if (this.aliases.has(name)) {
            return this.aliases.get(name);
        }
        return name;
    }

    /**
     * Disable command
     */
    disableCommand(name) {
        const command = this.getCommand(name);
        if (command) {
            command.enabled = false;
        }
    }

    /**
     * Enable command
     */
    enableCommand(name) {
        const command = this.getCommand(name);
        if (command) {
            command.enabled = true;
        }
    }

    /**
     * Clear all commands
     */
    clear() {
        this.commands.clear();
        this.aliases.clear();
        this.commandGroups.clear();
    }

    /**
     * Get command stats
     */
    getStats() {
        const commands = this.getAllCommands();
        const enabledCount = commands.filter(c => c.enabled).length;
        const disabledCount = commands.filter(c => !c.enabled).length;

        return {
            total: commands.length,
            enabled: enabledCount,
            disabled: disabledCount,
            aliases: this.aliases.size,
            groups: this.commandGroups.size
        };
    }
}

export default CommandRegistry;
