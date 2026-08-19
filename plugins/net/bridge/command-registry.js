/**
 * Bedrock Bridge API Command Registry
 * Registers commands with the Bedrock Bridge system
 * Provides unified command routing for both chat and bridge API
 */

export class CommandRegistry {
    constructor(logger) {
        this.logger = logger;
        this.commands = new Map();
        this.bridgeAPI = null;
        this.initialized = false;
    }

    /**
     * Initialize bridge API connection
     */
    async initializeBridge() {
        try {
            // Try to access global bridge API if available
            if (typeof global !== 'undefined' && global.bridge) {
                this.bridgeAPI = global.bridge;
                this.logger.info('Bridge API connected');
                return true;
            }

            // Try alternative access patterns
            if (typeof bridge !== 'undefined') {
                this.bridgeAPI = bridge;
                this.logger.info('Bridge API connected (global access)');
                return true;
            }

            // Bridge not available (normal for Bedrock)
            this.logger.warn('Bridge API not available - using chat-based commands only');
            return false;
        } catch (error) {
            this.logger.warn('Bridge API initialization failed', error.message);
            return false;
        }
    }

    /**
     * Register a command with both chat and bridge systems
     */
    registerCommand(name, handler, metadata = {}) {
        try {
            if (!name || !handler) {
                this.logger.error('Invalid command registration', { name, hasHandler: !!handler });
                return false;
            }

            // Store command internally
            this.commands.set(name.toLowerCase(), {
                name,
                handler,
                metadata: {
                    description: metadata.description || 'No description',
                    usage: metadata.usage || `!${name}`,
                    aliases: metadata.aliases || [],
                    requiresAdmin: metadata.requiresAdmin || false,
                    ...metadata
                },
                registered: {
                    chat: true,
                    bridge: false
                }
            });

            // Register with bridge API if available
            if (this.bridgeAPI && this.bridgeAPI.commands) {
                try {
                    this.bridgeAPI.commands.register({
                        name,
                        description: metadata.description || 'No description',
                        usage: metadata.usage || `!${name}`,
                        handler: (args, context) => {
                            return this.handleBridgeCommand(name, args, context);
                        }
                    });

                    this.commands.get(name.toLowerCase()).registered.bridge = true;
                    this.logger.debug(`Command registered with Bridge API: ${name}`);
                } catch (error) {
                    this.logger.debug(`Bridge registration skipped for ${name}: ${error.message}`);
                }
            }

            return true;
        } catch (error) {
            this.logger.error(`Failed to register command ${name}`, error);
            return false;
        }
    }

    /**
     * Register multiple commands at once
     */
    registerCommands(commandList) {
        try {
            let successCount = 0;
            for (const cmd of commandList) {
                if (this.registerCommand(cmd.name, cmd.handler, cmd.metadata)) {
                    successCount++;
                }
            }
            this.logger.info(`Registered ${successCount}/${commandList.length} commands`);
            return successCount === commandList.length;
        } catch (error) {
            this.logger.error('Failed to register command batch', error);
            return false;
        }
    }

    /**
     * Get command by name
     */
    getCommand(name) {
        return this.commands.get(name.toLowerCase());
    }

    /**
     * Check if command exists
     */
    hasCommand(name) {
        return this.commands.has(name.toLowerCase());
    }

    /**
     * Get all registered commands
     */
    getAllCommands() {
        return Array.from(this.commands.values());
    }

    /**
     * Execute command from chat
     */
    async executeCommand(name, args, context) {
        try {
            const cmd = this.getCommand(name);
            if (!cmd) {
                return {
                    success: false,
                    error: `Unknown command: ${name}`
                };
            }

            // Check permissions
            if (cmd.metadata.requiresAdmin && context.player) {
                const tags = context.player.getTags ? context.player.getTags() : [];
                if (!tags.includes('admin')) {
                    return {
                        success: false,
                        error: 'This command requires admin permission'
                    };
                }
            }

            // Execute handler
            const result = await cmd.handler(args, context);
            return {
                success: true,
                result
            };
        } catch (error) {
            this.logger.error(`Command execution error: ${name}`, error);
            return {
                success: false,
                error: error.message || 'Command execution failed'
            };
        }
    }

