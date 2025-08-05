import { useState, useEffect } from "react";

interface TaskUpdate {
  status: string;
  message?: string;
  error?: string;
  timestamp: string;
}

export function RealtimeDemo() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string>("");
  const [taskMessage, setTaskMessage] = useState<string>("");

  const triggerTask = async () => {
    setIsLoading(true);
    setError(null);
    setTaskStatus("");
    setTaskMessage("");

    try {
      const response = await fetch("/api/hello-world");
      const data = await response.json();
      
      if (data.taskId) {
        setTaskId(data.taskId);
        setTaskStatus("triggered");
        setTaskMessage(data.message);
        
        // Start listening to realtime updates
        listenToTaskUpdates(data.taskId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger task");
    } finally {
      setIsLoading(false);
    }
  };

  const listenToTaskUpdates = async (runId: string) => {
    try {
      const response = await fetch("/api/hello-world", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId: runId }),
      });

      if (!response.ok) {
        throw new Error("Failed to start listening to task updates");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: TaskUpdate = JSON.parse(line.slice(6));
              setTaskStatus(event.status);
              
              if (event.message) {
                setTaskMessage(event.message);
              }
              
              if (event.error) {
                setError(event.error);
              }

              // Stop listening if task is complete or failed
              if (event.status === "COMPLETED" || event.status === "FAILED") {
                reader.cancel();
                break;
              }
            } catch (parseError) {
              console.error("Failed to parse SSE event:", parseError);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to listen to task updates");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Trigger.dev Realtime Demo</h2>
      
      <button
        onClick={triggerTask}
        disabled={isLoading}
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isLoading ? "Triggering..." : "Trigger Hello World Task"}
      </button>

      {taskId && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">Task ID: {taskId}</p>
          <p className="text-sm text-gray-600">Waiting for result...</p>
        </div>
      )}

      {taskStatus === "triggered" && (
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-sm font-semibold text-blue-800">Task Triggered</p>
          <p className="text-sm text-blue-700">{taskMessage}</p>
        </div>
      )}

      {taskStatus === "EXECUTING" && (
        <div className="mt-4 p-3 bg-yellow-100 rounded">
          <p className="text-sm font-semibold text-yellow-800">Task Running...</p>
          <p className="text-sm text-yellow-700">The task is currently executing. Please wait...</p>
        </div>
      )}

      {taskStatus === "COMPLETED" && taskMessage && (
        <div className="mt-4 p-3 bg-green-100 rounded">
          <p className="text-sm font-semibold text-green-800">Task Completed!</p>
          <p className="text-sm text-green-700">{taskMessage}</p>
        </div>
      )}

      {taskStatus === "FAILED" && (
        <div className="mt-4 p-3 bg-red-100 rounded">
          <p className="text-sm font-semibold text-red-800">Task Failed</p>
          <p className="text-sm text-red-700">{error || "Unknown error occurred"}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 rounded">
          <p className="text-sm font-semibold text-red-800">Error</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
} 