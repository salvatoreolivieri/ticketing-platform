import express, { type Express } from "express";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiSpec, type ServiceBaseUrls } from "./openapi";

/**
 * Serves interactive API documentation for the three REST services:
 *   GET /docs         -> Swagger UI
 *   GET /openapi.json -> the raw OpenAPI 3.0 document
 *   GET /             -> redirect to /docs
 */
export function createDocsApp(bases: ServiceBaseUrls): Express {
  const spec = buildOpenApiSpec(bases);

  const app = express();

  app.get("/openapi.json", (_req, res) => res.json(spec));

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: "Ticketing Platform — API Docs",
      swaggerOptions: { persistAuthorization: true },
    }),
  );

  app.get("/", (_req, res) => res.redirect("/docs"));

  return app;
}
