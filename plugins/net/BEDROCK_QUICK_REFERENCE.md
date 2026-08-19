# Bedrock JavaScript Quick Reference

**For**: Developers working with Bedrock plugins
**Status**: v1.2.1 compliant
**Last Updated**: 2025-11-22

---

## The Golden Rule

🔴 **Bedrock JavaScript is NOT Node.js**

**What's Missing:**
- ❌ setTimeout / setInterval
- ❌ clearTimeout / clearInterval
- ❌ fetch / XMLHttpRequest
- ❌ File system (fs)
- ❌ Streams
- ❌ Buffers
- ❌ Promises (mostly working, but avoid)
- ❌ Child processes

**What's Available:**
- ✅ Import/export modules
- ✅ Async/await (works)
- ✅ Promises (works)
- ✅ Standard JavaScript (arrays, objects, etc.)
- ✅ Bedrock-specific APIs

---

## Timing & Scheduling

### ❌ WRONG - Node.js Way

```javascript
// These will CRASH in Bedrock
setTimeout(() => {
    console.log('After 1 second');
}, 1000);

setInterval(() => {
    console.log('Every 1 second');
}, 1000);
```

**Error**: `ReferenceError: setTimeout is not defined`

### ✅ RIGHT - Bedrock Way

```javascript
import { system } from '@minecraft/server';

// One-time delay (in ticks, 20 ticks = 1 second)
system.runTimeout(() => {
    console.log('After 1 second');
}, 20);

// Recurring task (in ticks)
const intervalId = system.runInterval(() => {
    console.log('Every 1 second');
}, 20);

// Stop recurring task
system.clearRun(intervalId);
```

### Tick Conversion

**1 tick ≈ 50 milliseconds (20 ticks = 1 second)**

```javascript
// Formula: ticks = Math.ceil(milliseconds / 50)

// Common conversions
10ms    → 1 tick
50ms    → 1 tick
100ms   → 2 ticks
500ms   → 10 ticks
1000ms  → 20 ticks
2000ms  → 40 ticks
5000ms  → 100 ticks
10000ms → 200 ticks

// Usage
const ticks = Math.max(1, Math.ceil(milliseconds / 50));
system.runTimeout(callback, ticks);
```

---

## Events & World Interaction

### ❌ WRONG - Node.js Way

```javascript
// These don't work in Bedrock
const EventEmitter = require('events');
const emitter = new EventEmitter();
emitter.on('event', () => { });
```

### ✅ RIGHT - Bedrock Way

```javascript
import { world, system } from '@minecraft/server';

// Before events (can cancel)
world.beforeEvents.chatSend.subscribe((event) => {
    if (event.message === 'test') {
        event.cancel = true;  // Block the message
    }
});

// After events (informational)
world.afterEvents.playerSpawn.subscribe((event) => {
    console.log(`${event.player.name} spawned`);
});

// Other available events
world.afterEvents.playerLeave       // Player disconnected
world.afterEvents.playerDimensionChange
world.afterEvents.worldInitialize   // World loaded
world.beforeEvents.chatSend         // Chat message sent
world.beforeEvents.playerInteractWithBlock
world.beforeEvents.playerInteractWithEntity
```

---

## HTTP Requests

### ❌ WRONG - Node.js Way

```javascript
// fetch() doesn't exist in Bedrock
fetch('https://api.example.com')
    .then(r => r.json())
    .then(data => console.log(data));

// XMLHttpRequest doesn't exist
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com');
```

### ✅ RIGHT - Bedrock Way

```javascript
import { HttpClient, HttpRequest } from '@minecraft/server-net';

// Create client
const client = new HttpClient();

// Create request
const request = new HttpRequest('https://api.example.com');

// Configure request
request.setMethod('Get');
request.setHeader('User-Agent', 'Bedrock-Plugin');
request.setTimeout(10000);  // 10 seconds

// Send request
try {
    const response = await client.send(request);
    console.log('Status:', response.status);
    console.log('Body:', response.body);
} catch (error) {
    console.error('Request failed:', error);
}
```

