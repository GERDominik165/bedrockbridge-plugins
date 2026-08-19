# Server-Net Plugin - Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Players/Users                            │
│                    (Chat Commands & Forms)                       │
└────────────────┬────────────────────────────────────┬────────────┘
                 │                                    │
        ┌────────▼────────────┐         ┌────────────▼───────────┐
        │  Command Handler    │         │   Dashboard/UI         │
        │  (Chat Events)      │         │  (ActionFormData)      │
        └────────┬────────────┘         └────────────┬───────────┘
                 │                                   │
        ┌────────▼──────────────────────────────────▼────────────┐
        │              Request Manager                           │
        │  (HTTP Orchestration & Lifecycle Management)           │
        └────────┬────────────────────────────────────┬──────────┘
                 │                                    │
        ┌────────▼──────────────┐        ┌───────────▼────────┐
        │  Request Queue        │        │  HTTP Client       │
        │  (Pooling & Priority) │        │  (@minecraft/...) │
        └────────┬──────────────┘        └───────────┬────────┘
                 │                                   │
        ┌────────▼──────────────────────────────────▼────────────┐
        │         Support Systems (Core Services)                │
        │  ┌─────────┐  ┌────────┐  ┌────────┐  ┌───────────┐   │
        │  │ Logger  │  │ Config │  │ Cache  │  │Validators │   │
        │  └─────────┘  └────────┘  └────────┘  └───────────┘   │
        └────────────────────────────────────────────────────────┘
                         │
        ┌────────────────▼──────────────────┐
        │  @minecraft/server-net API        │
        │  (Native HTTP Functionality)      │
        └────────────────┬──────────────────┘
                         │
        ┌────────────────▼──────────────────┐
        │      External HTTP Servers        │
        │   (APIs, Webhooks, Services)      │
        └───────────────────────────────────┘
```

## Layer Architecture

### 1. **Presentation Layer** (UI/Commands)
Responsible for user interaction:
- Chat command parsing and routing
- Form-based user interfaces (ActionFormData, ModalFormData)
- User feedback and notifications
- Help and documentation display

**Files**: `index.js` (command handlers), `ui/dashboard.js`

### 2. **Application Layer** (Business Logic)
Orchestrates HTTP operations:
- Request queuing and priority handling
- Retry logic and error recovery
- Statistics and health monitoring
- Request lifecycle management

**Files**: `net/request-manager.js`, `net/request-queue.js`

### 3. **Network Layer** (HTTP Operations)
Low-level HTTP handling:
- @minecraft/server-net wrapper
- Request/response formatting
- Header management
- Protocol handling

**Files**: `net/http-client.js`

### 4. **Support Layer** (Core Services)
Cross-cutting concerns:
- Logging and debugging
- Configuration management
- Caching and data persistence
- Input validation

**Files**: `core/logger.js`, `core/config-manager.js`, `core/cache.js`, `utils/validators.js`

## Data Flow

### Request Lifecycle

```
User Input (Chat/Form)
        ↓
Command Parser
        ↓
Validation (Validators)
        ↓
Request Manager
        ↓
Request Queue
        ├─→ Check capacity
        ├─→ Prioritize
        └─→ Store request
        ↓
HTTP Client (when dequeued)
        ├─→ Create HttpRequest
        ├─→ Set headers/body
        └─→ Execute via @minecraft/server-net
        ↓
Response Received
        ├─→ Success? → Complete
        └─→ Failure? → Retry (exponential backoff)
        ↓
Record Metrics
        ├─→ Update stats
        ├─→ Add to history
        └─→ Update cache (if enabled)
        ↓
User Notification
        └─→ Chat message / Form update
```

### Configuration Flow

```
settings.json (File)
        ↓
ConfigManager.load()
        ↓
Deep merge with defaults
        ↓
Validation
        ↓
Use in components
        ├─→ RequestManager (API settings)
        ├─→ Logger (Logging settings)
        ├─→ Cache (Cache settings)
        └─→ Dashboard (UI settings)
```

### Cache Flow

```
Request for data
        ↓
Check Cache.has(key)?
        ├─→ Yes: Check TTL?
        │   ├─→ Valid: Return cached
        │   └─→ Expired: Fetch fresh
        └─→ No: Fetch fresh
        ↓
Fetch from source
        ↓
Store in Cache (with TTL)
        ↓
