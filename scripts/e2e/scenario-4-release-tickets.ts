/**
 * Scenario 4 — Release ticket (hold expiry).
 *
 * A hold isn't forever: once its TTL lapses the seats are released back into
 * availability (Inventory publishes SeatsReleased; release is lazy — done
 * just-in-time before the next read/reserve). It's the counterpart to Scenario 3.
 *
 * Waiting the real 10 minutes in a test is absurd, so this script brings up a
 * DEDICATED Inventory instance with a short HOLD_TTL_MS on its own port,
 * reserves seats, watches them reappear after expiry, then tears it down. It
 * touches nothing on the shared :4002 stack, so it never disturbs the 10-minute
 * hold the other scenarios assume.
 *
 *   Run: npm run e2e:4   (or: npx tsx scripts/e2e/scenario-4-release-tickets.ts)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { check, finish, findInventoryTierWithSeats, heading, info, liveRemaining, post } from "./lib";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
const inventoryEntry = join(repoRoot, "services", "inventory", "src", "server.ts");

const PORT = Number(process.env.E2E_RELEASE_PORT ?? 4102);
const TTL_MS = Number(process.env.E2E_RELEASE_TTL_MS ?? 1000);
const BASE = `http://localhost:${PORT}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForUp(base: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(base, { signal: AbortSignal.timeout(1000) });
      return true; // any HTTP response means it's bound
    } catch {
      await sleep(150);
    }
  }
  return false;
}

heading(
  4,
  "Release ticket (hold expiry)",
  `A hold's seats return to availability once its TTL lapses. Uses a throwaway Inventory with HOLD_TTL_MS=${TTL_MS}ms on :${PORT}.`,
);

// Bring up a dedicated short-TTL Inventory in its own process group.
const child = spawn(tsxBin, [inventoryEntry], {
  cwd: repoRoot,
  env: { ...process.env, INVENTORY_PORT: String(PORT), HOLD_TTL_MS: String(TTL_MS) },
  stdio: ["ignore", "ignore", "inherit"],
  detached: true,
});

try {
  const up = await waitForUp(BASE, 20000);
  if (check(`dedicated Inventory is up on :${PORT}`, up)) {
    try {
      const { tierId, remaining: r0 } = await findInventoryTierWithSeats(4, 120, BASE);
      info(`Using ${tierId} — ${r0} seats live.`);

      // Hold 3 seats.
      const hold = await post(`${BASE}/api/v1/reserves/${tierId}`, { quantity: 3 });
      check("reserve 3 seats → HTTP 201", hold.status === 201, `status ${hold.status}`);

      // Right away the seats are held (TTL not yet lapsed).
      const held = await liveRemaining(tierId, BASE);
      check("seats are held immediately after reserve", held === r0 - 3, `${r0} → ${held}`);

      // Poll past the TTL. Release is lazy, so each probe triggers it.
      const start = Date.now();
      let releasedMs = -1;
      for (let i = 0; i < 15; i++) {
        await sleep(300);
        if ((await liveRemaining(tierId, BASE)) === r0) {
          releasedMs = Date.now() - start;
          break;
        }
      }
      check(
        "held seats are released after the TTL lapses",
        releasedMs >= 0,
        releasedMs >= 0 ? `after ~${releasedMs} ms` : "not released within 4.5s",
      );

      if (releasedMs >= 0) {
        check("released seats restore the original availability", (await liveRemaining(tierId, BASE)) === r0, `back to ${r0}`);
        check("released only after the TTL, not before", releasedMs >= TTL_MS, `${releasedMs} ms ≥ ${TTL_MS} ms`);
        info("Release is lazy: expired holds return to availability on the next read/reserve — no timers.");
      }
    } catch (err) {
      check("release scenario ran without errors", false, String(err));
    }
  }
} finally {
  if (child.pid) {
    try {
      process.kill(-child.pid, "SIGINT"); // kill the whole process group
    } catch {
      /* already gone */
    }
  }
}

finish();
