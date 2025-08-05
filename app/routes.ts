import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/hello-world", "routes/api.hello-world.ts"),
  route("api/realtime", "routes/api.realtime.ts"),
  route("api/webhook", "routes/api.webhook.ts")
] satisfies RouteConfig;
