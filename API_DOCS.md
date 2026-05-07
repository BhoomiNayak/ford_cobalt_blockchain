# Ford Cobalt API — REST Specification

Base URL: `http://localhost:8000/api/v1`  
Auth: `Authorization: Bearer <jwt_token>` on all protected routes.

---

## Authentication

### POST `/auth/login`
```json
// Request
{ "email": "auditor@ford.com", "password": "secret123" }

// Response 200
{ "access_token": "eyJ...", "token_type": "bearer", "expires_in": 86400 }
```

### POST `/auth/register`
```json
// Request
{
  "email": "operator@mine.com",
  "password": "secure123",
  "full_name": "John Operator",
  "role": "operator",
  "organization": "Katanga Mining Co."
}
// Response 201: UserResponse
```

---

## Mines

### POST `/mines/register` 🔒 `admin|auditor`
```json
// Request
{
  "name": "Katanga Mine A",
  "country": "DRC",
  "coordinates": "-10.5,25.3",
  "operator_id": "OP-001",
  "operator_address": "0xAbCd...1234",
  "certifications": ["ISO14001", "RMI"],
  "metadata_ipfs_hash": "QmXxxx..."
}
// Response 201
{ "message": "Mine registered", "data": { "mine_id": "0x...", "tx_hash": "0x..." } }
```

### GET `/mines/{mineId}`
```json
// Response 200
{
  "mine_id": "0xabc...",
  "name": "Katanga Mine A",
  "country": "DRC",
  "coordinates": "-10.5,25.3",
  "operator_id": "OP-001",
  "operator_address": "0x...",
  "certifications": ["ISO14001"],
  "status": "ACTIVE",
  "registered_at": "2024-01-15T10:00:00Z",
  "last_audit_date": "2024-06-01T00:00:00Z",
  "metadata_ipfs_hash": "QmXxxx",
  "tx_hash": "0x..."
}
```

### GET `/mines/` — optional filters: `?status=ACTIVE&country=DRC`

### PUT `/mines/{mineId}/compliance` 🔒 `admin|auditor`
```json
// Request
{ "status": "ACTIVE", "audit_ipfs_hash": "QmReport...", "notes": "Passed 2024 audit" }
// status: PENDING | ACTIVE | SUSPENDED | REVOKED
```

---

## Batches

### POST `/batches/create` 🔒 `admin|auditor|operator`
```json
// Request
{
  "mine_id": "0xabc...",
  "extraction_date": "2024-06-01T06:00:00Z",
  "weight_kg": 5000,
  "purity_percent": 95.5,
  "geolocation": "-10.5,25.3",
  "photo_ipfs_hash": "QmPhoto..."
}
// Response 201
{ "message": "Batch created", "data": { "batch_id": "0x...", "tx_hash": "0x..." } }
```

### POST `/batches/{batchId}/custody` 🔒
```json
// Request
{
  "actor_id": "TRANS-001",
  "role": "TRANSPORTER",
  "location": "-8.0,20.0",
  "signature": "0x...",
  "notes": "Loaded at Kolwezi port"
}
// role: MINE | TRANSPORTER | PROCESSOR | REFINERY | MANUFACTURER
```

### GET `/batches/{batchId}/provenance`
```json
// Response 200: BatchResponse with full custody_chain array
{
  "batch_id": "0x...",
  "mine_id": "0x...",
  "extraction_date": "2024-06-01T06:00:00Z",
  "weight_kg": 5000,
  "purity_percent": 95.5,
  "geolocation": "-10.5,25.3",
  "status": "IN_TRANSIT",
  "custody_chain": [
    {
      "actor_id": "OP-001",
      "actor_address": "0x...",
      "role": "MINE",
      "timestamp": "2024-06-01T08:00:00Z",
      "location": "-10.5,25.3",
      "notes": "Extracted and sealed"
    },
    {
      "actor_id": "TRANS-001",
      "role": "TRANSPORTER",
      "timestamp": "2024-06-03T14:00:00Z",
      "location": "-8.0,20.0",
      "notes": "Loaded at port"
    }
  ],
  "created_at": "2024-06-01T07:00:00Z"
}
```

