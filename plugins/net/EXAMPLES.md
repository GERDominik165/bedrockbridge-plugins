# Server-Net Plugin - Usage Examples

## Basic Examples

### Simple GET Request

```javascript
// Send a GET request
const requestId = plugin.requestManager.get('https://api.github.com/users/github');

// Check the result after processing
setTimeout(async () => {
    const status = plugin.requestManager.getRequestStatus(requestId);
    if (status && status.status === 'completed') {
        console.log('Response:', status.result.body);
        console.log('Status Code:', status.result.status);
    } else if (status && status.status === 'failed') {
        console.log('Error:', status.error);
    }
}, 3000);
```

### Simple POST Request

```javascript
// Send data via POST
const data = {
    title: 'My Post',
    body: 'This is the content',
    userId: 1
};

const requestId = plugin.requestManager.post(
    'https://jsonplaceholder.typicode.com/posts',
    data
);

// Monitor completion
setTimeout(() => {
    const status = plugin.requestManager.getRequestStatus(requestId);
    if (status && status.status === 'completed') {
        console.log('Created:', status.result.body);
    }
}, 2000);
```

### With Custom Headers

```javascript
// POST with authentication
const requestId = plugin.requestManager.post(
    'https://api.example.com/data',
    { message: 'Hello' },
    {
        headers: {
            'Authorization': 'Bearer eyJhbGc...',
            'X-API-Key': 'sk_live_...',
            'Content-Type': 'application/json'
        },
        timeout: 15000
    }
);
```

### With Timeout

```javascript
// Request with custom timeout (5 seconds)
const requestId = plugin.requestManager.get(
    'https://slow-api.example.com/data',
    {
        timeout: 5000
    }
);
```

## Advanced Examples

### Request with Automatic Retry

```javascript
// The plugin automatically retries failed requests
// Configure in settings.json:
// "api": { "retries": 3, "retryDelay": 1000 }

// This will retry up to 3 times with exponential backoff
const requestId = plugin.requestManager.post(
    'https://unstable-api.example.com/data',
    { test: 'data' }
);
```

### Monitoring Multiple Requests

```javascript
// Queue multiple requests
const requests = [
    plugin.requestManager.get('https://api.example.com/users'),
    plugin.requestManager.get('https://api.example.com/posts'),
    plugin.requestManager.get('https://api.example.com/comments')
];

// Wait and collect results
setTimeout(() => {
    const results = requests.map(id => {
        const status = plugin.requestManager.getRequestStatus(id);
        return {
            id,
            status: status.status,
            data: status.result?.body
        };
    });

    console.log('Results:', results);
}, 3000);
```

### Priority Requests

```javascript
// Queue multiple requests with different priorities
// High priority (executed first)
const criticalId = plugin.requestManager.queueRequest(
    'https://critical-api.example.com/alert',
    'Post',
    {
        body: { alert: 'critical' },
        priority: 10  // Higher number = higher priority
    }
);

// Normal priority (default)
const normalId = plugin.requestManager.get(
    'https://api.example.com/data'
);

// The critical request will be processed first
```

### Request Cancellation

```javascript
// Start a request
const requestId = plugin.requestManager.get(
    'https://very-slow-api.example.com/data'
);

// After 2 seconds, cancel if not completed
setTimeout(() => {
    const status = plugin.requestManager.getRequestStatus(requestId);
    if (status && (status.status === 'queued' || status.status === 'active')) {
        plugin.requestManager.cancelRequest(requestId, 'Timeout');
        console.log('Request cancelled');
    }
}, 2000);
```

### Cancel All Requests

```javascript
// Cancel all pending requests
const cancelled = plugin.requestManager.cancelAll('Server maintenance');
console.log(`Cancelled ${cancelled.length} requests`);

// All active and queued requests are cancelled
```

## Caching Examples

### Basic Caching

```javascript
// Store a value with 1 hour TTL
const userData = {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com'
};

plugin.cache.set('user:123', userData, 3600); // 1 hour

// Retrieve cached value
const cached = plugin.cache.get('user:123');
if (cached) {
    console.log('From cache:', cached.name);
}
```

### Cache-Based API Call

