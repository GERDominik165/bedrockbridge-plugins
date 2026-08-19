/**
 * ollamaAI @version 1.0.0 - BedrockBridge Plugin
 *
 * In-game AI assistant powered by a self-hosted Ollama instance.
 * Players type "!ai <question>" in chat -> answer shown in-game + posted to Discord.
 * Free, unlimited, no external API and no cost.
 */
import { world, system } from "@minecraft/server";
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";
import { bridge } from "../addons";
import { bridgeDirect } from "../BridgeDirect";

// ===== CONFIG =====
const OLLAMA_URL = "http://10.8.0.100:11434/api/generate"; // self-hosted Ollama (private VPN)
const MODEL      = "huihui_ai/llama3.2-abliterate:latest";
const PREFIX     = "!ai";
const MAX_TOKENS = 120;
const SYSTEM_PROMPT = "You are the AI of a Minecraft Bedrock server. Answer SHORT (max 2 sentences), friendly, in the player's language. No markdown, no code blocks.";

// Enable Discord direct messages (for sendEmbed)
bridge.events.bridgeInitialize.subscribe(e => e.registerAddition("discord_direct"));

let busy = false; // only one request at a time (CPU friendly)

world.beforeEvents.chatSend.subscribe(ev => {
  const msg = ev.message ?? "";
  if (!msg.toLowerCase().startsWith(PREFIX.toLowerCase() + " ")) return;
  ev.cancel = true; // do not broadcast the raw command
  const player = ev.sender;
  const prompt = msg.slice(PREFIX.length).trim();
  system.run(() => askAI(player, prompt));
});

async function askAI(player, prompt) {
  if (!prompt) { player.sendMessage("§e[AI] §7Usage: §f" + PREFIX + " <your question>"); return; }
  if (busy) { player.sendMessage("§e[AI] §7I'm already thinking - try again in a moment."); return; }
  busy = true;
  world.sendMessage("§b[AI] §7" + player.name + " asks: §f" + prompt);
  try {
    const req = new HttpRequest(OLLAMA_URL);
    req.method = HttpRequestMethod.Post;
    req.headers = [new HttpHeader("Content-Type", "application/json")];
    req.body = JSON.stringify({
      model: MODEL, stream: false, system: SYSTEM_PROMPT, prompt,
      options: { num_predict: MAX_TOKENS, num_thread: 4, temperature: 0.7 }
    });
    const res = await http.request(req);
    if (res.status !== 200) { world.sendMessage("§c[AI] Error (HTTP " + res.status + ")"); return; }
    const data = JSON.parse(res.body);
    const answer = ((data.response || "").trim()) || "(no answer)";
    world.sendMessage("§b[AI] §f" + answer);
    if (bridgeDirect.ready) {
      bridgeDirect.sendEmbed({
        title: "AI question from " + player.name,
        description: "**Q:** " + prompt + "\n**A:** " + answer,
        color: 0x00aaff
      });
    }
  } catch (err) {
    world.sendMessage("§c[AI] Could not reach the AI server.");
    console.warn("[ollamaAI] " + err);
  } finally { busy = false; }
}

console.warn("[ollamaAI] loaded - model: " + MODEL);
