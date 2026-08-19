/**
 * TrophyNetwork - Item Management Plugin
 * Commands: !give, !item, !kit, !xp, !level, !repair, !enchant
 * @author TrophyNetwork
 */
import { bridge } from '../addons';
import { system, world, ItemStack, EnchantmentTypes } from '@minecraft/server';

// Wait for bridge.bedrockCommands to be available
function _registerWhenReady(registerFn) {
    if (bridge && bridge.bedrockCommands) {
        try { registerFn(); } catch(e) { console.warn('[TN] Command registration error: ' + e); }
    } else {
        system.runTimeout(() => _registerWhenReady(registerFn), 5);
    }
}


const PREFIX = "§6[§eTN§6]§r ";

// Predefined kits
const KITS = {
    starter: {
        items: [
            { id: "minecraft:iron_sword", count: 1, enchants: { sharpness: 2 } },
            { id: "minecraft:iron_pickaxe", count: 1, enchants: { efficiency: 2 } },
            { id: "minecraft:iron_axe", count: 1 },
            { id: "minecraft:iron_shovel", count: 1 },
            { id: "minecraft:bread", count: 16 },
            { id: "minecraft:torch", count: 32 },
        ],
        cooldown: 86400000, // 24h in ms
        description: "Starter-Kit (1x pro Tag)"
    },
    pvp: {
        items: [
            { id: "minecraft:diamond_sword", count: 1, enchants: { sharpness: 3, unbreaking: 2 } },
            { id: "minecraft:golden_apple", count: 3 },
            { id: "minecraft:cooked_beef", count: 16 },
        ],
        cooldown: 3600000, // 1h
        description: "PvP-Kit (1x pro Stunde)"
    }
};

// Kit cooldown storage
const KIT_COOLDOWNS_KEY = "tn_kit_cooldowns";
function getCooldowns() {
    try { return JSON.parse(world.getDynamicProperty(KIT_COOLDOWNS_KEY) || "{}"); } catch { return {}; }
}
function saveCooldowns(data) {
    world.setDynamicProperty(KIT_COOLDOWNS_KEY, JSON.stringify(data));
}

