/**
 * ChatRank++ entry for BedrockBridge.
 *
 * Waits until BedrockBridge's command system is ready, then instantiates the
 * ported ChatRank++ plugin with our compatibility bridge and registers its
 * commands. The heavy lifting (ranks, mutes, clans, chat formatting) lives in
 * the original ./main.js + ./core + ./commands files (converted to ES modules).
 */
import { system } from "@minecraft/server";
import { bridge as bb } from "../../addons";
import plugin from "./main.js";           // main.js default-exports a ready instance
import { makeChatRankBridge, flushCommands } from "./bbBridge.js";

function start(tries) {
  tries = tries || 0;
  if (bb && bb.bedrockCommands) {
    const { api, pendingCmds } = makeChatRankBridge();
    Promise.resolve()
      .then(() => plugin.initialize(api))
      .then(() => {
        const groups = flushCommands(pendingCmds, bb);
        console.warn("[ChatRank++] ready - " + pendingCmds.length + " subcommands in groups: " + groups.join(", "));
      })
      .catch(e => console.warn("[ChatRank++] init failed: " + e + " @@ " + ((e && e.stack) || "")));
  } else if (tries < 200) {
    system.runTimeout(() => start(tries + 1), 5);
  } else {
    console.warn("[ChatRank++] bridge.bedrockCommands never became ready");
  }
}
start();
