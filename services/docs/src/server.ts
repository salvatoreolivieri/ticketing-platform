import { createDocsApp } from "./app";
import { config } from "./config";

const app = createDocsApp({
  catalogUrl: config.catalogUrl,
  inventoryUrl: config.inventoryUrl,
  ordersUrl: config.ordersUrl,
});

app.listen(config.port, () => {
  console.log(`[docs] Swagger UI on http://localhost:${config.port}/docs`);
});