### HTTP Methods

```javascript
request.setMethod('Get');      // Read data
request.setMethod('Post');     // Create data
request.setMethod('Put');      // Update data
request.setMethod('Delete');   // Delete data
request.setMethod('Head');     // Check resource
```

### Headers

```javascript
// Set single header
request.setHeader('Content-Type', 'application/json');
request.setHeader('Authorization', 'Bearer token');

// Multiple headers
request.setHeader('X-Custom', 'value');
request.addHeader('Accept', 'application/json');
```

### Request Body

```javascript
// For POST/PUT requests
const body = JSON.stringify({
    username: 'player',
    score: 100
});
request.body = body;
```

---

## UI Forms

### ❌ WRONG - Node.js Way

```javascript
// DOM doesn't exist in Bedrock
document.getElementById('button').addEventListener('click', () => { });
```

### ✅ RIGHT - Bedrock Way

```javascript
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { world } from '@minecraft/server';

// Simple action form (buttons)
const form = new ActionFormData()
    .title('Main Menu')
    .body('Choose an option:')
    .button('Option 1')
    .button('Option 2')
    .button('Option 3');

// Get first player and show form
const players = world.getPlayers();
if (players.length > 0) {
    form.show(players[0]).then(response => {
        if (!response.canceled) {
            console.log('Selected button:', response.selection);
        }
    });
}

// Modal form (text input)
const modal = new ModalFormData()
    .title('Enter Data')
    .textField('Username:', '', 'default_name')
    .toggle('Enable feature?', false)
    .dropdown('Choose:', ['Option1', 'Option2']);

modal.show(players[0]).then(response => {
    if (!response.canceled) {
        console.log('Name:', response.formValues[0]);
        console.log('Toggle:', response.formValues[1]);
        console.log('Dropdown:', response.formValues[2]);
    }
});

// Simple message
const message = new MessageFormData()
    .title('Confirm')
    .body('Are you sure?')
    .button1('Yes')
    .button2('No');

message.show(players[0]).then(response => {
    if (!response.canceled) {
        console.log('Button pressed:', response.selection === 0 ? 'Yes' : 'No');
    }
});
```

---

## Player Communication

### ❌ WRONG - Node.js Way

```javascript
// Can't use console in player context
console.log('Player message');
```

### ✅ RIGHT - Bedrock Way

```javascript
import { world } from '@minecraft/server';

// Send message to player
player.sendMessage('Hello, player!');

// With formatting
player.sendMessage('§6Gold §aGreen §cRed §rReset');

// Get all players
const players = world.getPlayers();

// Get dimension
const dimension = world.getDimension('minecraft:overworld');

// Run command as player
try {
    dimension.runCommand(`say Hello from ${player.name}`);
} catch (error) {
    console.error('Command failed:', error);
}
```

### Message Formatting

```
§0 Black
§1 Dark Blue
§2 Dark Green
§3 Dark Cyan
§4 Dark Red
§5 Purple
§6 Gold
§7 Gray
§8 Dark Gray
§9 Blue
§a Green
§b Cyan
§c Red
§d Magenta
§e Yellow
§f White
§r Reset
```

---

## Async Operations

### ✅ Async/Await Works

```javascript
// Async functions work in Bedrock
async function doSomething() {
    try {
        const response = await client.send(request);
        console.log('Success:', response);
    } catch (error) {
        console.error('Failed:', error);
    }
}

doSomething();
```

### ✅ Promises Work

```javascript
// Promises work in Bedrock
function delay(ms) {
    return new Promise(resolve => {
        const ticks = Math.ceil(ms / 50);
        system.runTimeout(resolve, ticks);
    });
}

delay(1000).then(() => {
    console.log('After 1 second');
});
```

### ⚠️ But Avoid Heavy Async

```javascript
// Don't do too many concurrent async operations
// Bedrock has limited threads

// ❌ BAD
for (let i = 0; i < 100; i++) {
    client.send(request);  // 100 concurrent requests!
}

// ✅ GOOD
for (let i = 0; i < 100; i++) {
    system.runTimeout(() => {
        client.send(request);
    }, i * 20);  // Spread them out
}
```