Return to caller
```

## Component Details

### RequestManager (Core Orchestrator)

```javascript
RequestManager
├── Properties
│   ├── config: ConfigManager         // Configuration access
│   ├── logger: Logger                // Logging system
│   ├── httpClient: HttpClient        // HTTP operations
│   ├── queue: RequestQueue           // Request queue
│   ├── stats: Object                 // Statistics tracking
│   ├── requestHistory: Array         // Request history
│   └── isRunning: Boolean            // Manager state
│
├── Methods (Request Operations)
│   ├── get(uri, options)
│   ├── post(uri, body, options)
│   ├── put(uri, body, options)
│   ├── delete(uri, options)
│   ├── head(uri, options)
│   └── queueRequest(uri, method, options)
│
├── Methods (Request Management)
│   ├── getRequestStatus(id)
│   ├── cancelRequest(id, reason)
│   ├── cancelAll(reason)
│   └── executeRequest(queuedRequest)
│
├── Methods (Information)
│   ├── getStats()                    // Overall statistics
│   ├── getQueueStatus()              // Queue state
│   ├── getHealthStatus()             // System health
│   ├── getHistory(count, type)       // Request history
│   └── getRequestStatus(id)          // Single request status
│
├── Methods (Maintenance)
│   ├── initialize()                  // Startup
│   ├── shutdown()                    // Cleanup
│   ├── resetStats()                  // Clear statistics
│   ├── clearHistory()                // Clear history
│   └── processQueue()                // Main event loop
```

### RequestQueue (Priority Queue)

```javascript
RequestQueue
├── Properties
│   ├── queue: Array                  // Pending requests
│   ├── active: Map                   // Active requests
│   ├── completed: Array              // Completed history
│   ├── failed: Array                 // Failed history
│   ├── maxConcurrent: Number         // Concurrency limit
│   ├── maxHistory: Number            // History size limit
│   └── stats: Object                 // Statistics
│
├── Methods
│   ├── enqueue(request)              // Add to queue
│   ├── dequeue()                     // Get next request
│   ├── complete(id, result)          // Mark completed
│   ├── fail(id, error)               // Mark failed
│   ├── cancel(id, reason)            // Cancel request
│   ├── getStatus(id)                 // Get request state
│   ├── getQueueStatus()              // Queue overview
│   ├── getActive()                   // Get active requests
│   ├── getQueued()                   // Get pending requests
│   ├── getStats()                    // Statistics
│   └── cancelAll(reason)             // Cancel all
```

### Logger (Multi-Level Logging)

```javascript
Logger
├── Properties
│   ├── name: String                  // Logger name
│   ├── level: String                 // Current level
│   ├── levels: Object                // Level hierarchy
│   ├── history: Array                // Log history
│   └── stats: Object                 // Statistics
│
├── Levels (Hierarchy)
│   ├── error   (0)  - Critical issues
│   ├── warn    (1)  - Warnings
│   ├── info    (2)  - Information
│   ├── debug   (3)  - Debugging
│   └── trace   (4)  - Detailed trace
│
├── Methods
│   ├── error(msg, error)
│   ├── warn(msg, data)
│   ├── info(msg, data)
│   ├── debug(msg, data)
│   ├── trace(msg, data)
│   ├── getStats()
│   ├── getHistory(count, level)
│   ├── setLevel(level)
│   └── clearHistory()
```

### Cache (LRU with TTL)

```javascript
Cache
├── Properties
│   ├── cache: Map                    // Actual data
│   ├── timestamps: Map               // Expiry times
│   ├── accessTimes: Map              // Last access
│   ├── maxSize: Number               // Size limit
│   ├── defaultTTL: Number            // Default TTL
│   └── stats: Object                 // Statistics
│
├── Methods
│   ├── set(key, value, ttl)
│   ├── get(key)
│   ├── has(key)
│   ├── delete(key)
│   ├── clear()
│   ├── cleanup()                     // Remove expired
│   ├── getStats()
│   └── getAll()
```

### Dashboard (UI System)

```javascript
Dashboard
├── Properties
│   ├── requestManager: RequestManager
│   ├── logger: Logger
│   └── colors: Object                // Color codes
│
├── Main Views
│   ├── showMainMenu()                // Primary menu
│   ├── showStatistics()              // Stats display
│   ├── showQueueStatus()             // Queue info
│   ├── showRequestHistory()          // History view
│   ├── showHttpTest()                // Test form
│   └── showSettings()                // Configuration
│
├── Helper Methods
│   ├── formatNumber()
│   ├── formatDuration()
│   ├── formatTimestamp()
│   └── formatMessage()
```

## State Management

### Request States

```
Queued
  ├─→ Active (being processed)
  │   ├─→ Completed (success)
  │   └─→ Failed (error)
  └─→ Cancelled (user action)