// !give <player> <item> [count]
_registerWhenReady(function() {
bridge.bedrockCommands.registerAdminCommand("give", (admin, targetArg, itemArg, countArg) => {
    const target = targetArg?.readPlayer();
    if (!target) return admin.sendMessage(`${PREFIX}§cSpieler nicht gefunden: §f${targetArg}`);
    const itemId = itemArg?.toString() || "";
    if (!itemId) return admin.sendMessage(`${PREFIX}§cNutze: !give <spieler> <item> [anzahl]`);
    const count = Math.max(1, Math.min(64, countArg?.readInteger() || 1));
    try {
        const fullId = itemId.includes(":") ? itemId : `minecraft:${itemId}`;
        const stack = new ItemStack(fullId, count);
        const inv = target.getComponent("minecraft:inventory")?.container;
        if (inv) {
            inv.addItem(stack);
            admin.sendMessage(`${PREFIX}§a${count}x §f${itemId} §a→ §f${target.name}`);
            target.sendMessage(`${PREFIX}§7Du hast §a${count}x §f${itemId} §7erhalten.`);
        }
    } catch (e) {
        admin.sendMessage(`${PREFIX}§cUngültiges Item: §f${itemId}`);
    }
}, "Gibt einem Spieler ein Item. Nutze: !give <spieler> <item> [anzahl]");

// !kit <name>
bridge.bedrockCommands.registerCommand("kit", (player, kitArg) => {
    const kitName = kitArg?.toString().toLowerCase();
    if (!kitName) {
        const list = Object.entries(KITS).map(([k, v]) => `§e!kit ${k} §7- ${v.description}`).join("\n");
        player.sendMessage(`§6§l═══ Verfügbare Kits ═══\n${list}`);
        return;
    }
    
    const kit = KITS[kitName];
    if (!kit) return player.sendMessage(`${PREFIX}§cKit nicht gefunden: §f${kitName}`);
    
    // Check cooldown
    const cooldowns = getCooldowns();
    const key = `${player.name}_${kitName}`;
    const lastUsed = cooldowns[key] || 0;
    const now = Date.now();
    const elapsed = now - lastUsed;
    
    if (elapsed < kit.cooldown) {
        const remaining = Math.ceil((kit.cooldown - elapsed) / 1000 / 60);
        const h = Math.floor(remaining / 60);
        const m = remaining % 60;
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        player.sendMessage(`${PREFIX}§cKit-Cooldown: noch §f${timeStr} §cwarten.`);
        return;
    }
    
    // Give items
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv) return player.sendMessage(`${PREFIX}§cInventar nicht erreichbar.`);
    
    for (const itemDef of kit.items) {
        try {
            const stack = new ItemStack(itemDef.id, itemDef.count || 1);
            if (itemDef.enchants) {
                const enchComp = stack.getComponent("minecraft:enchantments");
                if (enchComp) {
                    for (const [ench, level] of Object.entries(itemDef.enchants)) {
                        try { enchComp.enchantments.addEnchantment({ type: EnchantmentTypes.get(ench) || ench, level }); } catch(e) {}
                    }
                }
            }
            inv.addItem(stack);
        } catch(e) { console.warn(`[tn_give] Kit item error: ${e}`); }
    }
    
    // Update cooldown
    cooldowns[key] = now;
    saveCooldowns(cooldowns);
    player.sendMessage(`${PREFIX}§aKit §f${kitName} §aerhalten! Nächstes Mal in §f${kit.cooldown/1000/3600}h`);
}, "Gibt dir ein Kit. Nutze: !kit [name]");

// !xp <amount> [player]
bridge.bedrockCommands.registerAdminCommand("xp", (admin, amountArg, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    const amount = amountArg?.readInteger() || 0;
    if (amount === 0) return admin.sendMessage(`${PREFIX}§cNutze: !xp <menge> [spieler]`);
    target.addExperience(amount);
    target.sendMessage(`${PREFIX}§a+${amount} XP`);
    if (target !== admin) admin.sendMessage(`${PREFIX}§a${amount} XP §7→ §f${target.name}`);
}, "Gibt XP. Nutze: !xp <menge> [spieler]");

// !level <amount> [player]
bridge.bedrockCommands.registerAdminCommand("level", (admin, amountArg, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    const amount = amountArg?.readInteger() || 0;
    if (amount === 0) return admin.sendMessage(`${PREFIX}§cNutze: !level <stufen> [spieler]`);
    target.addLevels(amount);
    target.sendMessage(`${PREFIX}§a${amount > 0 ? '+' : ''}${amount} Level → Stufe ${target.level}`);
    if (target !== admin) admin.sendMessage(`${PREFIX}§a${amount} Level §7→ §f${target.name}`);
}, "Gibt Level. Nutze: !level <stufen> [spieler]");

// !repair - repair item in hand
bridge.bedrockCommands.registerAdminCommand("repair", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    const slot = target.selectedSlotIndex;
    const inv = target.getComponent("minecraft:inventory")?.container;
    const item = inv?.getItem(slot);
    if (!item) return admin.sendMessage(`${PREFIX}§cKein Item in der Hand.`);
    const durComp = item.getComponent("minecraft:durability");
    if (!durComp) return admin.sendMessage(`${PREFIX}§cItem hat keine Haltbarkeit.`);
    durComp.damage = 0;
    inv.setItem(slot, item);
    target.sendMessage(`${PREFIX}§aItem in der Hand §7wurde §arepariert.`);
    if (target !== admin) admin.sendMessage(`${PREFIX}§a${target.name}'s Item repariert.`);
}, "Repariert das Item in der Hand. Nutze: !repair [spieler]");
});
