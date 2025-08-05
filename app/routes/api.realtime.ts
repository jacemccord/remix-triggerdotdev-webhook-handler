// This route is not needed for the React hooks approach
// The realtime functionality is handled by the React hooks directly
export async function loader() {
  return new Response("Realtime API not needed for React hooks approach", { status: 404 });
} 