    /**
     * Execute command from bridge API
     */
    async handleBridgeCommand(name, args, context) {
        try {
            const result = await this.executeCommand(name, args, context);
            return {
                success: result.success,
                message: result.error || 'Command executed',
                data: result.result
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Command failed'
            };
        }
    }

    /**
     * Get command help
     */
    getCommandHelp(name) {
        const cmd = this.getCommand(name);
        if (!cmd) return null;

        return {
            name: cmd.name,
            description: cmd.metadata.description,
            usage: cmd.metadata.usage,
            aliases: cmd.metadata.aliases,
            requiresAdmin: cmd.metadata.requiresAdmin
        };
    }

    /**
     * Get all commands help
     */
    getAllCommandsHelp() {
        return this.getAllCommands().map(cmd => ({
            name: cmd.name,
            description: cmd.metadata.description,
            usage: cmd.metadata.usage,
            aliases: cmd.metadata.aliases
        }));
    }

    /**
     * Unregister command
     */
    unregisterCommand(name) {
        try {
            const cmd = this.getCommand(name);
            if (!cmd) return false;

            // Unregister from bridge if registered
            if (this.bridgeAPI && this.bridgeAPI.commands && cmd.registered.bridge) {
                try {
                    this.bridgeAPI.commands.unregister(name);
                } catch (error) {
                    this.logger.debug(`Failed to unregister from bridge: ${error.message}`);
                }
            }

            // Remove from internal registry
            this.commands.delete(name.toLowerCase());
            this.logger.info(`Command unregistered: ${name}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to unregister command ${name}`, error);
            return false;
        }
    }

    /**
     * Get registration status
     */
    getStatus() {
        return {
            totalCommands: this.commands.size,
            bridgeConnected: !!this.bridgeAPI,
            commands: this.getAllCommands().map(cmd => ({
                name: cmd.name,
                chatEnabled: cmd.registered.chat,
                bridgeEnabled: cmd.registered.bridge
            }))
        };
    }

    /**
     * Parse command arguments with support for flags
     */
    parseArgs(args) {
        const result = {
            positional: [],
            flags: {},
            options: {}
        };

        let i = 0;
        while (i < args.length) {
            const arg = args[i];

            // Flag (--flag-name value)
            if (arg.startsWith('--')) {
                const flagName = arg.substring(2);
                const nextArg = args[i + 1];
                if (nextArg && !nextArg.startsWith('--') && !nextArg.startsWith('-')) {
                    result.flags[flagName] = nextArg;
                    i += 2;
                } else {
                    result.flags[flagName] = true;
                    i++;
                }
            }
            // Short option (-f value)
            else if (arg.startsWith('-') && arg.length === 2) {
                const optName = arg.substring(1);
                const nextArg = args[i + 1];
                if (nextArg && !nextArg.startsWith('-')) {
                    result.options[optName] = nextArg;
                    i += 2;
                } else {
                    result.options[optName] = true;
                    i++;
                }
            }
            // Positional argument
            else {
                result.positional.push(arg);
                i++;
            }
        }

        return result;
    }

    /**
     * Validate command execution context
     */
    validateContext(context) {
        if (!context) {
            return { valid: false, error: 'Context required' };
        }

        if (!context.player) {
            return { valid: false, error: 'Player context required' };
        }

        if (!context.player.sendMessage) {
            return { valid: false, error: 'Player sendMessage not available' };
        }

        return { valid: true };
    }

    /**
     * Send formatted message to player through context
     */
    sendMessage(context, message) {
        try {
            if (!context || !context.player) {
                this.logger.warn('Cannot send message - no player context');
                return false;
            }

            context.player.sendMessage(message);
            return true;
        } catch (error) {
            this.logger.error('Failed to send message', error);
            return false;
        }
    }
}

export default CommandRegistry;
