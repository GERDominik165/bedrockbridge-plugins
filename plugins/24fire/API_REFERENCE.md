# 24FIRE API Reference

Vollständige Dokumentation aller 25+ API-Endpoints der 24fire REST-API v2.

## 🔗 API-Basis-URL

```
https://manage.24fire.de
```

## 🔑 Authentifizierung

Alle Anfragen benötigen einen API-Key im Header:

```
X-Fire-Apikey: your-api-key-here
```

## 📋 Inhalt

1. [Account Endpoints](#account-endpoints)
2. [Domain Endpoints](#domain-endpoints)
3. [KVM Endpoints](#kvm-endpoints)
4. [Webspace Endpoints](#webspace-endpoints)
5. [Response Codes](#response-codes)
6. [Error Handling](#error-handling)

---

## Account Endpoints

### GET /api/account

**Konto-Informationen abrufen**

```javascript
const data = await api.getAccountDetails();
```

**Response:**
```json
{
  "id": 1,
  "firstname": "Lars",
  "lastname": "Kiefer",
  "email": "user@example.de",
  "profile_image": "https://...",
  "balance": 240.42,
  "is_plus_user": true,
  "registry_date": "2022-02-26T17:33:52.000Z",
  "discord_id": null,
  "invoice_address": {
    "name": "Name",
    "street": "Straße",
    "number": "123",
    "zip": "12345",
    "city": "Stadt",
    "country": "Deutschland"
  }
}
```

---

### GET /api/account/services

**Alle aktiven Dienste abrufen**

```javascript
const services = await api.getAccountServices();
```

**Response:**
```json
{
  "services": {
    "WEBSPACE": [
      {
        "internal_id": "uuid",
        "name": "Plesk-Medium",
        "accounting": {
          "buy_date": "2023-03-05T17:40:03.000Z",
          "buy_price": 3.5,
          "renew_date": "2025-01-30T00:00:00.000Z",
          "renew_price": 3.5,
          "renew_interval": 30,
          "auto_renew": false
        },
        "username": "user123",
        "email": "user@example.de"
      }
    ],
    "KVM": [
      {
        "internal_id": "uuid",
        "name": "EPYC 01",
        "accounting": { /* ... */ }
      }
    ],
    "DOMAIN": [
      {
        "internal_id": "uuid",
        "name": "example.de",
        "accounting": { /* ... */ },
        "target": "example.de"
      }
    ]
  }
}
```

---

### GET /api/account/donations

**Spendenseite-Daten abrufen**

```javascript
const donations = await api.getAccountDonations();
```

**Response:**
```json
{
  "information": {
    "enabled": true,
    "description": "Meine Spenden-Seite",
    "link": "https://24fi.re/d/...",
    "background_image": "https://..."
  },
  "bundles": [
    {
      "name": "Premium",
      "description": "Premium Vorteile",
      "price": 10.0,
      "input_field": "Spielername"
    }
  ],
  "donations": [
    {
      "id": "40d8ce64",
      "date": "2024-12-23T16:07:15.000Z",
      "donator": "Name",
      "amount": 5.0,
      "bundle": null,
      "status": "open|paid"
    }
  ]
}
```

---

### GET /api/account/affiliate

**Affiliate-System Daten abrufen**

```javascript
const affiliate = await api.getAccountAffiliate();
```

**Response:**
```json
{
  "information": {
    "link": "https://24fi.re/ref/..."
  },
  "summary": {
    "confirmed_leads": 4,
    "url_clicks": 3,
    "balance_paid": 70.0,
    "balance_pending": 0.0
  },
  "leads": [
    {
      "customer": "f. a.",
      "date": "2023-12-26T20:44:50.000Z",
      "buy_price": 16.0,
      "product_name": "Intel Xeon KVM-Server",
      "status": "confirmed|canceled"
    }
  ]
}
```

---

## Domain Endpoints

### GET /api/domain/:internal_id

**Domain-Informationen abrufen**

```javascript
const domain = await api.getDomainInfo(internalId);
```

**URL-Parameter:**
| Name | Typ | Beschreibung |
|------|-----|-------------|
| internal_id | string | UUID aus /api/account/services |

**Response:**
```json
{
  "domain": {
    "name": "example.de",
    "sld": "example",
    "tld": "de",
    "authcode": "AUTH123...",
    "status": "LOCK|UNLOCK|etc",
    "terminated": false
  },
  "handle": {
    "ownerC": "FIRE24XX",
    "adminC": "FIRE24XX",
    "techC": "FIRE24XX",
    "zoneC": "FIRE24XX"
  },
  "nameserver": {
    "ns1": "ns1.fireapi.de",
    "ns2": "ns2.fireapi.de",
    "ns3": null,
    "ns4": null,
    "ns5": null
  },
  "timings": {
    "create": "2023-03-14 15:53:44",
    "expire": "2024-03-14 15:53:44"
  }
}
```

---

### GET /api/domain/:internal_id/dns

**DNS-Einträge abrufen**

```javascript
const dnsRecords = await api.getDomainDNS(internalId);
```

**Response:**
```json
[
  {
    "record_id": 7498384,
    "type": "A|AAAA|CNAME|MX|TXT|NS|SRV|CAA",
    "name": "subdomain",
    "data": "value",
    "ttl": 300
  }
]
```

---

### PUT /api/domain/:internal_id/dns/add

**DNS-Eintrag hinzufügen** (24fire+ erforderlich)

```javascript
await api.addDNSRecord(internalId, type, name, data);
```

**Parameter:**
| Name | Typ | Erforderlich | Beschreibung |
|------|-----|-------------|-------------|
| type | enum | Ja | A, AAAA, CNAME, MX, TXT, NS, SRV, CAA |
| name | string | Ja | Name/Subdomain (z.B. "*" oder "www") |
| data | string | Ja | Wert des Eintrags (z.B. IP-Adresse) |

**Beispiel:**
```javascript
await api.addDNSRecord(internalId, 'A', 'www', '192.168.1.1');
await api.addDNSRecord(internalId, 'MX', '@', 'mail.example.de');
await api.addDNSRecord(internalId, 'TXT', '_acme', 'validation-token');
```

---

### POST /api/domain/:internal_id/dns/edit

**DNS-Eintrag bearbeiten** (24fire+ erforderlich)

```javascript
await api.editDNSRecord(internalId, recordId, type, name, data);
```

**Parameter:**
| Name | Typ | Erforderlich | Beschreibung |
|------|-----|-------------|-------------|
| record_id | string | Ja | ID des zu bearbeitenden Eintrags |
| type | enum | Nein | Neuer Record-Typ |
| name | string | Nein | Neuer Name |
| data | string | Nein | Neuer Wert |

**Beispiel:**
```javascript
// Nur Wert ändern
await api.editDNSRecord(internalId, recordId, null, null, '192.168.1.2');

// Name ändern
await api.editDNSRecord(internalId, recordId, null, 'api', null);

// Alles ändern
await api.editDNSRecord(internalId, recordId, 'CNAME', 'cdn', 'cdn.example.de');
```

---

### DELETE /api/domain/:internal_id/dns/remove

**DNS-Eintrag löschen** (24fire+ erforderlich)

```javascript
await api.deleteDNSRecord(internalId, recordId);
```

**Parameter:**
| Name | Typ | Beschreibung |
|------|-----|-------------|
| record_id | string | ID des zu löschenden Eintrags |

---

## KVM Endpoints

### GET /api/kvm/:internal_id/status

**Server-Status abrufen**

```javascript
const status = await api.getKVMStatus(internalId);
```

**Response:**
```json
{
  "status": "running|stopped|paused",
  "uptime": 545,
  "task": "backup|restore|null",
  "usage": {
    "cpu": { "data": "12.5", "unit": "%" },
    "mem": { "data": "512.3", "unit": "MB" },
    "nvme_storage": { "data": 50.2, "unit": "GB" }
  }
}
```

---

### GET /api/kvm/:internal_id/config

**Server-Konfiguration abrufen**

```javascript
const config = await api.getKVMConfig(internalId);
```

**Response:**
```json
{
  "identifier": 30075,
  "hostsystem": {
    "datacenter": {
      "name": "SkyLink Data Center BV",
      "country": "Niederlande",
      "city": "Eygelshoven"
    },
    "name": "nl_xeon",
    "node": "XEON 09",
    "processor": "Intel(R) Xeon(R) CPU E5-2690 v2 @ 3.00GHz",
    "memory": "DDR3 1600 MHz",
    "nvme_hard_drives": "Samsung SSD PM9A3"
  },
  "config": {
    "cores": 10,
    "mem": 2048,
    "disk": 10,
    "os": { "name": "debian_11", "displayname": "Debian 11" },
    "iso": { "name": "proxmox_8", "displayname": "Proxmox 8", "attached": true },
    "username": "root",
    "password": "***",
    "hostname": "KVM",
    "network_speed": 1000,
    "backup_slots": 2,
    "ipv4": [
      {
        "ip_address": "88.151.194.252",
        "ip_gateway": "88.151.194.1",
        "ddos_protection": "enabled",
        "rdns": "example.de"
      }
    ],
    "ipv6": [
      {
        "ip_address": "2a12:8641:7::1/64",
        "ip_gateway": "2a12:8641:7::1"
      }
    ],
    "monitoring": { "enabled": true, "port": 22 }
  },
  "max_config": {
    "cores": 12,
    "mem": 65536,
    "disk": 300,
    "network_speed": 3000,
    "backup_slots": 10,
    "ipv4": 6
  },
  "abuse_status": "CLEAN|WARNING|SUSPENDED"
}
```

---

### POST /api/kvm/:internal_id/power

**Server Power Control**

```javascript
await api.setKVMPower(internalId, 'start|stop|restart');
```

**Body-Parameter:**
| Name | Typ | Werte | Beschreibung |
|------|-----|-------|-------------|
| mode | enum | start, stop, restart, kill, pause, resume | Power-Aktion |

---

## Backup Endpoints

### GET /api/kvm/:internal_id/backup/list

**Backup-Liste abrufen**

```javascript
const backups = await api.getKVMBackups(internalId);
```

**Response:**
```json
[
  {
    "backup_id": "uuid",
    "backup_os": "debian_11",
    "backup_description": "Weekly Backup",
    "size": 583.31,
    "created": "2023-06-15T16:15:04.000Z",
    "status": "finished|pending|failed"
  }
]
```

---

### POST /api/kvm/:internal_id/backup/create

**Neues Backup erstellen** (24fire+ erforderlich)

```javascript
const backup = await api.createKVMBackup(internalId, 'Beschreibung');
```

**Body-Parameter:**
| Name | Typ | Max. Länge | Beschreibung |
|------|-----|-----------|-------------|
| description | string | 24 | Backup-Beschreibung |

**Erlaubte Zeichen:** a-z, A-Z, ä, ö, ü, ß, Leerzeichen, -, _, +, #, (), .

**Response:**
```json
{
  "backup_id": "c3926441-3d91-4124-9c46-1d699a08ceda"
}
```

---

### POST /api/kvm/:internal_id/backup/create/status

**Backup-Erstellungs-Status abrufen** (24fire+ erforderlich)

```javascript
const status = await api.getBackupStatus(internalId, backupId);
```

**Body-Parameter:**
| Name | Typ | Beschreibung |
|------|-----|-------------|
| backup_id | string | UUID des Backups |

**Response (läuft noch):**
```json
{
  "status": "pending|finished|failed",
  "progress": {
    "percentage": 14,
    "data_stored": 1.4,
    "total_data": 10
  }
}
```

---

### POST /api/kvm/:internal_id/backup/restore

**Backup wiederherstellen** (24fire+ erforderlich)

```javascript
await api.restoreBackup(internalId, backupId);
```

**Body-Parameter:**
| Name | Typ | Beschreibung |
|------|-----|-------------|
| backup_id | string | UUID des wiederherzustellenden Backups |

⚠️ **Warnung:** Überschreibt aktuelle VM-Daten!

---

### DELETE /api/kvm/:internal_id/backup/delete

**Backup löschen** (24fire+ erforderlich)

```javascript
await api.deleteBackup(internalId, backupId);
```

⚠️ **Warnung:** Gelöschte Backups können nicht wiederhergestellt werden!

---

## Traffic Endpoints

### GET /api/kvm/:internal_id/traffic/current

**Aktuellen Traffic abrufen**

```javascript
const traffic = await api.getKVMTraffic(internalId);
```

**Response:**
```json
{
  "month": "JUNE",
  "usage": {
    "total": 7.12,
    "in": 6.53,
    "out": 0.59
  },
  "limit": {
    "monthly": 1000.0,
    "additional": null,
    "remaining": 994.06,
    "vm_status": "normal|throttled"
  }
}
```

---

### GET /api/kvm/:internal_id/traffic/log

**Traffic-Logs abrufen**

```javascript
const logs = await api.getKVMTrafficLog(internalId);
```

**Hinweis:** Messungen alle 10 Minuten

**Response:**
```json
{
  "month": "JUNE",
  "log": [
    {
      "date": "2024-05-31T22:01:11.285Z",
      "in": 1.681,
      "out": 0.0349
    }
  ]
}
```

---

## Monitoring Endpoints

### GET /api/kvm/:internal_id/monitoring/timings

**Monitoring-Messungen abrufen** (24fire+ erforderlich)

```javascript
const timings = await api.getKVMMonitoring(internalId);
```

**Hinweis:** Alle 10 Minuten, max. 30 Tage

**Response:**
```json
{
  "timings": [
    {
      "date": "2024-01-03T22:34:02.000Z",
      "cpu": "0.481",
      "mem": "1.261",
      "ping": 19
    }
  ]
}
```

---

### GET /api/kvm/:internal_id/monitoring/incidences

**Ausfälle/Incidents abrufen** (24fire+ erforderlich)

```javascript
const incidents = await api.getKVMIncidents(internalId);
```

**Response:**
```json
{
  "statistic": {
    "LAST_24_HOURS": {
      "downtime": 11,
      "availability": 99.6885,
      "incidences": 1,
      "longest_incidence": 11,
      "average_incidence": 11.21
    },
    "LAST_7_DAYS": { /* ... */ },
    "LAST_30_DAYS": { /* ... */ }
  },
  "incidences": [
    {
      "start": "2024-01-16T13:46:02.000Z",
      "end": null,
      "downtime": 11,
      "type": "PING_TIMEOUT|VM_STOPPED"
    }
  ]
}
```

---

## DDoS Endpoints

### GET /api/kvm/:internal_id/ddos

**DDoS-Einstellungen abrufen**

```javascript
const ddos = await api.getKVMDDoSSettings(internalId);
```

**Response:**
```json
{
  "88.151.194.252": {
    "layer4": "dynamic|permanent|off",
    "layer7": "on|off"
  }
}
```

---

### POST /api/kvm/:internal_id/ddos/change

**DDoS-Einstellungen ändern** (24fire+ erforderlich)

```javascript
await api.setKVMDDoSSettings(internalId, layer4, layer7, ipAddress);
```

**Body-Parameter:**
| Name | Typ | Werte | Beschreibung |
|------|-----|-------|-------------|
| layer4 | enum | dynamic, permanent, off | Layer 4 Schutz |
| layer7 | enum | on, off | Layer 7 Schutz |
| ip_address | string | optional | Spezifische IP (alle wenn nicht angegeben) |

---

## Webspace Endpoints

### GET /api/webspace/:internal_id

**Webspace-Informationen abrufen**

```javascript
const webspace = await api.getWebspaceInfo(internalId);
```

**Response:**
```json
{
  "accounting": {
    "buy_date": "2023-04-04T00:17:33.000Z",
    "buy_price": 1.35,
    "renew_date": "2025-01-30T00:00:00.000Z",
    "renew_price": 1.5,
    "renew_interval": 30,
    "auto_renew": false
  },
  "resources": {
    "domains": 1,
    "subdomains": 5,
    "emails": 3,
    "databases": 3,
    "ssd_storage": 5,
    "traffic": 500,
    "memory_limit": 128,
    "ip_address": "45.84.196.164"
  },
  "access": {
    "host": "plesk.24fire.de:8443",
    "email": "user@example.de",
    "username": "user123",
    "password": "***"
  }
}
```

---

## Response Codes

| Code | Bedeutung | Beispiel |
|------|-----------|----------|
| 200 | OK | Request erfolgreich |
| 400 | Bad Request | Ungültige Parameter |
| 401 | Unauthorized | API-Key ungültig/fehlend |
| 403 | Forbidden | Keine Berechtigung (24fire+ erforderlich) |
| 404 | Not Found | Ressource nicht gefunden |
| 429 | Too Many Requests | Rate Limit überschritten |
| 500 | Server Error | 24fire Server-Problem |
| 503 | Service Unavailable | 24fire Wartung |

---

## Error Handling

### Standard Error Response

```json
{
  "status": "error",
  "message": "Fehlerbeschreibung",
  "code": "ERROR_CODE"
}
```

### Retry-Strategie

```javascript
const maxRetries = 3;
const retryDelay = 1000; // 1 Sekunde

for (let i = 0; i < maxRetries; i++) {
  try {
    return await api.makeRequest(...);
  } catch (error) {
    if (i < maxRetries - 1) {
      await new Promise(r => setTimeout(r, retryDelay * (i + 1)));
    }
  }
}
```

### Rate Limit Handling

```javascript
// Automatisch mit exponentiellem Backoff
if (error.message.includes('429')) {
  await sleep(retryDelay * Math.pow(2, attempt));
}
```

---

## Caching-Strategien

```javascript
// Cache für Read-Operationen (GET)
const account = await api.getAccountDetails(); // cached 5 Min

// Kein Cache für Write-Operationen
await api.addDNSRecord(...); // kein Cache

// Cache-Expiration erzwingen
api.clearCache('account');
api.clearCache(); // Clear all
```

---

## Rate Limiting

- **Limit:** 120 Anfragen pro Minute
- **Retry:** Automatisch nach exponentiellem Backoff
- **Compliance:** 24fire API-Spezifikation

---

## Häufig verwendete Parameter

### DNS Record Types

```
A       - IPv4 Adresse
AAAA    - IPv6 Adresse
CNAME   - Alias
MX      - Mail Exchange
TXT     - Text Record
NS      - Nameserver
SRV     - Service Record
CAA     - Certificate Authority
```

### Power Modes

```
start       - Server starten
stop        - Elegant stoppen
restart     - Neustart
kill        - Force Stop
pause       - Pausieren
resume      - Fortsetzen
```

### DDoS Layer 4

```
off         - Deaktiviert
dynamic     - Dynamischer Schutz
permanent   - Permanenter Schutz
```

---

## Beispiele

### Kompletter Workflow

```javascript
// 1. Account-Info
const account = await api.getAccountDetails();
console.log(`Guthaben: ${account.balance}€`);

// 2. Dienste auflisten
const services = await api.getAccountServices();

// 3. Domain-Details
const domain = await api.getDomainInfo(services.services.DOMAIN[0].internal_id);

// 4. DNS-Einträge
const dns = await api.getDomainDNS(domain.domain.id);

// 5. KVM-Status
const kvmStatus = await api.getKVMStatus(services.services.KVM[0].internal_id);
```

---

## Best Practices

1. **Caching nutzen** - Reduziert API-Aufrufe
2. **Error Handling** - Immer try-catch verwenden
3. **Rate Limiting** - Beachten und implementieren
4. **Timeouts** - Setzen für alle Anfragen
5. **Logging** - Alle wichtigen Operationen loggen
6. **Validation** - Input validieren vor API-Aufruf
7. **API-Key sicher** - Nie in Quellcode speichern
8. **Monitoring** - Aufrufe und Fehler tracken

---

Weitere Informationen unter: https://manage.24fire.de/api
