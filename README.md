# BedrockBridge Plugins

Custom [BedrockBridge](https://github.com/InnateAlpaca/BedrockBridge) plugins (v1.6.11) for Minecraft Bedrock Dedicated Servers.
Includes the full `tn_*` suite, AI plugins, and many custom features (grief alerts, jail, spectator GUI,
cross-server sync, webhook bridge, death coordinates, and more).

## Structure
- `plugins/`  — all bridge plugins (drop-in `.js` files for `scripts/bridgePlugins/`)
- `docs/`     — official bridgeAPI reference (WorldBridge, bridgeEvents, bridgeCommands, BridgeDirect, EsploratoriDatabase)
- `deploy.sh` — deploys a plugin to a dev sandbox and restarts the server

## Plugin pattern
```js
import { world } from "@minecraft/server";
import { bridge } from "../addons";           // bridgeAPI: events, registerAddition
import { bridgeDirect } from "../BridgeDirect"; // Discord: sendEmbed(...)

bridge.events.bridgeInitialize.subscribe(e => e.registerAddition("discord_direct"));
world.afterEvents.playerSpawn.subscribe(e => { /* ... */ });
```

## Enabling a plugin
BedrockBridge only loads plugins that are imported in `scripts/bridgePlugins/index.js`:
```js
import "./yourPlugin"
```
A server restart is required for a new/changed plugin to take effect.

## Featured: ollamaAI
An in-game AI assistant powered by a self-hosted [Ollama](https://ollama.com) instance
(free, unlimited, no external API). Players type `!ai <question>` in chat -> the answer is shown
in-game and posted to Discord via `bridgeDirect.sendEmbed`.

## Secrets
All API keys / webhook URLs / tokens are **redacted** (REDACTED). Real values belong in the
server-side `config/<uuid>/secrets.json` or plugin config, never in the repository.

## API plugins (24fire, ptero/pv-q)
These plugins are **config-driven**: the API key is read at runtime from the packs
