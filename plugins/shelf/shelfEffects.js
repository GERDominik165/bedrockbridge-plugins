/**
 * Shelf Gambling - Visual Effects & Animations @version 2.0.0
 *
 * Ultra-krasse Visuelle Effekte:
 * - Particle-Effekte
 * - Sound-Effekte
 * - Animations
 * - Visuelle Feedback
 * - Konfetti & Feuerwerk
 * - Glow-Effekte
 *
 * by InnateAlpaca
 */

import { world, system } from '@minecraft/server';

/* ========================================================================= */
/*                        PARTICLE EFFECT SYSTEM                            */
/* ========================================================================= */

export class ParticleEffects {
    constructor() {
        this.activeEffects = new Map();
    }

    /**
     * Spin-Animation mit Partikeln
     */
    showSpinAnimation(player) {
        const dimension = player.dimension;
        const location = player.location;

        // Schnelle Partikel-Sequenz für Spin-Animation
        for (let i = 0; i < 10; i++) {
            system.runTimeout(() => {
                dimension.spawnParticle("minecraft:end_rod", location, {
                    x: Math.random() * 0.5 - 0.25,
                    y: 0.5,
                    z: Math.random() * 0.5 - 0.25
                });
            }, i * 2);
        }
    }

    /**
     * Gewinn-Animation (Gold-Partikel)
     */
    showWinAnimation(player, winAmount) {
        const dimension = player.dimension;
        const location = player.location;
        const particleCount = Math.min(50, Math.floor(winAmount / 10));

        // Konfetti-ähnliche Animation
        for (let i = 0; i < particleCount; i++) {
            system.runTimeout(() => {
                const angle = (i / particleCount) * Math.PI * 2;
                const speed = 0.3;

                dimension.spawnParticle("minecraft:falling_dust_concrete_powder", location, {
                    x: Math.cos(angle) * speed,
                    y: 0.2 + Math.random() * 0.2,
                    z: Math.sin(angle) * speed
                });
            }, i * 10);
        }

        // Play win sound (über Commands)
        player.runCommand("playsound note.pling @s");
    }

    /**
     * Verlust-Animation (Rote Partikel)
     */
    showLossAnimation(player) {
        const dimension = player.dimension;
        const location = player.location;

        // Negative Animation
        for (let i = 0; i < 20; i++) {
            system.runTimeout(() => {
                const angle = (i / 20) * Math.PI * 2;
                const inward = Math.random() * 0.3;

                dimension.spawnParticle("minecraft:redstone", location, {
                    x: Math.cos(angle) * inward,
                    y: -0.1,
                    z: Math.sin(angle) * inward
                });
            }, i * 5);
        }

        // Play loss sound
        player.runCommand("playsound block.note_block.didgeridoo @s");
    }

    /**
     * Jackpot-Animation (Riesige Explosion)
     */
    showJackpotAnimation(player) {
        const dimension = player.dimension;
        const location = player.location;

        // Multiple Explosion-Ringe
        for (let ring = 0; ring < 3; ring++) {
            system.runTimeout(() => {
                for (let i = 0; i < 60; i++) {
                    const angle = (i / 60) * Math.PI * 2;
                    const radius = 0.5 + ring * 0.3;

                    dimension.spawnParticle("minecraft:happy_villager", {
                        x: location.x + Math.cos(angle) * radius,
                        y: location.y + ring * 0.5,
                        z: location.z + Math.sin(angle) * radius
                    });
                }
            }, ring * 20);
        }

        // Feuerwerk-Sound
        player.runCommand("playsound firework.blast @s ~ ~ ~ 1");
        player.runCommand("playsound firework.largeBlast @s ~ ~ ~ 1");
    }

    /**
     * Leaderboard-Update-Animation
     */
    showRankUpAnimation(player) {
        const dimension = player.dimension;
        const location = player.location;

        // Aufsteigende Partikel
        for (let i = 0; i < 30; i++) {
            system.runTimeout(() => {
                dimension.spawnParticle("minecraft:heart", {
                    x: location.x + (Math.random() - 0.5) * 0.5,
                    y: location.y + (i * 0.1),
                    z: location.z + (Math.random() - 0.5) * 0.5
                });
            }, i * 5);
        }

        player.runCommand("playsound ui.toast.challenge_complete @s");
    }