### GET `/batches/search`
Query params:
- `mine_id` — filter by mine
- `status` — EXTRACTED | IN_TRANSIT | PROCESSING | DELIVERED | REJECTED | FLAGGED
- `date_from`, `date_to` — ISO 8601
- `min_weight`, `max_weight` — kg
- `page` (default 1), `page_size` (default 20, max 100)

```json
// Response 200
{
  "items": [...],
  "total": 142,
  "page": 1,
  "page_size": 20,
  "pages": 8
}
```

---

## Shipments

### POST `/shipments/create` 🔒 `admin|auditor|operator`
```json
{
  "batch_id": "0x...",
  "origin": "Kolwezi, DRC",
  "destination": "Antwerp, Belgium",
  "carrier": "Maersk",
  "carrier_id": "MAERSK-001",
  "estimated_arrival": "2024-07-15T00:00:00Z",
  "container_id": "MSKU1234567"
}
```

### POST `/shipments/{shipmentId}/iot` — IoT device endpoint (no auth)
```json
{
  "timestamp": "2024-06-10T12:00:00Z",
  "temperature_c": 22.5,
  "humidity_percent": 45.0,
  "latitude": 5.3,
  "longitude": 3.8,
  "shock_g": 0.2,
  "device_id": "IOT-MSKU-001"
}
// Response includes alerts if readings are anomalous
```

### GET `/shipments/{shipmentId}/tracking`
Returns ShipmentResponse with last 20 IoT readings.

### PUT `/shipments/{shipmentId}/status`
Query param: `?new_status=DELIVERED`  
Values: `CREATED | IN_TRANSIT | CUSTOMS | DELIVERED | DELAYED`

---

## Compliance

### POST `/compliance/verify` 🔒 `admin|auditor`
```json
{
  "batch_id": "0x...",
  "labor_standards": true,
  "environmental_safety": true,
  "conflict_free": true,
  "documentation_valid": true,
  "audit_passed": true,
  "report_ipfs_hash": "QmReport...",
  "notes": "Physical audit completed June 2024"
}
// Response: { "message": "Compliance PASSED", "data": { "tx_hash": "0x...", "status": "PASSED" } }
```

### GET `/compliance/batches` 🔒 — optional `?status=PASSED`
### GET `/compliance/batch/{batchId}` — get single compliance record

---

## ESG Report

### GET `/esg/report` 🔒
Optional query: `?date_from=2024-01-01&date_to=2024-12-31`

```json
{
  "report_period": { "from": "2024-01-01T00:00:00", "to": "2024-12-31T00:00:00" },
  "generated_at": "2024-12-15T10:30:00",
  "mines": {
    "total": 12,
    "active": 9,
    "suspended": 2,
    "by_country": [
      { "country": "DRC", "count": 8 },
      { "country": "Zambia", "count": 4 }
    ]
  },
  "batches": {
    "total": 847,
    "total_weight_kg": 4235000,
    "average_purity_percent": 94.2
  },
  "compliance": {
    "passed": 801,
    "failed": 31,
    "pending": 15,
    "compliance_rate_percent": 96.3
  },
  "shipments": {
    "delivered": 712,
    "in_transit": 23
  },
  "esg_score": {
    "score": 87.4,
    "grade": "A",
    "components": {
      "compliance": 48.2,
      "mine_health": 22.5
    }
  }
}
```

---

## Error Responses

```json
// 400 Bad Request
{ "detail": "Mine not found or not active" }

// 401 Unauthorized
{ "detail": "Invalid token" }

// 403 Forbidden
{ "detail": "Role 'viewer' not permitted. Required: ['admin', 'auditor']" }

// 404 Not Found
{ "detail": "Batch not found" }

// 422 Validation Error
{ "detail": [{ "loc": ["body", "weight_kg"], "msg": "ensure this value is greater than 0" }] }

// 429 Rate Limited
{ "detail": "Rate limit exceeded" }
```
