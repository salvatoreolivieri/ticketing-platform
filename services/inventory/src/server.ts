import { createInventoryApp } from "./app";
import { buildInventory } from "./composition/container";
import { config } from "./config";

const app = createInventoryApp(buildInventory(config.holdTtlMs));
app.listen(config.port, () => {
  console.log(`[inventory] listening on http://localhost:${config.port}`);
});
