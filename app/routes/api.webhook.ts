import type { helloWorldTask } from "../../src/trigger/example";
import { tasks } from "@trigger.dev/sdk/v3";

// Webhook handler for receiving external payloads
export async function action({ request }: { request: Request }) {
  try {
    // Parse the incoming webhook payload
    const payload = await request.json();
    
    // Validate the payload (you can add your own validation logic)
    if (!payload) {
      return Response.json({ error: "No payload provided" }, { status: 400 });
    }

    // Trigger the hello-world task with the webhook payload
    const handle = await tasks.trigger<typeof helloWorldTask>("hello-world", payload);

    // Return success response with task ID
    return Response.json({
      success: true,
      taskId: handle.id,
      message: "Webhook received and task triggered successfully",
      receivedPayload: payload
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json(
      { 
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// GET endpoint to show webhook info
export async function loader() {
  return Response.json({
    message: "Webhook endpoint ready",
    method: "POST",
    description: "Send a POST request with a JSON payload to trigger the hello-world task",
    example: {
      payload: "Your webhook data here"
    }
  });
} 