    /**
     * Custom Glow-Effekt
     */
    applyGlowEffect(player, duration = 100) {
        player.runCommand(`effect give @s glowing ${Math.floor(duration / 20)} 0 true`);
    }

    /**
     * Blitz-Effekt
     */
    showLightningEffect(dimension, location) {
        // Schnelle Helligkeit-Animation mit Partikeln
        dimension.spawnParticle("minecraft:end_rod", location);
        dimension.spawnParticle("minecraft:electric_spark", location);
    }
}

/* ========================================================================= */
/*                        ANIMATION ENGINE                                  */
/* ========================================================================= */

export class AnimationEngine {
    constructor() {
        this.activeAnimations = new Map();
        this.animationFrames = 0;
    }

    /**
     * Spin-Reel Animation
     */
    async animateSpinReels(player, duration = 60) {
        const reelEmojis = ["🎰", "🎲", "💰", "💎", "⭐", "🏆"];
        const animationId = `spin_${player.name}_${Date.now()}`;

        this.activeAnimations.set(animationId, true);

        for (let frame = 0; frame < duration; frame++) {
            if (!this.activeAnimations.has(animationId)) break;

            const reel1 = reelEmojis[Math.floor(Math.random() * reelEmojis.length)];
            const reel2 = reelEmojis[Math.floor(Math.random() * reelEmojis.length)];
            const reel3 = reelEmojis[Math.floor(Math.random() * reelEmojis.length)];

            player.sendMessage(`§eSpinning... ${reel1} | ${reel2} | ${reel3}`);

            await new Promise(r => system.runTimeout(r, 1));
        }

        this.activeAnimations.delete(animationId);
    }

    /**
     * Zahl-Hochzähl-Animation
     */
    async animateNumberCount(player, fromNumber, toNumber, duration = 30) {
        const increment = (toNumber - fromNumber) / duration;
        let current = fromNumber;

        for (let frame = 0; frame < duration; frame++) {
            current += increment;
            player.sendMessage(`§aBalance: §6${Math.floor(current)}`);

            await new Promise(r => system.runTimeout(r, 1));
        }
    }

    /**
     * Blinkende Text-Animation
     */
    async animateBlinking(player, text, duration = 20) {
        for (let i = 0; i < duration; i++) {
            const blinking = i % 2 === 0 ? text : text.replace(/§./g, '');
            player.sendMessage(blinking);

            await new Promise(r => system.runTimeout(r, 5));
        }
    }

    /**
     * Progress-Bar Animation
     */
    showProgressBar(player, current, max, label = "") {
        const percentage = (current / max) * 100;
        const filledBlocks = Math.floor((current / max) * 20);
        const emptyBlocks = 20 - filledBlocks;

        const bar = `§a${'█'.repeat(filledBlocks)}§7${'░'.repeat(emptyBlocks)} §6${percentage.toFixed(1)}%`;

        const message = label ? `§6${label}: ${bar}` : bar;
        player.sendMessage(message);
    }

    /**
     * Welle-Animation
     */
    showWaveAnimation(player, intensity = 5) {
        const dimension = player.dimension;
        const location = player.location;

        for (let wave = 0; wave < intensity; wave++) {
            system.runTimeout(() => {
                for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
                    const radius = 0.5 + wave * 0.2;
                    dimension.spawnParticle("minecraft:end_rod", {
                        x: location.x + Math.cos(angle) * radius,
                        y: location.y + 0.5,
                        z: location.z + Math.sin(angle) * radius
                    });
                }
            }, wave * 10);
        }
    }
}

/* ========================================================================= */
/*                        SOUND EFFECT SYSTEM                               */
/* ========================================================================= */

export class SoundEffects {
    constructor() {
        this.sounds = {
            spin: "random.click",
            win: "note.pling",
            loss: "block.note_block.didgeridoo",
            jackpot: "firework.blast",
            levelup: "ui.toast.challenge_complete",
            select: "ui.button.click",
            error: "entity.villager.no",
            alert: "entity.villager.ambient"
        };
    }

