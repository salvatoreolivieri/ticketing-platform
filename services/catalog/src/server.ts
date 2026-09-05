import { createCatalogApp } from "./app";
import { buildCatalogRepository } from "./composition/container";
import { config } from "./config";

const app = createCatalogApp(buildCatalogRepository());
app.listen(config.port, () => {
  console.log(`[catalog] listening on http://localhost:${config.port}`);
});
