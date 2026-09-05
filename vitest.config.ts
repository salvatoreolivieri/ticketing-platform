import { defineConfig } from "vitest/config";

export default defineConfig({
  // Force a single physical `graphql` module. The gateway builds the schema with
  // `graphql` and hands it to Apollo Server, which imports `graphql` internally;
  // if Vitest loads two instances, graphql's cross-realm check throws
  // "Duplicate graphql modules cannot be used at the same time".
  resolve: {
    dedupe: ["graphql"],
  },
  test: {
    include: ["packages/**/tests/**/*.test.ts", "services/**/tests/**/*.test.ts"],
    // Inline graphql *and* Apollo so both go through Vite's transform and share
    // that single graphql instance (rather than Apollo staying external).
    server: {
      deps: {
        inline: [/graphql/, /@apollo\/server/],
      },
    },
  },
});
