# MCProfile API Reference

Complete API reference for MCProfile plugin integration.

## 📡 MCProfile.io API Endpoints

### Base URL
```
https://api.mcprofile.io
```

### Authentication
- No API key required for public lookups
- Rate limited to protect service
- Standard HTTP headers recommended

---

## 🔌 Endpoints

### 1. Bedrock XUID Lookup

**Endpoint:** `GET /api/v1/bedrock/xuid/{xuid}`

**Parameters:**
- `xuid` (string, required) - 16-digit Bedrock XUID

**Example Request:**
```bash
curl -X GET "https://api.mcprofile.io/api/v1/bedrock/xuid/25332248730d7792"
```

**Success Response (200):**
```json
{
  "gamertag": "kobenetwork",
  "xuid": "25332248730d7792",
  "floodgateuid": "00000000-0000-0000-0009-000004ed8eb0",
  "icon": "https://images-eds-ssl.xboxlive.com/image?url=...",
  "gamescore": "14895",
  "accounttier": "Silver",
  "textureid": "5006a1a7340",
  "skin": "https://textures.minecraft.net/texture/5006a1a7340",
  "linked": true,
  "java_uuid": "cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee",
  "java_name": "jensco"
}
```

**Error Responses:**
```json
// 400 Bad Request
{ "error": "Invalid XUID format" }

// 404 Not Found
{ "error": "Profile not found" }

// 429 Too Many Requests
{ "error": "Rate limit exceeded" }
```

---

### 2. Bedrock Floodgate UID Lookup

**Endpoint:** `GET /api/v1/bedrock/fuid/{fuid}`

**Parameters:**
- `fuid` (string, required) - Floodgate UID (UUID format)

**Example Request:**
```bash
curl -X GET "https://api.mcprofile.io/api/v1/bedrock/fuid/00000000-0000-0000-0009-000004ed8eb0"
```

**Success Response (200):**
```json
{
  "gamertag": "kobenetwork",
  "xuid": "25332248730d7792",
  "floodgateuid": "00000000-0000-0000-0009-000004ed8eb0",
  "icon": "https://images-eds-ssl.xboxlive.com/image?url=...",
  "gamescore": "14895",
  "accounttier": "Silver",
  "textureid": "5006a1a7340",
  "skin": "https://textures.minecraft.net/texture/5006a1a7340",
  "linked": true,
  "java_uuid": "cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee",
  "java_name": "jensco"
}
```

---

### 3. Java UUID Lookup

**Endpoint:** `GET /api/v1/java/uuid/{uuid}`

**Parameters:**
- `uuid` (string, required) - Java UUID with or without hyphens

**Example Request:**
```bash
# With hyphens
curl -X GET "https://api.mcprofile.io/api/v1/java/uuid/cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee"

# Without hyphens
curl -X GET "https://api.mcprofile.io/api/v1/java/uuid/cb7a4c0ca7cd48468bdf477de8f5f3ee"
```

**Success Response (200):**
```json
{
  "username": "jensco",
  "uuid": "cb7a4c0c-a7cd-4846-8c6f-477de8f5d3ee",
  "skin": "http://textures.minecraft.net/texture/123",
  "cape": "http://textures.minecraft.net/texture/123",
  "linked": true,
  "bedrock_gamertag": "kobenetwork",
  "bedrock_xuid": 2533224873007792,
  "bedrock_fuid": "00000000-0000-0000-0009-000004ed8eb0"
}
```

---

## 📊 Response Structure

### Bedrock Profile Fields

| Field | Type | Description | Always Present |
|-------|------|-------------|-----------------|
| `gamertag` | string | Bedrock username | ✓ Yes |
| `xuid` | string | 16-digit Bedrock ID | ✓ Yes |
| `floodgateuid` | string | Floodgate UUID | ✓ Yes |
| `icon` | string | Profile icon URL | ✓ Yes |
| `gamescore` | string | Xbox gamescore | ✓ Yes |
| `accounttier` | string | Xbox account tier | ✓ Yes |
| `textureid` | string | Skin texture ID | ✓ Yes |
| `skin` | string | Skin texture URL | ✓ Yes |
| `linked` | boolean | Linked to Java account | ✓ Yes |
| `java_uuid` | string | Java UUID (if linked) | ✗ Conditional |
| `java_name` | string | Java username (if linked) | ✗ Conditional |

### Java Profile Fields

