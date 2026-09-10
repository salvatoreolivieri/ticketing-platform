import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestHandler } from "express";

/**
 * Per-request tally of data-store reads, keyed by the read method name
 * (e.g. "allEvents", "getTiersForEvent"). Its whole purpose is to make read
 * fan-out visible: a browse that logs `getTiersForEvent:20` is the N+1 —
 * batched, the same browse logs `getTiersForEvent:1`.
 */
type Tally = Map<string, number>;

const store = new AsyncLocalStorage<Tally>();

/** Called by repositories/stores on every read. No-op outside a request. */
export function recordRead(label: string): void {
  const tally = store.getStore();
  if (tally) tally.set(label, (tally.get(label) ?? 0) + 1);
}

/**
 * Opens a fresh tally for each request and prints the read breakdown when the
 * response finishes. ALS propagates through the (possibly async) handler chain,
 * so every read the handlers make lands in the right request's tally. Silent
 * under NODE_ENV=test to keep Vitest output clean, matching requestLogger.
 */
export function dbReadLogger(service: string): RequestHandler {
  return (req, res, next) => {
    const tally: Tally = new Map();
    res.on("finish", () => {
      if (process.env.NODE_ENV === "test" || tally.size === 0) return;
      const total = [...tally.values()].reduce((a, b) => a + b, 0);
      const breakdown = [...tally.entries()]
        .map(([label, n]) => `${label}:${n}`)
        .join(", ");
      console.log(
        `[${service}] ${req.method} ${req.originalUrl} → ${total} reads (${breakdown})`,
      );
    });
    store.run(tally, () => next());
  };
}