    /**
     * Spiele Sound-Effekt
     */
    playSound(player, soundType, volume = 1.0, pitch = 1.0) {
        const sound = this.sounds[soundType];
        if (sound) {
            player.runCommand(`playsound ${sound} @s ~ ~ ~ ${volume} ${pitch}`);
        }
    }

    /**
     * Spiele Custom-Sound
     */
    playCustomSound(player, soundId, volume = 1.0, pitch = 1.0) {
        player.runCommand(`playsound ${soundId} @s ~ ~ ~ ${volume} ${pitch}`);
    }

    /**
     * Spiele Sound-Sequence
     */
    async playSoundSequence(player, sounds) {
        for (const sound of sounds) {
            this.playSound(player, sound.type, sound.volume || 1.0, sound.pitch || 1.0);
            await new Promise(r => system.runTimeout(r, sound.delay || 10));
        }
    }

    /**
     * Musik-Integration
     */
    playBackgroundMusic(player, musicId, loop = true) {
        // Notiz: Musik-Support ist limitiert in Minecraft
        // Könnte via Note Blocks oder externe Audio implementiert werden
        console.warn("[SoundEffects] Background music würde hier mit Note Blocks implementiert");
    }
}

/* ========================================================================= */
/*                        EFFECT COORDINATOR                                */
/* ========================================================================= */

export class EffectCoordinator {
    constructor() {
        this.particles = new ParticleEffects();
        this.animations = new AnimationEngine();
        this.sounds = new SoundEffects();
    }

    /**
     * Koordiniere komplette Gewinn-Animation
     */
    async playWinSequence(player, winAmount) {
        // 1. Sound + Partikel starten
        this.sounds.playSound(player, "win", 1.0, 1.0);
        this.particles.showWinAnimation(player, winAmount);

        // 2. Animation für Geldzählen
        await new Promise(r => system.runTimeout(r, 10));

        // 3. Glow-Effekt
        this.particles.applyGlowEffect(player, 100);

        // 4. Nachricht
        player.sendMessage(
            `\n§a§l━━━━━━━━━━━━━━━━━━━━\n` +
            `§a🎉 GEWONNEN! 🎉\n` +
            `§e+${winAmount} coins\n` +
            `§a§l━━━━━━━━━━━━━━━━━━━━\n`
        );
    }

    /**
     * Koordiniere komplette Jackpot-Animation
     */
    async playJackpotSequence(player, jackpotAmount) {
        // Sound-Sequenz
        await this.sounds.playSoundSequence(player, [
            { type: "spin", delay: 10 },
            { type: "spin", delay: 10 },
            { type: "win", delay: 20 },
            { type: "jackpot", delay: 30 }
        ]);

        // Visuelle Effekte
        this.particles.showJackpotAnimation(player);
        this.animations.showWaveAnimation(player, 5);
        this.particles.applyGlowEffect(player, 200);

        // Nachricht
        player.sendMessage(
            `\n§4§l╔════════════════════════╗\n` +
            `§4║ §6🎊 JACKPOT!!! 🎊 §4║\n` +
            `§4║ §a+${jackpotAmount} coins! §4║\n` +
            `§4║ §b🎉 LEGEND STATUS 🎉 §4║\n` +
            `§4║ §e${player.name} §4║\n` +
            `§4╚════════════════════════╝\n`
        );

        // Broadcast zu alle Spieler
        world.getAllPlayers().forEach(p => {
            p.sendMessage(`§6[JACKPOT] §e${player.name} hat den Jackpot geknackt! §a+${jackpotAmount} coins!`);
            this.sounds.playSound(p, "alert", 0.5, 0.8);
        });
    }

    /**
     * Koordiniere Spin-Animation
     */
    async playSpinAnimation(player) {
        this.sounds.playSound(player, "spin", 1.0, 1.2);
        this.particles.showSpinAnimation(player);
        await this.animations.animateSpinReels(player, 60);
    }
}

export { ParticleEffects, AnimationEngine, SoundEffects, EffectCoordinator };
