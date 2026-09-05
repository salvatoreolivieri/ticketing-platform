import { createGatewayApp } from "./app";
import { HttpCatalogClient, HttpInventoryClient } from "./clients";
import { config } from "./config";

const app = await createGatewayApp({
  catalog: new HttpCatalogClient(config.catalogUrl),
  inventory: new HttpInventoryClient(config.inventoryUrl),
});

app.listen(config.port, () => {
  console.log(`[gateway] GraphQL on http://localhost:${config.port}/graphql`);
});
