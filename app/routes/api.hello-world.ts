import type { helloWorldTask } from "../../src/trigger/example";
import { tasks, runs } from "@trigger.dev/sdk/v3";

const payload = "James"

export async function loader() {
  const handle = await tasks.trigger<typeof helloWorldTask>("hello-world", payload);

  // Return immediate response with task ID
  return Response.json({
    taskId: handle.id,
    message: "Task triggered successfully. The task will complete in about 5 seconds.",
    status: "triggered"
  });
}

// New endpoint to stream realtime updates
export async function action({ request }: { request: Request }) {
  const { taskId } = await request.json();
  
  if (!taskId) {
    return Response.json({ error: "Task ID required" }, { status: 400 });
  }

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Subscribe to realtime updates
        for await (const run of runs.subscribeToRun<typeof helloWorldTask>(taskId)) {
          const event = {
            status: run.status,
            message: run.status === "COMPLETED" && run.output ? run.output.message : null,
            error: run.status === "FAILED" ? run.error?.message : null,
            timestamp: new Date().toISOString()
          };

          // Send the event as SSE
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));

          // Close the stream when task is complete or failed
          if (run.status === "COMPLETED" || run.status === "FAILED") {
            controller.close();
            break;
          }
        }
      } catch (error) {
        const errorEvent = {
          status: "ERROR",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString()
        };
        const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