```javascript
async function getUser(userId) {
    // Check cache first
    const cached = plugin.cache.get(`user:${userId}`);
    if (cached) {
        console.log('Using cached data');
        return cached;
    }

    // Fetch from API
    const requestId = plugin.requestManager.get(
        `https://api.example.com/users/${userId}`
    );

    // Wait for result
    return new Promise(resolve => {
        const checkStatus = () => {
            const status = plugin.requestManager.getRequestStatus(requestId);
            if (status && (status.status === 'completed' || status.status === 'failed')) {
                if (status.status === 'completed') {
                    const data = JSON.parse(status.result.body);
                    // Cache for 30 minutes
                    plugin.cache.set(`user:${userId}`, data, 1800);
                    resolve(data);
                } else {
                    resolve(null);
                }
            } else {
                setTimeout(checkStatus, 100);
            }
        };
        checkStatus();
    });
}

// Usage
const user = await getUser(123);
```

### Cache Statistics

```javascript
// Get cache performance metrics
const stats = plugin.cache.getStats();
console.log('Cache Stats:');
console.log('  Size:', stats.size);
console.log('  Max Size:', stats.maxSize);
console.log('  Hits:', stats.hits);
console.log('  Misses:', stats.misses);
console.log('  Hit Rate:', stats.hitRate);
console.log('  Evictions:', stats.evictions);
```

## Logging Examples

### Basic Logging

```javascript
// Log at different levels
plugin.logger.error('Critical error', new Error('Database failed'));
plugin.logger.warn('Warning message', { severity: 'high' });
plugin.logger.info('Information message');
plugin.logger.debug('Debug message');
plugin.logger.trace('Trace message');
```

### Get Log History

```javascript
// Get last 20 logs
const logs = plugin.logger.getHistory(20);
logs.forEach(log => {
    console.log(`[${log.level}] ${log.message}`);
});

// Get only error logs
const errors = plugin.logger.getHistory(50, 'error');
```

### Logger Statistics

```javascript
const stats = plugin.logger.getStats();
console.log('Logger Stats:');
console.log('  Errors:', stats.error);
console.log('  Warnings:', stats.warn);
console.log('  Infos:', stats.info);
console.log('  Total Logs:', stats.totalLogs);
console.log('  History Size:', stats.historySize);
```

## Statistics Examples

### Get Overall Statistics

```javascript
const stats = plugin.requestManager.getStats();
console.log('Request Statistics:');
console.log('  Total:', stats.totalRequests);
console.log('  Success:', stats.successCount);
console.log('  Failed:', stats.failureCount);
console.log('  Avg Response Time:', stats.avgResponseTime, 'ms');
console.log('  Total Time:', stats.totalTime, 'ms');
console.log('  Active:', stats.active);
console.log('  Queued:', stats.queued);
```

### Health Status

```javascript
const health = plugin.requestManager.getHealthStatus();
console.log('System Health:');
console.log('  Status:', health.health); // excellent/good/poor
console.log('  Success Rate:', health.successRate);
console.log('  Running:', health.running);
console.log('  Stats:', health.stats);
```

### Queue Status

```javascript
const queueStatus = plugin.requestManager.getQueueStatus();
console.log('Queue Status:');
console.log('  Queued:', queueStatus.queued);
console.log('  Active:', queueStatus.active);
console.log('  Max Concurrent:', queueStatus.maxConcurrent);
console.log('  Can Process:', queueStatus.canProcess);
```

### Request History

```javascript
// Get last 50 requests
const history = plugin.requestManager.getHistory(50);
console.log('Request History:');
history.forEach(req => {
    console.log(`  ${req.status.toUpperCase()} [${req.method}] ${req.uri}`);
});

// Get only failed requests
const failed = plugin.requestManager.getHistory(50, 'failed');
console.log('Failed Requests:', failed.length);
```

## Configuration Examples

### API Configuration

```javascript
// Adjust API settings
plugin.config.set('api.timeout', 15000);        // 15 seconds
plugin.config.set('api.retries', 5);            // Retry 5 times
plugin.config.set('api.maxConcurrentRequests', 10); // 10 concurrent
plugin.config.set('api.retryDelay', 2000);      // 2 second initial delay

// Verify changes
console.log(plugin.config.getSection('api'));
```

### Cache Configuration

```javascript
// Adjust cache settings
plugin.config.set('cache.enabled', true);
plugin.config.set('cache.ttl', 7200);           // 2 hours
plugin.config.set('cache.maxSize', 5000);       // 5000 entries

