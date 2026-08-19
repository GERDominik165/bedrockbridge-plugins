# Server-Net Universal Bridge Plugin

Professional HTTP management system for Bedrock Dedicated Server with comprehensive UI dashboard and full server-net integration.

## Features

- **Universal HTTP Support**: GET, POST, PUT, DELETE, HEAD methods
- **Smart Queue Management**: Request pooling with configurable concurrency limits
- **Automatic Retry Logic**: Exponential backoff for failed requests
- **LRU Cache**: TTL-based caching with automatic cleanup
- **Professional Dashboard**: Interactive UI with forms and statistics
- **Request History**: Track all requests with detailed metrics
- **Health Monitoring**: Real-time system health and performance tracking
- **Comprehensive Logging**: Multi-level logging with history
- **Configuration Management**: Flexible JSON-based configuration
- **Admin Commands**: Powerful command system for management
- **Security**: Admin-only access control

## Installation

1. Copy the `net` folder to `D:\BB\bridgePlugins\`
2. The plugin will auto-initialize on server startup
3. Grant admin tag to players who should access advanced features: `/tag @p add admin`

## Quick Start

### In-Game Commands

```
!dashboard              - Open main control panel
!http get <url>        - Send GET request
!http post <url> <data> - Send POST request
!http put <url> <data>  - Send PUT request
!http delete <url>      - Send DELETE request
!http stats            - Show statistics
!http status           - Show system status
!netstatus             - Quick status check
!nethelp               - Show help menu
```

### JavaScript API

```javascript
import plugin from '@net';

// Get request
const requestId = plugin.requestManager.get('https://api.example.com/users');

// POST request
const postId = plugin.requestManager.post(
    'https://api.example.com/data',
    { name: 'Test', value: 123 }
);

// Check status
const status = plugin.requestManager.getRequestStatus(requestId);
if (status.status === 'completed') {
    console.log('Response:', status.result);
}

// Get statistics
const stats = plugin.requestManager.getStats();
console.log(`Success rate: ${stats.successCount}/${stats.totalRequests}`);
```

## Architecture

### Core Modules

#### Logger (`core/logger.js`)
Multi-level logging system with history tracking
- Levels: error, warn, info, debug, trace
- History tracking with configurable size
- Statistics tracking

#### ConfigManager (`core/config-manager.js`)
Centralized configuration management
- Nested property access (`api.timeout`)
- Default values
- Validation

#### Cache (`core/cache.js`)
LRU cache with TTL support
- Automatic expiration
- Memory management
- Hit rate tracking

#### HttpClient (`net/http-client.js`)
Wrapper for @minecraft/server-net
- Simplified HTTP interface
- Header management
- Error handling

#### RequestQueue (`net/request-queue.js`)
Request queue management
- Priority-based ordering
- Request tracking
- History management

#### RequestManager (`net/request-manager.js`)
Main orchestrator for HTTP operations
- Request pooling
- Retry logic with exponential backoff
- Statistics and metrics
- Health monitoring

#### Dashboard (`ui/dashboard.js`)
Professional UI with multiple forms
- Main menu
- Statistics display
- Queue status
- Request history
- HTTP testing
- Settings management
- Health checks

### Directory Structure

```
net/
├── index.js                 # Main entry point
├── package.json            # Module metadata
├── config/
│   └── settings.json       # Configuration file
├── core/
│   ├── logger.js           # Logging system
│   ├── config-manager.js   # Configuration management
│   ├── cache.js            # LRU cache with TTL
│   └── index.js            # Module exports
├── net/
│   ├── http-client.js      # HTTP wrapper
│   ├── request-queue.js    # Request queue
│   ├── request-manager.js  # Request orchestration
│   └── index.js            # Module exports
├── ui/
│   ├── dashboard.js        # UI dashboard
│   └── index.js            # Module exports
├── utils/
│   ├── validators.js       # Validation utilities
│   └── index.js            # Module exports
└── README.md               # This file
```

## Configuration

Edit `config/settings.json` to customize behavior:

```json
{
  "api": {
    "timeout": 10000,                  // Request timeout in ms
    "retries": 3,                      // Number of retries
    "retryDelay": 1000,               // Initial retry delay in ms
    "maxConcurrentRequests": 5,       // Max concurrent requests
    "enabled": true
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,                      // Cache TTL in seconds
    "maxSize": 1000,                  // Max cache entries
    "cleanupInterval": 300            // Cleanup interval in seconds
  },
  "logging": {
    "enabled": true,
    "level": "info",                  // Log level
    "maxHistory": 1000                // Max log history
  },
  "ui": {
    "enabled": true,
    "theme": "default"
  },
  "security": {
    "requireAdminTag": true,          // Require admin tag for commands
    "enableSSL": true,                // Enforce HTTPS
    "allowSelfSigned": false          // Allow self-signed certificates
  },
  "features": {
    "enableRequestHistory": true,
    "enableStatistics": true,
    "enableHealthCheck": true
  }
}
```

## Examples

### Basic GET Request

```javascript
const requestId = plugin.requestManager.get('https://jsonplaceholder.typicode.com/users/1');

