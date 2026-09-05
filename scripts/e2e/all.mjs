// Runs all six e2e scenario scripts in sequence, each as its own tsx process
// (exactly like running them one by one), and prints an aggregate summary.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const scenarios = [
  ["1", "scenario-1-event-detail.ts"],
  ["2", "scenario-2-browse-list.ts"],
  ["3", "scenario-3-hold-tickets.ts"],
  ["4", "scenario-4-release-tickets.ts"],
  ["5", "scenario-5-nightly-sync.ts"],
  ["6", "scenario-6-live-availability.ts"],
];

function run(file) {
  return new Promise((resolve) => {
    const p = spawn("npx", ["tsx", join(here, file)], { stdio: "inherit" });
    p.on("close", (code) => resolve(code ?? 1));
  });
}

const results = [];
for (const [n, file] of scenarios) {
  const code = await run(file);
  results.push([n, code]);
}

console.log("\n" + "═".repeat(50));
console.log("E2E summary");
let failed = 0;
for (const [n, code] of results) {
  const ok = code === 0;
  if (!ok) failed++;
  console.log(`  ${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}  Scenario ${n}`);
}
console.log("═".repeat(50));
process.exitCode = failed ? 1 : 0;