// Create new cache instance if needed
if (plugin.cache) {
    plugin.cache.destroy();
}
plugin.cache = new Cache(plugin.config.getSection('cache'));
```

### Logging Configuration

```javascript
// Adjust logging
plugin.config.set('logging.level', 'debug');    // More verbose
plugin.config.set('logging.maxHistory', 2000);  // More history
plugin.logger.setLevel('debug');                // Apply immediately
```

## Integration Examples

### Discord Webhook Integration

```javascript
async function sendToDiscord(message, data) {
    const webhookUrl = 'https://discord.com/api/webhooks/...';

    const payload = {
        content: message,
        embeds: [{
            title: 'Server Update',
            description: JSON.stringify(data),
            color: 3066993
        }]
    };

    return plugin.requestManager.post(
        webhookUrl,
        payload,
        {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

// Usage
sendToDiscord('Server started', { players: 5, uptime: '2h' });
```

### REST API Integration

```javascript
class APIClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        };

        if (method === 'Get') {
            return plugin.requestManager.get(url, options);
        } else {
            return plugin.requestManager.post(url, data, options);
        }
    }

    async getUsers() {
        return this.request('Get', '/users');
    }

    async createUser(userData) {
        return this.request('Post', '/users', userData);
    }
}

// Usage
const api = new APIClient('https://api.example.com', 'sk_...');
const usersRequestId = await api.getUsers();
```

### Database Sync

```javascript
async function syncDatabase() {
    const operations = [];

    // Batch multiple requests
    operations.push(
        plugin.requestManager.get('https://db.example.com/users')
    );
    operations.push(
        plugin.requestManager.get('https://db.example.com/items')
    );
    operations.push(
        plugin.requestManager.get('https://db.example.com/transactions')
    );

    // Wait for all to complete
    return Promise.all(
        operations.map(id => new Promise(resolve => {
            const checkCompletion = () => {
                const status = plugin.requestManager.getRequestStatus(id);
                if (status && (status.status === 'completed' || status.status === 'failed')) {
                    resolve(status);
                } else {
                    setTimeout(checkCompletion, 100);
                }
            };
            checkCompletion();
        }))
    );
}
```

### Data Collection and Reporting

```javascript
class DataCollector {
    constructor(reportUrl) {
        this.reportUrl = reportUrl;
        this.data = [];
    }

    collect(dataPoint) {
        this.data.push({
            timestamp: Date.now(),
            ...dataPoint
        });

        // Send batch every 10 items
        if (this.data.length >= 10) {
            this.sendBatch();
        }
    }

    async sendBatch() {
        const batch = this.data.splice(0, 10);

        const requestId = plugin.requestManager.post(
            this.reportUrl,
            { data: batch },
            {
                headers: {
                    'X-Batch-Size': batch.length.toString()
                }
            }
        );

        plugin.logger.info('Data batch sent', { size: batch.length });
    }
}

// Usage
const collector = new DataCollector('https://analytics.example.com/collect');
collector.collect({ event: 'player_join', player: 'Steve' });
collector.collect({ event: 'command_executed', command: 'help' });
```

## Error Handling Examples

### Try-Catch Pattern

```javascript
async function safeRequest(url) {
    try {
        const requestId = plugin.requestManager.get(url);

        // Wait for completion
        return new Promise((resolve, reject) => {
            const checkStatus = () => {
                const status = plugin.requestManager.getRequestStatus(requestId);
                if (status) {
                    if (status.status === 'completed') {
                        if (status.result.ok) {
                            resolve(status.result);
                        } else {
                            reject(new Error(`HTTP ${status.result.status}`));
                        }
                    } else if (status.status === 'failed') {
                        reject(status.error);
                    } else {
                        setTimeout(checkStatus, 100);
                    }
                }
            };
            checkStatus();
        });
    } catch (error) {
        plugin.logger.error('Request failed', error);
        throw error;
    }
}
```

### Validation Before Request

```javascript
async function validatedRequest(url, method = 'Get') {
    // Validate URL
    if (!Validators.isValidUrl(url)) {
        throw new Error(`Invalid URL: ${url}`);
    }

    // Validate method
    if (!Validators.isValidHttpMethod(method)) {
        throw new Error(`Invalid method: ${method}`);
    }

    // Proceed with request
    if (method === 'Get') {
        return plugin.requestManager.get(url);
    }
}
```

### Graceful Degradation

```javascript
async function fetchWithFallback(primaryUrl, fallbackUrl) {
    try {
        const primaryId = plugin.requestManager.get(primaryUrl);
        const status = await waitForCompletion(primaryId, 5000);

        if (status.status === 'completed' && status.result.ok) {
            return status.result;
        }
    } catch (error) {
        plugin.logger.warn('Primary request failed, using fallback', { error });
    }

    // Use fallback
    const fallbackId = plugin.requestManager.get(fallbackUrl);
    return waitForCompletion(fallbackId, 10000);
}