---

## Data Storage

### ❌ WRONG - File System

```javascript
// File system doesn't exist
const fs = require('fs');
fs.writeFileSync('data.json', JSON.stringify(data));
```

### ✅ RIGHT - In-Memory Storage

```javascript
// Store in memory (lost on server restart)
const data = {
    players: {},
    stats: {},
    cache: {}
};

// Save to config if needed
import ConfigManager from './config-manager.js';
const config = new ConfigManager('./config.json');
config.set('data', data);

// Or use cache
import Cache from './cache.js';
const cache = new Cache({ maxSize: 1000, ttl: 3600 });
cache.set('key', 'value');
const value = cache.get('key');
```

---

## Logging

### ❌ WRONG - Node.js Logger

```javascript
// Complex logging libraries don't work
const winston = require('winston');
```

### ✅ RIGHT - Simple Logging

```javascript
// Use Bedrock console
console.log('Info:', message);
console.error('Error:', error);
console.warn('Warning:', warning);

// Or create simple logger
class Logger {
    log(level, message, data) {
        const timestamp = new Date().toISOString();
        const prefix = `[${level}] ${timestamp}`;
        console.log(`${prefix} ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    info(message, data) {
        this.log('INFO', message, data);
    }

    error(message, data) {
        this.log('ERROR', message, data);
    }

    warn(message, data) {
        this.log('WARN', message, data);
    }
}

export default Logger;
```

---

## Common Patterns

### Pattern 1: Safe Player Access

```javascript
import { world } from '@minecraft/server';

function sendToPlayer(playerName, message) {
    const players = world.getPlayers({ name: playerName });
    if (players && players.length > 0) {
        const player = players[0];
        try {
            player.sendMessage(message);
            return true;
        } catch (error) {
            console.error(`Failed to send message: ${error}`);
            return false;
        }
    }
    return false;
}
```

### Pattern 2: Delayed Command Execution

```javascript
import { system } from '@minecraft/server';

function delayedCommand(dimension, command, delayMs) {
    const ticks = Math.max(1, Math.ceil(delayMs / 50));
    system.runTimeout(() => {
        try {
            dimension.runCommand(command);
        } catch (error) {
            console.error(`Command failed: ${error}`);
        }
    }, ticks);
}
```

### Pattern 3: Polling with Timeout

```javascript
import { system } from '@minecraft/server';

async function pollUntilCondition(condition, maxTicks) {
    let elapsed = 0;
    while (elapsed < maxTicks) {
        if (condition()) {
            return true;
        }
        await new Promise(resolve => {
            system.runTimeout(resolve, 1);
        });
        elapsed++;
    }
    return false;
}
```

### Pattern 4: Queue Processing

```javascript
import { system } from '@minecraft/server';

class Queue {
    constructor() {
        this.items = [];
        this.processing = false;
    }

    enqueue(item) {
        this.items.push(item);
        this.process();
    }

    async process() {
        if (this.processing) return;
        this.processing = true;

        while (this.items.length > 0) {
            const item = this.items.shift();
            try {
                await this.handleItem(item);
            } catch (error) {
                console.error('Item processing failed:', error);
            }
            // Small delay to prevent CPU spinning
            await new Promise(resolve => {
                system.runTimeout(resolve, 1);
            });
        }

        this.processing = false;
    }

