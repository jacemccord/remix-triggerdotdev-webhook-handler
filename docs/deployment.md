# Deployment Guide

Complete guide for deploying the Remix Webhook Handler to production environments.

## 📋 Table of Contents

- [Overview](#overview)
- [Environment Configuration](#environment-configuration)
- [Trigger.dev Setup](#triggerdev-setup)
- [Docker Deployment](#docker-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [Production Considerations](#production-considerations)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## 🔍 Overview

This guide covers deploying the Remix Webhook Handler to production environments. The application is designed to be deployed as a containerized service with external Trigger.dev integration for background task processing.

### Deployment Architecture

```
Internet → Load Balancer → Application Instances → Trigger.dev Platform
    │            │              │                      │
    │            │              │                      ▼
    │            │              │               Task Processing
    │            │              │                      │
    │            ▼              ▼                      │
    │      SSL Termination  Environment Variables     │
    │            │              │                      │
    └────────────┴──────────────┴──────────────────────┘
                           │
                           ▼
                   Production Application
```

## 🔧 Environment Configuration

### Required Environment Variables

Create a production environment file or configure these variables in your deployment platform:

```bash
# Required: Trigger.dev Configuration
TRIGGER_SECRET_KEY="tr_prod_your_production_secret_key"
TRIGGER_PROJECT_ID="proj_your_production_project_id"

# Optional: Application Configuration
NODE_ENV="production"
PORT="3000"

# Optional: Security Configuration
API_SECRET_KEY="your_api_secret_for_webhook_validation"
WEBHOOK_SECRET="your_webhook_signature_secret"

# Optional: Monitoring
LOG_LEVEL="info"
ENABLE_METRICS="true"
```

### Environment Variable Descriptions

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TRIGGER_SECRET_KEY` | Yes | Production secret key from Trigger.dev | `tr_prod_abc123...` |
| `TRIGGER_PROJECT_ID` | Yes | Your Trigger.dev project ID | `proj_xyz789...` |
| `NODE_ENV` | No | Node.js environment | `production` |
| `PORT` | No | Application port (default: 3000) | `3000` |
| `API_SECRET_KEY` | No | Secret for API authentication | `your-secret-key` |
| `WEBHOOK_SECRET` | No | Secret for webhook signature validation | `webhook-secret` |
| `LOG_LEVEL` | No | Logging level | `info`, `warn`, `error` |

### Security Best Practices

1. **Never commit secrets to version control**
2. **Use environment-specific secret management**
3. **Rotate secrets regularly**
4. **Use least-privilege access principles**

## 🚀 Trigger.dev Setup

### 1. Create Production Project

1. Log in to [Trigger.dev Dashboard](https://cloud.trigger.dev)
2. Create a new project for production
3. Note the project ID and secret key
4. Configure environment variables

### 2. Deploy Tasks to Trigger.dev

```bash
# Install Trigger.dev CLI
npm install -g @trigger.dev/cli

# Login to Trigger.dev
npx trigger.dev login

# Deploy tasks to production
npx trigger.dev deploy --env production
```

### 3. Verify Task Deployment

```bash
# List deployed tasks
npx trigger.dev list tasks --env production

# Test task execution
npx trigger.dev test hello-world --env production
```

## 🐳 Docker Deployment

### Using the Provided Dockerfile

The project includes a multi-stage [`Dockerfile`](../Dockerfile) optimized for production:

```dockerfile
# Build the application
docker build -t remix-webhook-handler .

# Run with environment variables
docker run -d \
  --name webhook-handler \
  -p 3000:3000 \
  -e TRIGGER_SECRET_KEY="tr_prod_your_key" \
  -e TRIGGER_PROJECT_ID="proj_your_id" \
  remix-webhook-handler
```

### Docker Compose for Production

Create a `docker-compose.prod.yml` file:

```yaml
version: '3.8'

services:
  webhook-handler:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TRIGGER_SECRET_KEY=${TRIGGER_SECRET_KEY}
      - TRIGGER_PROJECT_ID=${TRIGGER_PROJECT_ID}
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/webhook"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - webhook-handler
    restart: unless-stopped
```

### Deploy with Docker Compose

```bash
# Create environment file
echo "TRIGGER_SECRET_KEY=tr_prod_your_key" > .env.prod
echo "TRIGGER_PROJECT_ID=proj_your_id" >> .env.prod

# Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f webhook-handler
```

## ☁️ Cloud Platform Deployment

### AWS ECS (Elastic Container Service)

#### 1. Create Task Definition

```json
{
  "family": "remix-webhook-handler",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "webhook-handler",
      "image": "your-account.dkr.ecr.region.amazonaws.com/remix-webhook-handler:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "TRIGGER_SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:trigger-secret-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/remix-webhook-handler",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 2. Deploy to ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin account.dkr.ecr.us-east-1.amazonaws.com

docker build -t remix-webhook-handler .
docker tag remix-webhook-handler:latest account.dkr.ecr.us-east-1.amazonaws.com/remix-webhook-handler:latest
docker push account.dkr.ecr.us-east-1.amazonaws.com/remix-webhook-handler:latest

# Create ECS service
aws ecs create-service \
  --cluster production-cluster \
  --service-name webhook-handler \
  --task-definition remix-webhook-handler:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

### Google Cloud Run

#### 1. Deploy to Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/remix-webhook-handler

gcloud run deploy webhook-handler \
  --image gcr.io/PROJECT-ID/remix-webhook-handler \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets TRIGGER_SECRET_KEY=trigger-secret:latest \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

#### 2. Configure Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service webhook-handler \
  --domain webhooks.yourdomain.com \
  --region us-central1
```

### Azure Container Apps

#### 1. Create Container App

```bash
# Create resource group
az group create --name webhook-handler-rg --location eastus

# Create container app environment
az containerapp env create \
  --name webhook-handler-env \
  --resource-group webhook-handler-rg \
  --location eastus

# Deploy container app
az containerapp create \
  --name webhook-handler \
  --resource-group webhook-handler-rg \
  --environment webhook-handler-env \
  --image your-registry.azurecr.io/remix-webhook-handler:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars NODE_ENV=production \
  --secrets trigger-secret-key=tr_prod_your_key \
  --env-vars TRIGGER_SECRET_KEY=secretref:trigger-secret-key
```

### Vercel (Serverless)

#### 1. Configure for Vercel

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add TRIGGER_SECRET_KEY production
vercel env add TRIGGER_PROJECT_ID production
```

## 🔒 Production Considerations

### Security Hardening

#### 1. Implement Authentication

```typescript
// middleware/auth.ts
export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validKey = process.env.API_SECRET_KEY;
  
  return apiKey === validKey;
}

// Apply to webhook routes
export async function action({ request }: { request: Request }) {
  if (!validateApiKey(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of handler
}
```

#### 2. Webhook Signature Verification

```typescript
// utils/webhook-security.ts
import crypto from 'crypto';

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}
```

#### 3. Rate Limiting

```typescript
// middleware/rate-limit.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(clientIP: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (clientData.count >= limit) {
    return false;
  }
  
  clientData.count++;
  return true;
}
```

### Performance Optimization

#### 1. Enable Compression

```typescript
// Add to your server configuration
app.use(compression());
```

#### 2. Implement Caching

```typescript
// Cache static responses
const cache = new Map();

export async function loader() {
  const cacheKey = 'webhook-info';
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const response = Response.json({
    message: "Webhook endpoint ready",
    // ... other data
  });
  
  cache.set(cacheKey, response);
  return response;
}
```

#### 3. Health Checks

```typescript
// app/routes/health.ts
export async function loader() {
  try {
    // Check database connectivity, external services, etc.
    const isHealthy = await checkSystemHealth();
    
    if (isHealthy) {
      return Response.json({ status: 'healthy' }, { status: 200 });
    } else {
      return Response.json({ status: 'unhealthy' }, { status: 503 });
    }
  } catch (error) {
    return Response.json({ status: 'error', error: error.message }, { status: 503 });
  }
}

async function checkSystemHealth(): Promise<boolean> {
  // Implement your health checks
  return true;
}
```

## 📊 Monitoring & Maintenance

### Application Monitoring

#### 1. Logging Configuration

```typescript
// utils/logger.ts
import { logger } from "@trigger.dev/sdk/v3";

export const appLogger = {
  info: (message: string, meta?: any) => {
    logger.log(message, meta);
    console.log(`[INFO] ${message}`, meta);
  },
  error: (message: string, error?: Error) => {
    logger.error(message, { error: error?.message, stack: error?.stack });
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
    console.warn(`[WARN] ${message}`, meta);
  }
};
```

#### 2. Metrics Collection

```typescript
// utils/metrics.ts
class MetricsCollector {
  private metrics = new Map<string, number>();
  
  increment(metric: string, value = 1) {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }
  
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

export const metrics = new MetricsCollector();

// Usage in routes
export async function action({ request }: { request: Request }) {
  metrics.increment('webhook.received');
  
  try {
    // ... process webhook
    metrics.increment('webhook.success');
  } catch (error) {
    metrics.increment('webhook.error');
    throw error;
  }
}
```

### External Monitoring

#### 1. Uptime Monitoring

Set up external monitoring services to check:
- Application availability (`GET /health`)
- Webhook endpoint responsiveness (`GET /api/webhook`)
- Response times and error rates

#### 2. Log Aggregation

Configure log forwarding to services like:
- **AWS CloudWatch Logs**
- **Google Cloud Logging**
- **Azure Monitor Logs**
- **Datadog**
- **New Relic**

#### 3. Alerting

Set up alerts for:
- High error rates (>5% in 5 minutes)
- Response time degradation (>2s average)
- Task failure rates in Trigger.dev
- Resource utilization (CPU >80%, Memory >90%)

### Backup and Recovery

#### 1. Configuration Backup

```bash
# Backup environment configuration
kubectl get configmap webhook-config -o yaml > backup/config-$(date +%Y%m%d).yaml

# Backup secrets (encrypted)
kubectl get secret webhook-secrets -o yaml > backup/secrets-$(date +%Y%m%d).yaml
```

#### 2. Disaster Recovery Plan

1. **Application Recovery**: Redeploy from container registry
2. **Configuration Recovery**: Restore from backed-up configurations
3. **Task Recovery**: Trigger.dev handles task persistence
4. **Data Recovery**: Restore any persistent data from backups

## 🐛 Troubleshooting

### Common Issues

#### 1. Task Trigger Failures

**Symptoms**: Webhooks receive 500 errors, tasks not executing

**Diagnosis**:
```bash
# Check Trigger.dev connectivity
curl -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  https://api.trigger.dev/api/v1/projects/$TRIGGER_PROJECT_ID/runs

# Check application logs
docker logs webhook-handler
```

**Solutions**:
- Verify `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_ID`
- Check Trigger.dev service status
- Ensure tasks are deployed to production environment

#### 2. SSE Connection Issues

**Symptoms**: Real-time updates not working, connection timeouts

**Diagnosis**:
```bash
# Test SSE endpoint
curl -N -H "Accept: text/event-stream" \
  -X POST http://your-domain/api/hello-world \
  -d '{"taskId":"test-task-id"}'
```

**Solutions**:
- Check load balancer timeout settings
- Verify SSE headers are properly set
- Ensure task ID is valid

#### 3. High Memory Usage

**Symptoms**: Container restarts, out-of-memory errors

**Diagnosis**:
```bash
# Monitor memory usage
docker stats webhook-handler

# Check for memory leaks
node --inspect app.js
```

**Solutions**:
- Increase container memory limits
- Implement connection cleanup in SSE handlers
- Add memory monitoring and alerts

#### 4. SSL/TLS Issues

**Symptoms**: HTTPS errors, certificate warnings

**Solutions**:
- Verify SSL certificate validity
- Check certificate chain completeness
- Ensure proper SSL termination configuration

### Debug Mode

Enable debug logging in production (temporarily):

```bash
# Set debug environment variable
export LOG_LEVEL=debug
export DEBUG=trigger:*

# Restart application
docker-compose restart webhook-handler
```

### Performance Debugging

```typescript
// Add performance monitoring
export async function action({ request }: { request: Request }) {
  const startTime = Date.now();
  
  try {
    // ... process request
    const duration = Date.now() - startTime;
    appLogger.info('Request processed', { duration, endpoint: 'webhook' });
  } catch (error) {
    const duration = Date.now() - startTime;
    appLogger.error('Request failed', { duration, error: error.message });
    throw error;
  }
}
```

## 📚 Additional Resources

- [React Router Deployment Guide](https://reactrouter.com/en/main/guides/deployment)
- [Trigger.dev Production Guide](https://trigger.dev/docs/documentation/guides/deployment)
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Deployment Complete!** Your Remix Webhook Handler is now ready for production use. Monitor the application closely during the first few days and adjust resources as needed based on actual usage patterns.