async function waitForCompletion(requestId, timeoutMs) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkStatus = () => {
            if (Date.now() - startTime > timeoutMs) {
                plugin.requestManager.cancelRequest(requestId, 'Timeout');
                reject(new Error('Request timeout'));
                return;
            }

            const status = plugin.requestManager.getRequestStatus(requestId);
            if (status && (status.status === 'completed' || status.status === 'failed')) {
                resolve(status);
            } else {
                setTimeout(checkStatus, 100);
            }
        };
        checkStatus();
    });
}
```

## Performance Optimization Examples

### Request Batching

```javascript
class BatchProcessor {
    constructor(batchSize = 10, flushInterval = 5000) {
        this.batchSize = batchSize;
        this.flushInterval = flushInterval;
        this.queue = [];
        this.startAutoFlush();
    }

    add(url, method = 'Get', options = {}) {
        this.queue.push({ url, method, options });
        if (this.queue.length >= this.batchSize) {
            this.flush();
        }
    }

    flush() {
        if (this.queue.length === 0) return;

        const batch = this.queue.splice(0, this.queue.length);
        batch.forEach(req => {
            if (req.method === 'Get') {
                plugin.requestManager.get(req.url, req.options);
            } else {
                plugin.requestManager.post(req.url, req.options.body, req.options);
            }
        });
    }

    startAutoFlush() {
        setInterval(() => this.flush(), this.flushInterval);
    }
}

// Usage
const processor = new BatchProcessor(5, 3000);
processor.add('https://api.example.com/data1');
processor.add('https://api.example.com/data2');
// Will auto-flush after 3 seconds or 5 items
```

### Connection Pooling (Already Built-In)

```javascript
// The RequestManager uses connection pooling automatically
// Configure pool size in settings.json

// Example: Handle high volume efficiently
for (let i = 0; i < 100; i++) {
    plugin.requestManager.get(`https://api.example.com/item/${i}`);
    // These will be automatically queued and processed with max 5 concurrent
}

// Check queue status
const status = plugin.requestManager.getQueueStatus();
console.log(`Queued: ${status.queued}, Active: ${status.active}`);
```

## Real-World Scenario Examples

### Player Data Synchronization

```javascript
async function syncPlayerData(player) {
    const playerData = {
        uuid: player.id,
        name: player.name,
        location: player.location,
        inventory: player.inventory.container.contents,
        level: player.level,
        timestamp: Date.now()
    };

    // Cache for 5 minutes
    plugin.cache.set(`player:${player.id}`, playerData, 300);

    // Send to server
    return plugin.requestManager.post(
        'https://myserver.com/api/players/sync',
        playerData
    );
}
```

### Server Status Reporting

```javascript
async function reportServerStatus() {
    const stats = plugin.requestManager.getStats();
    const health = plugin.requestManager.getHealthStatus();

    const report = {
        timestamp: Date.now(),
        requests: {
            total: stats.totalRequests,
            success: stats.successCount,
            failed: stats.failureCount
        },
        health: health.health,
        successRate: health.successRate,
        avgResponseTime: stats.avgResponseTime
    };

    return plugin.requestManager.post(
        'https://monitoring.example.com/server-status',
        report
    );
}

// Schedule periodic reporting
setInterval(reportServerStatus, 60000); // Every minute
```

### Event Logging

```javascript
async function logEvent(eventType, eventData) {
    const logEntry = {
        type: eventType,
        data: eventData,
        timestamp: Date.now(),
        severity: 'info'
    };

    // Send to logging server
    return plugin.requestManager.post(
        'https://logs.example.com/events',
        logEntry,
        {
            headers: {
                'X-Event-Type': eventType
            }
        }
    );
}

// Usage in world events
world.afterEvents.playerSpawn.subscribe(event => {
    logEvent('player_spawn', {
        player: event.player.name,
        location: event.player.location
    });
});
```

These examples cover basic operations, advanced usage, caching, logging, statistics, configurations, integrations, error handling, performance optimization, and real-world scenarios. They should provide comprehensive guidance for using the Server-Net plugin effectively.
