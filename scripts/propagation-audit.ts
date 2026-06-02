#!/usr/bin/env bun
/**
 * Propagation Audit — proves a change reached every shell, every required surface.
 * Run: bun scripts/propagation-audit.ts
 * Exits non-zero on failure (CI / pre-commit ready).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

const AAA_PAGE_SURFACES = [
  "Inbox", "Tasks", "Calendar", "Leads", "EmailCampaigns", "Outreach",
  "VoiceCampaigns", "SocialMedia", "Forms", "Customers", "Contacts",
  "Renewals", "BookingSheet", "AIAgents", "Automations", "ContentHub",
  "Insights", "Analytics", "Admin", "Settings",
];

type Rule = {
  name: string;
  files: RegExp;            // which files this rule applies to
  mustContain?: RegExp[];   // pattern(s) the file MUST contain
  mustNotContain?: RegExp[];// pattern(s) the file MUST NOT contain
};

const RULES: Rule[] = [
  // Every shell must emit a heartbeat (via ShellChrome or useShellHeartbeat).
  { name: "shell emits heartbeat",
    files: /src\/pages\/shells\/.+Shell\.tsx$/,
    mustContain: [/ShellChrome|useShellHeartbeat/] },

  // Every shell page must wire onPickCapability (no dead capability grid).
  { name: "shell wires capability picks",
    files: /src\/pages\/shells\/.+Shell\.tsx$/,
    mustContain: [/onPickCapability/] },

  // No raw "Lovable" branding in user-facing pages (memory rule).
  { name: "no Lovable branding leak",
    files: /src\/(pages|components)\/.+\.tsx?$/,
    mustNotContain: [/\bLovable\b/] },

  // No placeholder/TODO sneaking into shell entrypoints.
  { name: "shell has no placeholders",
    files: /src\/pages\/shells\/.+Shell\.tsx$/,
    mustNotContain: [/\bTODO\b|\bFIXME\b|lorem ipsum/i] },

  // Main SaaS product sections must share the AAA page hero, not isolated one-off headers.
  { name: "AAA page hero coverage",
    files: new RegExp(`src/pages/(${AAA_PAGE_SURFACES.join("|")})\\.tsx$`),
    mustContain: [/PageHeader/] },

  // Insight generation must not drift back into ad-hoc button copy on contextual cards.
  { name: "contextual insight action copy",
    files: /src\/(pages|components)\/.+\.tsx?$/,
    mustNotContain: [/AI Task Suggestions|Generate insights|Refresh insights|Generate Insights|Refresh Insights/] },

  // Keep the app typography disciplined: Inter + Instrument Serif only.
  { name: "font family discipline",
    files: /src\/index\.css$|tailwind\.config\.ts$/,
    mustNotContain: [/Lora|Work Sans|Inconsolata|Space Mono/] },

  // (async-loading rule is applied conditionally below via checkAsyncLoading)
];

// Conditional rule: shells that do async work (supabase / fetch / functions.invoke)
// MUST show a loading indicator. Pure-static shells are exempt.
function checkAsyncLoading(file: string, src: string) {
  const doesAsync = /supabase\.|fetch\(|functions\.invoke|withTelemetry/.test(src);
  if (!doesAsync) return null;
  if (/Loader2|aria-busy|isLoading|\bbusy\b/.test(src)) return null;
  return "async shell missing visible loading indicator";
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(SRC);
const violations: { file: string; rule: string; detail: string }[] = [];

for (const rule of RULES) {
  const matched = all.filter((f) => rule.files.test(f));
  for (const f of matched) {
    const src = readFileSync(f, "utf8");
    for (const pat of rule.mustContain ?? []) {
      if (!pat.test(src)) violations.push({ file: relative(ROOT, f), rule: rule.name, detail: `missing ${pat}` });
    }
    for (const pat of rule.mustNotContain ?? []) {
      if (pat.test(src)) violations.push({ file: relative(ROOT, f), rule: rule.name, detail: `forbidden ${pat}` });
    }
  }
}

// Apply conditional async-loading rule across all shell pages.
for (const f of all.filter((f) => /src\/pages\/shells\/.+Shell\.tsx$/.test(f))) {
  const src = readFileSync(f, "utf8");
  const detail = checkAsyncLoading(f, src);
  if (detail) violations.push({ file: relative(ROOT, f), rule: "response fidelity", detail });
}

// (duplicated check removed)

// Shell coverage: every ShellKey must have a page file.
const SHELL_KEYS = ["widget", "kiosk", "extension", "agent", "api", "wl"];
const shellPages = all.filter((f) => /src\/pages\/shells\/.+Shell\.tsx$/.test(f)).map((f) => f.toLowerCase());
for (const k of SHELL_KEYS) {
  const found = shellPages.some((p) => p.includes(`/${k}shell.tsx`) || p.includes(`/whitelabelshell.tsx`) && k === "wl");
  if (!found) violations.push({ file: "src/pages/shells/", rule: "shell coverage", detail: `no page for shell "${k}"` });
}

if (violations.length === 0) {
  console.log("propagation-audit: PASS — every rule propagated.");
  process.exit(0);
}
console.error(`propagation-audit: FAIL — ${violations.length} violation(s):\n`);
for (const v of violations) console.error(`  - ${v.file}\n      [${v.rule}] ${v.detail}`);
process.exit(1);
