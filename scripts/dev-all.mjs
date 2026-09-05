// Boots all five processes (catalog, inventory, orders, gateway, docs) with tsx
// watch. Zero-dependency alternative to `concurrently`.
import { spawn } from "node:child_process";

const services = [
  ["gateway", "services/gateway/src/server.ts"],
  ["catalog", "services/catalog/src/server.ts"],
  ["inventory", "services/inventory/src/server.ts"],
  ["orders", "services/orders/src/server.ts"],
  ["docs", "services/docs/src/server.ts"],
];

const procs = services.map(([name, entry]) =>
  spawn("npx", ["tsx", "watch", entry], {
    stdio: "inherit",
    env: { ...process.env, SERVICE_NAME: name },
  }),
);

function shutdown() {
  for (const p of procs) p.kill("SIGINT");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