// Check result after processing
setTimeout(() => {
    const status = plugin.requestManager.getRequestStatus(requestId);
    if (status && status.status === 'completed') {
        console.log('Response:', status.result.body);
    }
}, 2000);
```

### POST with Data

```javascript
const data = {
    title: 'Test Post',
    body: 'This is a test',
    userId: 1
};

const requestId = plugin.requestManager.post(
    'https://jsonplaceholder.typicode.com/posts',
    data,
    {
        timeout: 5000,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123'
        }
    }
);
```

### Custom Headers

```javascript
const requestId = plugin.requestManager.get(
    'https://api.example.com/data',
    {
        headers: {
            'X-API-Key': 'your-api-key',
            'User-Agent': 'BedrocServer/1.0',
            'Accept': 'application/json'
        },
        timeout: 15000
    }
);
```

### Error Handling

```javascript
try {
    const requestId = plugin.requestManager.post(
        'https://api.example.com/invalid',
        { test: 'data' }
    );

    // Wait for completion
    await new Promise(resolve => {
        const checkStatus = () => {
            const status = plugin.requestManager.getRequestStatus(requestId);
            if (status && (status.status === 'completed' || status.status === 'failed')) {
                resolve(status);
            } else {
                setTimeout(checkStatus, 100);
            }
        };
        checkStatus();
    });
} catch (error) {
    console.error('Request failed:', error.message);
}
```

## Statistics & Monitoring

### Get Global Statistics

```javascript
const stats = plugin.requestManager.getStats();
console.log('Total Requests:', stats.totalRequests);
console.log('Success Count:', stats.successCount);
console.log('Failure Count:', stats.failureCount);
console.log('Avg Response Time:', stats.avgResponseTime, 'ms');
console.log('Active Requests:', stats.active);
console.log('Queued:', stats.queued);
```

### Get Health Status

```javascript
const health = plugin.requestManager.getHealthStatus();
console.log('Health:', health.health); // 'excellent', 'good', 'poor'
console.log('Success Rate:', health.successRate);
console.log('Running:', health.running);
```

### Get Request History

```javascript
const history = plugin.requestManager.getHistory(50, 'all');
history.forEach(req => {
    console.log(`${req.method} ${req.uri} - ${req.status}`);
});
```

## Advanced Usage

### Priority Queuing

```javascript
// High priority request (processed first)
const priorityId = plugin.requestManager.queueRequest(
    'https://critical-api.example.com/data',
    'Get',
    { priority: 10 }
);

// Normal priority
const normalId = plugin.requestManager.queueRequest(
    'https://api.example.com/data',
    'Get',
    { priority: 0 }
);
```

### Request Cancellation

```javascript
// Cancel specific request
plugin.requestManager.cancelRequest(requestId, 'User cancelled');

// Cancel all pending requests
plugin.requestManager.cancelAll('Server maintenance');
```

### Cache Management

```javascript
// Set cached value
plugin.cache.set('user:123', userData, 3600); // 1 hour TTL

// Get cached value
const cached = plugin.cache.get('user:123');