| Field | Type | Description | Always Present |
|-------|------|-------------|-----------------|
| `username` | string | Java username | ✓ Yes |
| `uuid` | string | Java UUID | ✓ Yes |
| `skin` | string | Skin texture URL | ✓ Yes |
| `cape` | string | Cape texture URL | ✓ Yes |
| `linked` | boolean | Linked to Bedrock account | ✓ Yes |
| `bedrock_gamertag` | string | Bedrock username (if linked) | ✗ Conditional |
| `bedrock_xuid` | number | Bedrock XUID (if linked) | ✗ Conditional |
| `bedrock_fuid` | string | Bedrock Floodgate UUID (if linked) | ✗ Conditional |

---

## 🔄 HTTP Methods

### GET Request
- Used for all profile lookups
- No request body
- Query parameters in URL

### Headers
```
Content-Type: application/json
User-Agent: MCProfile-BridgePlugin/2.0.0
```

---

## ⚡ Rate Limiting

**Limits:**
- 100 requests per minute (default)
- Can be increased in configuration
- Enforced per IP address

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1632345600
```

**When Limited:**
- HTTP Status: 429 Too Many Requests
- Retry after: Check `Retry-After` header

---

## 🔐 Error Handling

### Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Use response data |
| 400 | Bad Request | Check input format |
| 404 | Not Found | Profile doesn't exist |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Retry with backoff |
| 503 | Service Down | Retry later |

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Common Errors

```json
// Invalid XUID format
{
  "error": "Invalid XUID format",
  "code": "INVALID_XUID",
  "status": 400
}

// Profile not found
{
  "error": "Profile not found",
  "code": "NOT_FOUND",
  "status": 404
}

// Rate limited
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "status": 429
}
```

---

## 📝 Plugin Integration

### Making Requests

```javascript
// Using MCProfileAPI class
const api = new MCProfileAPI(config, logger);

// By XUID
const profile = await api.getProfileByXUID('25332248730d7792');

// By Floodgate UID
const profile = await api.getProfileByFloodgateUID('00000000-0000-0000-0009-000004ed8eb0');

// By Java UUID
const profile = await api.getProfileByJavaUUID('cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee');
```

### Error Handling

```javascript
try {
  const profile = await api.getProfileByXUID(xuid);
  // Handle success
} catch (error) {
  // error.message contains error details
  logger.error(`API Error: ${error.message}`);
}
```

### Retry Logic

The plugin automatically implements:
- Exponential backoff (2^n seconds)
- Configurable retry count
- Timeout handling
- Request queueing

---

## 🔌 Webhook Integration (Future)

**Planned for v2.1.0:**

```http
POST /webhooks/profile-lookup
```

**Payload:**
```json
{
  "event": "profile_lookup",
  "player": "username",
  "profile": { ... },
  "timestamp": "2025-11-21T10:30:00Z"
}
```

---

## 📊 Statistics & Monitoring

### API Statistics

```javascript
const stats = api.getStatus();
// Returns:
// {
//   endpoint: "https://api.mcprofile.io",
//   timeout: 10000,
//   retries: 3
// }
```

### Network Statistics

```javascript
const netStats = networkManager.getStats();
// Returns:
// {
//   totalRequests: 100,
//   successfulRequests: 98,
//   failedRequests: 2,
//   successRate: "98.00"
// }
```

---

## 🧪 Testing

### Python Test Script

```bash
python3 scripts/mcprofile-api-tester.py
```

Tests:
- API health
- XUID endpoint
- Floodgate UID endpoint
- Java UUID endpoint
- Error handling
- Rate limiting

### Manual Testing

```bash
# Test XUID endpoint
curl -X GET "https://api.mcprofile.io/api/v1/bedrock/xuid/25332248730d7792"

# Test health
curl -X GET "https://api.mcprofile.io/health"
```

---

## 📈 Performance Tips

1. **Use Caching**
   - Cache TTL: 3600 seconds (1 hour)
   - Reduces API calls significantly
   - LRU eviction prevents memory issues

2. **Batch Requests**
   - Group lookups when possible
   - Respect rate limiting
   - Use request queueing

3. **Connection Pooling**
   - Reuse connections
   - Max concurrent: 5 requests
   - Automatic queuing for overflow

4. **Monitor Metrics**
   - Track cache hit rate
   - Monitor API latency
   - Watch error rates

---

## 🔄 Compatibility

### Supported Minecraft Versions
- Bedrock Edition 1.19.0+
- All platforms (Windows, Mobile, Console)

### Supported Java Versions
- All versions with UUID support

### API Versioning
- Current: v1
- Backward compatible
- No deprecations

---

## 📚 Additional Resources

- [MCProfile.io Website](https://mcprofile.io/)
- [Plugin README.md](README.md)
- [Installation Guide](INSTALLATION.md)
- [Quick Start](QUICKSTART.md)

---

**Last Updated:** November 2025
**API Version:** v1
**Plugin Version:** 2.0.0
