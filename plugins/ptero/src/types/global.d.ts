/**
 * Global type declarations for Minecraft Bedrock and Node.js globals
 */

// Declare timer functions that are available in the Minecraft runtime
declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function clearInterval(handle?: number): void;
declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function clearTimeout(handle?: number): void;

type TimerHandler = string | Function;