```

### Request Object Structure

```javascript
{
    id: "req_1234567890_abc123",      // Unique identifier
    request: {
        uri: "https://...",            // Target URL
        method: "Get|Post|Put|Delete", // HTTP method
        timeout: 10000,                // Timeout in ms
        headers: [...],                // Header array
        body: "..."                    // Request body
    },
    status: "queued|active|completed|failed|cancelled",
    createdAt: 1234567890,            // Queue time
    startedAt: 1234567891,            // Start time
    completedAt: 1234567892,          // End time
    error: null,                       // Error if failed
    result: {                          // Response if completed
        ok: true,
        status: 200,
        body: "...",
        headers: {}
    },
    priority: 0                        // Priority level
}
```

## Concurrency Model

### Queue Processing

```
Main Loop
├─→ Check: active.size < maxConcurrent?
│   ├─→ Yes
│   │   ├─→ Dequeue next request
│   │   ├─→ Execute asynchronously
│   │   └─→ Continue loop
│   └─→ No
│       └─→ Wait for completion
├─→ Sleep 10ms (prevent CPU spinning)
└─→ Repeat while running
```

### Request Execution (with Retries)

```
For each retry (0 to maxRetries)
├─→ Send HTTP request
├─→ Get response
├─→ Success?
│   ├─→ Yes: Record success, complete
│   └─→ No: On last attempt?
│       ├─→ Yes: Record failure, complete
│       └─→ No: Wait delay, retry
└─→ Exponential backoff: delay * (attempt + 1)
```

## Error Handling

### Retry Strategy

```javascript
Attempt 1: Try immediately
Attempt 2: Wait 1000ms, then try
Attempt 3: Wait 2000ms, then try
Attempt 4: Wait 3000ms, then try
Final Fail: Record error and complete
```

### Error Recovery

- Network errors → Retry with backoff
- Timeout errors → Retry with increased timeout
- Invalid URLs → Fail immediately
- Parsing errors → Fail immediately
- Server errors (5xx) → Retry
- Client errors (4xx) → Depends on code

## Performance Characteristics

### Time Complexity
- Queue operations: O(n) for priority insertion (could be optimized to O(log n))
- Cache get/set: O(1)
- Stats calculation: O(1)
- History lookup: O(n)

### Space Complexity
- Queue size: O(queueSize)
- Cache size: O(maxCacheSize)
- History size: O(maxHistorySize)
- Stats: O(1)
- Logs: O(maxLogs)

### Throughput
- With 5 concurrent requests and 10s avg response time
- Theoretical max: 0.5 requests/second per connection
- Actual depends on network and server

## Configuration Priority

```
User Input (UI/Commands)
    ↓ (if provided)
File Configuration (settings.json)
    ↓ (if provided)
Default Values (in ConfigManager)
```

## Security Considerations

1. **Admin Access Control**
   - All commands require admin tag (configurable)
   - Checked before command execution

2. **URL Validation**
   - All URLs validated before request
   - Invalid URLs rejected immediately

3. **SSL/TLS Support**
   - Configurable SSL enforcement
   - Self-signed cert support

4. **Request Size Limits**
   - Configurable max request size
   - Prevents memory exhaustion

5. **Rate Limiting**
   - Configurable max concurrent requests
   - Prevents resource exhaustion

6. **Timeout Protection**
   - Configurable timeouts
   - Prevents hanging requests

## Extensibility

### Adding Custom Handlers

```javascript
// Custom method in RequestManager
async customHandler(uri, options) {
    // Custom logic
    return this.request(uri, 'Post', options);
}
```

### Custom UI Screens

```javascript
// Extend Dashboard class
class CustomDashboard extends Dashboard {
    async showCustomScreen(player) {
        // Custom form logic
    }
}
```

### Custom Cache Strategies

```javascript
// Implement cache interface
class CustomCache {
    set(key, value, ttl) { }
    get(key) { }
    has(key) { }
    // ... other methods
}
```

## Testing Considerations

### Unit Testing
- Logger with mocked console
- ConfigManager with test configs
- Cache with TTL simulation
- Validators with invalid inputs

### Integration Testing
- RequestManager with mocked HttpClient
- Queue with priority ordering
- Retry logic with simulated failures
- Full request lifecycle

### Performance Testing
- Queue throughput with high concurrency
- Cache hit rates
- Memory usage with large history
- Response time under load

## Monitoring & Debugging

### Available Metrics
- Request count (total, success, failed)
- Response times (average, min, max)
- Cache hit rate
- Queue depth
- Active request count
- Error rate
- Last successful/failed request time

### Debug Logs
- Log level configuration
- Full request/response logging
- Retry attempts logging
- Error stack traces
- Performance metrics

### Health Checks
- Success rate classification
- System running status
- Queue processing status
- Response time monitoring
- Error trend analysis
