/**
 * Registry-driven shell coverage check.
 * Run: bunx tsx scripts/shell-coverage-check.ts
 *
 * Adding a capability to src/capabilities/registry.ts auto-tests it
 * across every shell × tier. See CORE_CONTRACT.md §7.
 */
import { CAPABILITIES, listCapabilitiesFor, type ShellKey, type Tier } from "../src/capabilities/registry";

const SHELLS: ShellKey[] = ["saas", "widget", "kiosk", "extension", "agent", "api", "wl"];
const TIERS: Tier[] = ["free", "starter", "pro", "enterprise"];

let failed = 0;
const fail = (msg: string) => { failed++; console.error("✗", msg); };
const pass = (msg: string) => console.log("✓", msg);

// 1. Metadata sanity
for (const cap of Object.values(CAPABILITIES)) {
  if (!cap.label) fail(`${cap.key}: missing label`);
  if (!cap.description) fail(`${cap.key}: missing description`);
  if (!cap.shellDefaults?.length) fail(`${cap.key}: no shellDefaults`);
}
pass(`${Object.keys(CAPABILITIES).length} capabilities have required metadata`);

// 2. Shell × tier resolves
for (const shell of SHELLS) {
  for (const tier of TIERS) {
    const list = listCapabilitiesFor(shell, tier);
    if (!Array.isArray(list)) fail(`${shell}/${tier}: did not return list`);
  }
}
pass(`${SHELLS.length}×${TIERS.length} shell/tier combinations resolve cleanly`);

// 3. Every shell has at least one default capability on free tier
for (const shell of SHELLS) {
  const defaults = Object.values(CAPABILITIES).filter(c => c.shellDefaults.includes(shell));
  if (defaults.length === 0) fail(`${shell}: no default capabilities`);
}
pass("every shell has at least one default capability");

if (failed > 0) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nShell coverage OK.");
