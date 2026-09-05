import express, { type Express } from "express";
import cors from "cors";
import { buildSchema } from "graphql";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema";
import { makeRoot, type GatewayClients } from "./resolvers";

/**
 * Builds the gateway Express app backed by Apollo Server.
 *
 * We keep the schema-first setup: `buildSchema(typeDefs)` produces an executable
 * schema and `makeRoot(clients)` supplies the root resolvers via `rootValue`
 * (graphql-js calls `rootValue[fieldName](args, ctx, info)` for each root field).
 *
 * Async because Apollo Server must be `start()`-ed before its middleware mounts.
 */
export async function createGatewayApp(clients: GatewayClients): Promise<Express> {
  const schema = buildSchema(typeDefs);
  const rootValue = makeRoot(clients);

  const server = new ApolloServer({ schema, rootValue });
  await server.start();

  const app = express();
  app.use("/graphql", cors(), express.json(), expressMiddleware(server));
  return app;
}
