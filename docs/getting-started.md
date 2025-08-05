# Getting Started

This guide will walk you through setting up and running the Remix Webhook Handler project from scratch.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 20 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)
- **Trigger.dev Account** (free account at [trigger.dev](https://trigger.dev))

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd remix-webhook-handler-test
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- React Router 7 for the web framework
- Trigger.dev SDK for background task processing
- TailwindCSS for styling
- TypeScript for type safety

### 3. Set Up Trigger.dev

#### Create a Trigger.dev Account
1. Visit [trigger.dev](https://trigger.dev) and create a free account
2. Create a new project in your Trigger.dev dashboard
3. Note your project ID and secret key

#### Configure Environment Variables
Create a `.env.local` file in the project root:

```bash
# Required: Your Trigger.dev secret key
TRIGGER_SECRET_KEY="tr_dev_your_secret_key_here"

# Optional: Your Trigger.dev project ID (already configured in trigger.config.ts)
TRIGGER_PROJECT_ID="proj_your_project_id_here"
```

> **Important**: Never commit your `.env.local` file to version control. It's already included in `.gitignore`.

### 4. Update Trigger Configuration

Edit [`trigger.config.ts`](../trigger.config.ts) to use your project ID:

```typescript
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_your_project_id_here", // Replace with your project ID
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});
```

## 🏃‍♂️ Running the Application

### Development Mode

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### What You'll See

1. **Home Page**: Navigate to the root URL to see the welcome page
2. **Realtime Demo**: Interactive component for testing task execution
3. **API Endpoints**: Available at `/api/webhook` and `/api/hello-world`

## 🧪 Testing the Setup

### 1. Test the Hello World Task

Visit `http://localhost:5173` and use the "Trigger Hello World Task" button in the Realtime Demo component. You should see:

1. Task triggered successfully
2. Real-time status updates
3. Completion message after ~5 seconds

### 2. Test the Webhook Endpoint

#### Using curl:
```bash
# Test webhook endpoint
curl -X POST http://localhost:5173/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from webhook!", "user": "test-user"}'
```

#### Expected Response:
```json
{
  "success": true,
  "taskId": "run_abc123...",
  "message": "Webhook received and task triggered successfully",
  "receivedPayload": {
    "message": "Hello from webhook!",
    "user": "test-user"
  }
}
```

### 3. Test Manual Task Triggering

```bash
# Trigger task manually
curl http://localhost:5173/api/hello-world
```

## 📁 Project Structure Overview

```
remix-webhook-handler-test/
├── app/                          # React Router application
│   ├── components/
│   │   └── RealtimeDemo.tsx     # Real-time task monitoring component
│   ├── routes/
│   │   ├── api.webhook.ts       # Webhook handler endpoint
│   │   ├── api.hello-world.ts   # Manual task trigger + SSE endpoint
│   │   └── home.tsx             # Home page with demo
│   └── root.tsx                 # App root component
├── src/
│   └── trigger/
│       └── example.ts           # Trigger.dev task definitions
├── docs/                        # Documentation (this folder)
├── trigger.config.ts            # Trigger.dev configuration
├── package.json                 # Dependencies and scripts
└── .env.local                   # Environment variables (create this)
```

## 🔧 Basic Usage Examples

### Creating a New Task

1. **Define the Task** in [`src/trigger/example.ts`](../src/trigger/example.ts):

```typescript
import { logger, task, wait } from "@trigger.dev/sdk/v3";

export const myCustomTask = task({
  id: "my-custom-task",
  maxDuration: 300,
  run: async (payload: any, { ctx }) => {
    logger.log("Processing custom task", { payload });
    
    // Your custom logic here
    await wait.for({ seconds: 2 });
    
    return {
      message: `Processed: ${payload.data}`,
      timestamp: new Date().toISOString()
    };
  },
});
```

2. **Trigger the Task** from an API route:

```typescript
import { tasks } from "@trigger.dev/sdk/v3";
import type { myCustomTask } from "../../src/trigger/example";

export async function action({ request }: { request: Request }) {
  const payload = await request.json();
  
  const handle = await tasks.trigger<typeof myCustomTask>(
    "my-custom-task", 
    payload
  );
  
  return Response.json({ taskId: handle.id });
}
```

### Monitoring Task Progress

Use the real-time monitoring pattern from [`RealtimeDemo.tsx`](../app/components/RealtimeDemo.tsx):

```typescript
// Trigger task
const response = await fetch("/api/my-endpoint");
const { taskId } = await response.json();

// Listen for updates
const sseResponse = await fetch("/api/my-endpoint", {
  method: "POST",
  body: JSON.stringify({ taskId })
});

const reader = sseResponse.body?.getReader();
// Process SSE stream...
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Task not found" Error
- Ensure your task is properly exported from [`src/trigger/example.ts`](../src/trigger/example.ts)
- Check that the task ID matches exactly
- Verify Trigger.dev configuration

#### 2. Environment Variables Not Loading
- Ensure `.env.local` exists in the project root
- Check that variable names match exactly
- Restart the development server after changes

#### 3. Webhook Not Receiving Data
- Verify the endpoint URL: `http://localhost:5173/api/webhook`
- Check Content-Type header: `application/json`
- Ensure JSON payload is valid

#### 4. Real-time Updates Not Working
- Check browser console for JavaScript errors
- Verify SSE endpoint is responding
- Ensure task ID is valid

### Getting Help

1. Check the [API Reference](./api-reference.md) for endpoint details
2. Review the [Architecture](./architecture.md) for system understanding
3. Consult [Trigger.dev Documentation](https://trigger.dev/docs) for task-related issues

## ⚡ Next Steps

Once you have the basic setup working:

1. **Explore the API**: Check out the [API Reference](./api-reference.md)
2. **Understand the Architecture**: Read the [Architecture Guide](./architecture.md)
3. **Deploy to Production**: Follow the [Deployment Guide](./deployment.md)
4. **Customize Tasks**: Modify [`src/trigger/example.ts`](../src/trigger/example.ts) for your use case

---

**Ready to build?** You now have a fully functional webhook handler with real-time monitoring capabilities!