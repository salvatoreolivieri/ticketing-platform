import { createOrdersApp } from "./app";
import { buildOrders } from "./composition/container";
import { config } from "./config";

const app = createOrdersApp(await buildOrders(config.inventoryUrl));
app.listen(config.port, () => {
  console.log(`[orders] listening on http://localhost:${config.port}`);
});