// Get cache stats
const cacheStats = plugin.cache.getStats();
console.log('Hit Rate:', cacheStats.hitRate);
console.log('Size:', cacheStats.size);
```

## Dashboard Navigation

### Main Menu
- Statistics - View overall metrics
- Queue Status - Monitor active requests
- Request History - View past requests
- HTTP Test - Test HTTP requests
- Settings - Configure plugin

### Statistics View
- Total requests, success/failure counts
- Success rate and average response time
- Current active and queued requests
- Last request/error timestamps

### Queue Status View
- List of active requests
- Queue information
- Option to cancel all requests

### Request History View
- Last 20 requests with status
- Execution times
- Clear history option

### HTTP Test Form
- Method selection
- URL input
- Automatic result display

### Settings
- General settings and logs
- API configuration
- Cache configuration
- Health check

## Command Examples

### Player Commands

```
# Open dashboard
!dashboard

# Test an API endpoint
!http get https://api.example.com/status

# POST data
!http post https://api.example.com/data {"name":"John","age":30}

# Check statistics
!http stats

# View system status
!http status

# Quick status check
!netstatus

# Get help
!nethelp
```

## Performance Tuning

### For High-Traffic Scenarios
```json
{
  "api": {
    "maxConcurrentRequests": 10,
    "timeout": 5000,
    "retries": 2
  },
  "cache": {
    "maxSize": 5000,
    "ttl": 7200
  }
}
```

### For Reliability
```json
{
  "api": {
    "maxConcurrentRequests": 3,
    "timeout": 15000,
    "retries": 5,
    "retryDelay": 2000
  }
}
```

### For Low Memory
```json
{
  "cache": {
    "enabled": false
  },
  "logging": {
    "maxHistory": 100
  }
}
```

## Troubleshooting

### Requests Timing Out
- Increase `api.timeout` in settings
- Reduce `maxConcurrentRequests` to reduce contention
- Check target server availability

### High Failure Rate
- Increase `api.retries` and `api.retryDelay`
- Check URL validity
- Verify network connectivity

### Memory Issues
- Reduce cache size or disable caching
- Clear history regularly
- Reduce log history size

### Dashboard Not Opening
- Verify admin tag: `/tag @s add admin`
- Check `ui.enabled` in settings
- Review logs for errors

## API Reference

### RequestManager Methods

```javascript
// Queue requests
get(uri, options)                    // Returns request ID
post(uri, body, options)             // Returns request ID
put(uri, body, options)              // Returns request ID
delete(uri, options)                 // Returns request ID
head(uri, options)                   // Returns request ID
queueRequest(uri, method, options)   // Returns request ID

// Manage requests
getRequestStatus(id)                 // Get request status
cancelRequest(id, reason)            // Cancel specific request
cancelAll(reason)                    // Cancel all pending

// Get information
getStats()                           // Overall statistics
getQueueStatus()                     // Queue information
getHealthStatus()                    // System health
getHistory(count, type)              // Request history

// Maintenance
resetStats()                         // Reset statistics
clearHistory()                       // Clear history
initialize()                         // Initialize
shutdown()                           // Cleanup
```

### Logger Methods

```javascript
logger.error(message, error)         // Log error
logger.warn(message, data)           // Log warning
logger.info(message, data)           // Log info
logger.debug(message, data)          // Log debug
logger.trace(message, data)          // Log trace
logger.getStats()                    // Get statistics
logger.getHistory(count, level)      // Get log history
logger.clearHistory()                // Clear history
logger.resetStats()                  // Reset statistics
logger.setLevel(level)               // Change log level
```

### Cache Methods

```javascript
cache.set(key, value, ttl)           // Set cached value
cache.get(key)                       // Get cached value
cache.has(key)                       // Check if exists
cache.delete(key)                    // Delete entry
cache.clear()                        // Clear all
cache.cleanup()                      // Remove expired
cache.getStats()                     // Get statistics
cache.getAll()                       // Get all entries
```

## License

MIT License - Free for use in Bedrock plugins

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in-game with `!nethelp`
3. Verify configuration in `config/settings.json`
4. Check system health with `!netstatus`

## Version History

### 1.0.0 (Current)
- Initial release
- Full server-net integration
- Professional UI dashboard
- Request pooling and queue management
- Cache system with TTL
- Comprehensive logging
- Admin commands
- Configuration management