    async handleItem(item) {
        // Override this method
    }
}
```

---

## Performance Tips

### ✅ DO

- ✅ Use try-catch around all async operations
- ✅ Validate inputs before using them
- ✅ Use caching for frequently accessed data
- ✅ Spread out heavy operations using system.runTimeout
- ✅ Check player existence before sendMessage
- ✅ Use promises/async-await for async code
- ✅ Keep tick-based delays minimal
- ✅ Monitor for memory leaks

### ❌ DON'T

- ❌ Use setTimeout / setInterval
- ❌ Use fetch / XMLHttpRequest
- ❌ Access file system
- ❌ Create too many concurrent async operations
- ❌ Block the main thread for long operations
- ❌ Assume players exist without checking
- ❌ Ignore errors
- ❌ Store large amounts of data in memory

---

## Error Handling

### Basic Pattern

```javascript
try {
    // Potentially failing operation
    const response = await client.send(request);
    console.log('Success:', response);
} catch (error) {
    console.error('Operation failed:', error);
    console.error('Error message:', error.message);

    // Handle specific errors
    if (error.message.includes('timeout')) {
        console.error('Request timed out');
    } else if (error.message.includes('connection')) {
        console.error('Network error');
    }
}
```

### Event Handler Error Handling

```javascript
world.beforeEvents.chatSend.subscribe((event) => {
    try {
        // Your code here
        const player = event.sender;
        const message = event.message;

        if (!player || !message) {
            return;  // Exit early if null
        }

        // Safe to use player and message
    } catch (error) {
        console.error('Chat handler error:', error);
    }
});
```

---

## Debugging

### Print Variable Values

```javascript
// Simple logging
console.log('Value:', myVariable);

// Structured logging
console.log('Data:', JSON.stringify(myVariable, null, 2));

// Debug prefix
const DEBUG = true;
if (DEBUG) {
    console.log('[DEBUG]', myVariable);
}
```

### Check Types

```javascript
console.log('Type:', typeof myVariable);
console.log('Is array:', Array.isArray(myVariable));
console.log('Is object:', typeof myVariable === 'object');

// Safe property access
const value = obj?.property?.nested;
```

### Use System Time

```javascript
const start = Date.now();
// ... some operation ...
const elapsed = Date.now() - start;
console.log('Operation took:', elapsed, 'ms');
```

---

## Module System

### Export

```javascript
// Named export
export class MyClass {
    // ...
}

// Default export
export default MyClass;

// Multiple exports
export const func1 = () => { };
export const func2 = () => { };
```

### Import

```javascript
// Default import
import MyClass from './myclass.js';

// Named import
import { func1, func2 } from './utils.js';

// Import all
import * as Utils from './utils.js';

// From Bedrock
import { world, system } from '@minecraft/server';
```

---

## Checklist Before Deployment

- ✅ No setTimeout/setInterval calls
- ✅ No fetch/XMLHttpRequest calls
- ✅ No file system operations
- ✅ All async operations in try-catch
- ✅ All player access checked for null
- ✅ Proper tick conversion for delays
- ✅ Error handling on all events
- ✅ No console.log calls in production (or controlled)
- ✅ Config file valid JSON
- ✅ All imports from Bedrock APIs

---

## Reference Links

**Minecraft Creator Documentation**:
- https://docs.microsoft.com/minecraft/creator/

**Bedrock Server Scripting API**:
- @minecraft/server
- @minecraft/server-net
- @minecraft/server-ui

---

## Quick Test

```javascript
// Test if your code is Bedrock-compatible
import { world, system } from '@minecraft/server';
import { HttpClient, HttpRequest } from '@minecraft/server-net';
import { ActionFormData } from '@minecraft/server-ui';

console.log('✅ Bedrock APIs available');

// Test timing
system.runTimeout(() => {
    console.log('✅ system.runTimeout works');
}, 1);

// Test event
world.afterEvents.worldInitialize.subscribe(() => {
    console.log('✅ Events work');
});

// Test HTTP
const client = new HttpClient();
const req = new HttpRequest('https://httpbin.org/get');
client.send(req).then(() => {
    console.log('✅ HTTP works');
});

// Test UI
if (world.getPlayers().length > 0) {
    const form = new ActionFormData().title('Test').body('OK');
    form.show(world.getPlayers()[0]).then(() => {
        console.log('✅ UI works');
    });
}
```

---

**Remember**: When in doubt, check the Bedrock documentation first!

Every Node.js API you use that's not in Bedrock will cause a crash.

🎮 Happy Bedrock plugin development! 🎮
