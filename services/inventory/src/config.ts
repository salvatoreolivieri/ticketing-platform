export const config = {
  port: Number(process.env.INVENTORY_PORT ?? 4002),
  // How long a reservation holds seats before lazy release. Defaults to the
  // designed 10 minutes; overridable (e.g. by e2e tests) via HOLD_TTL_MS.
  holdTtlMs: Number(process.env.HOLD_TTL_MS ?? 10 * 60 * 1000),
};
