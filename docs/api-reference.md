# API Reference

Complete documentation for all API endpoints in the Remix Webhook Handler project.

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [POST /api/webhook](#post-apiwebhook)
  - [GET /api/hello-world](#get-apihello-world)
  - [POST /api/hello-world](#post-apihello-world)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)
- [Examples](#examples)

## 🔍 Overview

The API provides three main endpoints for webhook handling and task management:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhook` | POST | Receive webhook payloads and trigger tasks |
| `/api/webhook` | GET | Get webhook endpoint information |
| `/api/hello-world` | GET | Manually trigger hello-world task |
| `/api/hello-world` | POST | Stream real-time task updates via SSE |

**Base URL**: `http://localhost:5173` (development) or your deployed domain

## 🔐 Authentication

Currently, the API endpoints do not require authentication. In production, you should implement:

- API key validation for webhook endpoints
- Rate limiting to prevent abuse
- Request signature verification for webhook security

## 🛠 Endpoints

### POST /api/webhook

Receives webhook payloads from external services and triggers background tasks.

#### Request

```http
POST /api/webhook
Content-Type: application/json

{
  "message": "Hello from external service",
  "user": "john_doe",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "custom": "payload"
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | `object` | Yes | Any valid JSON object |

#### Response

**Success (200)**:
```json
{
  "success": true,
  "taskId": "run_abc123def456",
  "message": "Webhook received and task triggered successfully",
  "receivedPayload": {
    "message": "Hello from external service",
    "user": "john_doe",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "custom": "payload"
    }
  }
}
```

**Error (400)**:
```json
{
  "error": "No payload provided"
}
```

**Error (500)**:
```json
{
  "error": "Failed to process webhook",
  "details": "Task trigger failed: Invalid configuration"
}
```

#### Example Usage

```bash
curl -X POST http://localhost:5173/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user_signup",
    "user_id": "12345",
    "email": "user@example.com"
  }'
```

```javascript
// JavaScript/TypeScript
const response = await fetch('/api/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event: 'user_signup',
    user_id: '12345',
    email: 'user@example.com'
  })
});

const result = await response.json();
console.log('Task ID:', result.taskId);
```

---

### GET /api/webhook

Returns information about the webhook endpoint.

#### Request

```http
GET /api/webhook
```

#### Response

```json
{
  "message": "Webhook endpoint ready",
  "method": "POST",
  "description": "Send a POST request with a JSON payload to trigger the hello-world task",
  "example": {
    "payload": "Your webhook data here"
  }
}
```

#### Example Usage

```bash
curl http://localhost:5173/api/webhook
```

---

### GET /api/hello-world

Manually triggers the hello-world task for testing purposes.

#### Request

```http
GET /api/hello-world
```

#### Response

```json
{
  "taskId": "run_xyz789abc123",
  "message": "Task triggered successfully. The task will complete in about 5 seconds.",
  "status": "triggered"
}
```

#### Example Usage

```bash
curl http://localhost:5173/api/hello-world
```

```javascript
// JavaScript/TypeScript
const response = await fetch('/api/hello-world');
const data = await response.json();
console.log('Task triggered:', data.taskId);
```

---

### POST /api/hello-world

Streams real-time updates for a specific task using Server-Sent Events (SSE).

#### Request

```http
POST /api/hello-world
Content-Type: application/json

{
  "taskId": "run_xyz789abc123"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | `string` | Yes | The task ID to monitor |

#### Response

**Content-Type**: `text/event-stream`

The response is a stream of Server-Sent Events with the following format:

```
data: {"status":"EXECUTING","message":null,"error":null,"timestamp":"2024-01-15T10:30:05.123Z"}

data: {"status":"COMPLETED","message":"Hello, James!","error":null,"timestamp":"2024-01-15T10:30:10.456Z"}
```

#### Event Data Schema

```typescript
interface TaskUpdate {
  status: "triggered" | "EXECUTING" | "COMPLETED" | "FAILED" | "ERROR";
  message?: string;
  error?: string;
  timestamp: string;
}
```

#### Status Values

| Status | Description |
|--------|-------------|
| `triggered` | Task has been queued |
| `EXECUTING` | Task is currently running |
| `COMPLETED` | Task finished successfully |
| `FAILED` | Task failed with an error |
| `ERROR` | System error occurred |

#### Example Usage

```bash
curl -X POST http://localhost:5173/api/hello-world \
  -H "Content-Type: application/json" \
  -d '{"taskId": "run_xyz789abc123"}'
```

```javascript
// JavaScript/TypeScript - EventSource approach
const eventSource = new EventSource('/api/hello-world');
eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Task status:', update.status);
  
  if (update.status === 'COMPLETED') {
    console.log('Result:', update.message);
    eventSource.close();
  }
};

// JavaScript/TypeScript - Fetch with streaming
const response = await fetch('/api/hello-world', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId: 'run_xyz789abc123' })
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      console.log('Update:', event);
    }
  }
}
```

## 📊 Response Formats

### Success Response

All successful API responses follow this general structure:

```typescript
interface SuccessResponse {
  success?: boolean;
  taskId?: string;
  message?: string;
  status?: string;
  [key: string]: any; // Additional endpoint-specific data
}
```

### Error Response

Error responses follow this structure:

```typescript
interface ErrorResponse {
  error: string;
  details?: string;
}
```

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Description | When it occurs |
|------|-------------|----------------|
| `200` | Success | Request processed successfully |
| `400` | Bad Request | Invalid request payload or missing required fields |
| `404` | Not Found | Endpoint not found |
| `500` | Internal Server Error | Server-side error or task trigger failure |

### Common Error Scenarios

#### 1. Invalid JSON Payload

**Request**:
```bash
curl -X POST /api/webhook \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

**Response** (400):
```json
{
  "error": "Invalid JSON payload"
}
```

#### 2. Missing Task ID

**Request**:
```bash
curl -X POST /api/hello-world \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response** (400):
```json
{
  "error": "Task ID required"
}
```

#### 3. Task Trigger Failure

**Response** (500):
```json
{
  "error": "Failed to process webhook",
  "details": "Trigger.dev connection failed"
}
```

## 📝 Examples

### Complete Webhook Flow

```javascript
// 1. Send webhook payload
const webhookResponse = await fetch('/api/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'order_created',
    order_id: 'ord_12345',
    customer_email: 'customer@example.com'
  })
});

const { taskId } = await webhookResponse.json();

// 2. Monitor task progress
const monitorResponse = await fetch('/api/hello-world', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId })
});

// 3. Process real-time updates
const reader = monitorResponse.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      
      switch (event.status) {
        case 'EXECUTING':
          console.log('Task is running...');
          break;
        case 'COMPLETED':
          console.log('Task completed:', event.message);
          return; // Exit the loop
        case 'FAILED':
          console.error('Task failed:', event.error);
          return;
      }
    }
  }
}
```

### React Component Integration

```typescript
// Example React hook for webhook + monitoring
function useWebhookTask() {
  const [status, setStatus] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const triggerWebhook = async (payload: any) => {
    try {
      // Trigger webhook
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const { taskId } = await response.json();
      
      // Monitor progress
      const monitorResponse = await fetch('/api/hello-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      
      const reader = monitorResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const event = JSON.parse(line.slice(6));
            setStatus(event.status);
            if (event.message) setMessage(event.message);
            if (event.error) setError(event.error);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return { triggerWebhook, status, message, error };
}
```

---

**Need more details?** Check the [Architecture Guide](./architecture.md) to understand how these endpoints work together, or the [Getting Started Guide](./getting-started.md) for setup instructions.