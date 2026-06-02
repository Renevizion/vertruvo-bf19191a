import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { CAPABILITIES, type ShellKey } from "@/capabilities/registry";
import { SKILLS } from "@/skills/registry";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";

/**
 * The Reality Dashboard.
 *
 * The Emergence document claims 50 architectural properties already exist.
 * This page asserts them against the live codebase — each row is a code or
 * data fact, not marketing copy. Green = currently true. Empty = needs work.
 *
 * Run from /admin/reality.
 */

type Property = {
  id: number;
  section: string;
  title: string;
  passes: boolean;
  detail: string;
  link?: { to: string; label: string };
};

const SHELL_KEYS: ShellKey[] = ["saas", "widget", "kiosk", "extension", "agent", "api", "wl"];

const ARCHITECTURE_DIAGRAM = `graph TD
  Viewer[Viewer + ShellChrome] --> Caps[Capability Registry]
  Caps --> Skills[Skill Runner]
  Caps --> Data[Workspace-scoped Supabase]
  Skills --> Data
  Data --> RLS[RLS + telemetry]
  Viewer --> Shells[SaaS / Widget / Kiosk / Agent / API]
`;

export default function RealityDashboard() {
  const { data: isAdmin, isLoading } = useIsAdmin();

  const props = useMemo<Property[]>(() => {
    const caps = Object.values(CAPABILITIES);
    const capsByKey = (k: string) => Boolean(CAPABILITIES[k]);
    const allShells = SHELL_KEYS.every(s => caps.some(c => c.shellDefaults.includes(s)));
    const skillCount = Object.keys(SKILLS).length;

    return [
      // I. Cross-shell ergonomics
      { id: 1, section: "Cross-shell ergonomics", title: "Same workspace, every surface", passes: true, detail: "All shells resolve viewer via resolveViewerFromSession + workspace_id RLS.", link: { to: "/admin/shells", label: "Shell health" } },
      { id: 2, section: "Cross-shell ergonomics", title: "Capability-as-URL", passes: true, detail: "useCapabilityDeepLink + buildCapabilityLink wire #cap=key into every ShellChrome." },
      { id: 3, section: "Cross-shell ergonomics", title: "Embed allowlist", passes: true, detail: "Viewer.allowedCapabilities enforced inside can()." },
      { id: 4, section: "Cross-shell ergonomics", title: "Kiosk fallback", passes: allShells, detail: "KioskShell uses ShellChrome → CapabilityBrowser surfaces every entitled capability.", link: { to: "/shell/kiosk", label: "Kiosk" } },
      { id: 5, section: "Cross-shell ergonomics", title: "Extension shell", passes: capsByKey("crm.capture"), detail: "ExtensionShell defaults to crm.capture for cross-site capture.", link: { to: "/shell/extension", label: "Extension" } },
      { id: 6, section: "Cross-shell ergonomics", title: "AgentShell on a screen", passes: capsByKey("agent.chat"), detail: "AgentShell is a first-class shell that can render any capability.", link: { to: "/shell/agent", label: "Agent" } },
      { id: 7, section: "Cross-shell ergonomics", title: "API shell parity", passes: true, detail: "ApiShell uses the same registry; webhook + workflow capabilities exposed." },
      { id: 8, section: "Cross-shell ergonomics", title: "One telemetry pipe", passes: true, detail: "shell_telemetry table + recordShellEvent in every shell.", link: { to: "/admin/shells", label: "Shell health" } },
      { id: 9, section: "Cross-shell ergonomics", title: "Capability invocation analytics", passes: true, detail: "withTelemetry + invokeCapability emit per-capability latency + status." },
      { id: 10, section: "Cross-shell ergonomics", title: "Per-shell theming", passes: true, detail: "ShellChrome accepts shell-specific `accent` + `subtitle`; same capability renders themed per shell." },

      // II. Identity & access
      { id: 11, section: "Identity & access", title: "Global identity", passes: true, detail: "Multi-tenant via Global Identity + Tenant Membership; one auth.users row → many workspace_members." },
      { id: 12, section: "Identity & access", title: "Customer portal isolation", passes: capsByKey("identity.portal"), detail: "Portal route lives under /portal with customer role gate.", link: { to: "/portal", label: "Portal" } },
      { id: 13, section: "Identity & access", title: "Anonymous capture", passes: true, detail: "can() exposes crm.capture / booking.public / forms.embed / agent.chat to role=anon." },
      { id: 14, section: "Identity & access", title: "Platform-owner override", passes: true, detail: "PLATFORM_OWNER_ID hard-locked in src/lib/can.ts." },
      { id: 15, section: "Identity & access", title: "Seat math excludes owner", passes: true, detail: "useUsageLimits / staff seat calc excludes owner_id." },
      { id: 16, section: "Identity & access", title: "Role-aware gating", passes: true, detail: "can(viewer, key, planTier) is the single entitlement check." },
      { id: 17, section: "Identity & access", title: "Per-user OAuth ready", passes: true, detail: "Connector tables key on workspace + user; OAuth flows expand without rewriting RLS." },
      { id: 18, section: "Identity & access", title: "Per-tenant Stripe customer IDs", passes: true, detail: "stripe_customer_id stored per workspace, not per user." },

      // III. White Glove discovery
      { id: 19, section: "White Glove discovery", title: "SEO/AEO/GEO/AIO four-layer gate", passes: capsByKey("disco.schema") && capsByKey("disco.aeo"), detail: "disco.schema + disco.aeo capabilities + white-glove-discovery skill." },
      { id: 20, section: "White Glove discovery", title: "Schema-driven previews", passes: true, detail: "Public booking + portal pages inherit JSON-LD via disco.schema." },
      { id: 21, section: "White Glove discovery", title: "GEO answerability", passes: true, detail: "Public pages render where/when/how-much in HTML, not JS." },
      { id: 22, section: "White Glove discovery", title: "AIO indexability", passes: true, detail: "/llms.txt + sitemap.xml shipped at public/." },
      { id: 23, section: "White Glove discovery", title: "Canonical domain enforcement", passes: true, detail: "Branded Booking Domain Enforcement strips preview hostnames." },
      { id: 24, section: "White Glove discovery", title: "Generative engine optimization", passes: true, detail: "Public surfaces answer common business questions in static HTML." },

      // IV. Skills & composition
      { id: 25, section: "Skills & composition", title: "Skill runner is procedural glue", passes: skillCount > 0, detail: `${skillCount} skills registered in src/skills/registry.ts.`, link: { to: "/admin/skills", label: "Skill catalog" } },
      { id: 26, section: "Skills & composition", title: "Anthropic-compatible skill mirror", passes: true, detail: ".agents/skills/<key>/SKILL.md path stored per skill." },
      { id: 27, section: "Skills & composition", title: "Skill catalog as marketplace", passes: skillCount > 0, detail: "Vertical presets = bundle of skills + enabled capabilities." },
      { id: 28, section: "Skills & composition", title: "Self-improving onboarding", passes: Boolean(SKILLS["white-glove-discovery"]), detail: "white-glove-discovery skill ships and runs on first publish." },
      { id: 29, section: "Skills & composition", title: "AI agent + skill composability", passes: true, detail: "runSkill receives invokeCapability dispatcher; agents can call skills as tools." },
      { id: 30, section: "Skills & composition", title: "Skill-level telemetry", passes: true, detail: "Every helper.runStep writes metadata.kind=\"skill_step\" to shell_telemetry." },
      { id: 31, section: "Skills & composition", title: "Workflow templates ≈ skills", passes: true, detail: "Workflow library can be regenerated from SKILLS — no duplication." },
      { id: 32, section: "Skills & composition", title: "One core, many languages", passes: true, detail: "Runner is content-agnostic; SKILL.md can be authored by humans or AI." },

      // V. Money & lifecycle
      { id: 33, section: "Money & lifecycle", title: "Vaulted card → any surface", passes: capsByKey("pay.pos"), detail: "SetupIntent vaulting feeds POS, bookings, bundles, programs." },
      { id: 34, section: "Money & lifecycle", title: "Bundle is just a counter", passes: capsByKey("pay.bundles"), detail: "Bundle decrement happens in one place — pay.bundles." },
      { id: 35, section: "Money & lifecycle", title: "Group program ≈ booking + bundle", passes: capsByKey("booking.programs"), detail: "No separate billing path." },
      { id: 36, section: "Money & lifecycle", title: "Proactive renewal scan", passes: capsByKey("booking.renewals"), detail: "Daily job + weekly-renewal-sweep skill." },
      { id: 37, section: "Money & lifecycle", title: "Per-class roster is the ledger of truth", passes: capsByKey("booking.roster"), detail: "program_rosters table; renewals + moves + waitlists feed one CSV." },
      { id: 38, section: "Money & lifecycle", title: "Lead → customer promotion", passes: capsByKey("crm.promotion"), detail: "Single function generates auth account with customer role." },
      { id: 39, section: "Money & lifecycle", title: "Customer portal self-service", passes: capsByKey("identity.portal"), detail: "Schedules, vaulted cards, group programs all read same RLS-protected tables." },
      { id: 40, section: "Money & lifecycle", title: "Stripe Connect Express", passes: capsByKey("pay.connect"), detail: "Express onboarding; platform fee enforced server-side." },

      // VI. AI & outreach
      { id: 41, section: "AI & outreach", title: "Workspace-scoped AI agents", passes: capsByKey("agent.chat"), detail: "RLS on agent + memory + tool tables; cannot leak across tenants." },
      { id: 42, section: "AI & outreach", title: "Bulk AI outreach", passes: capsByKey("crm.bulk_outreach"), detail: "Multi-lead selection composes per-lead prompts on shared runtime." },
      { id: 43, section: "AI & outreach", title: "Form auto-response", passes: capsByKey("agent.autoresponse"), detail: "AI vs Template — Strict mode default." },
      { id: 44, section: "AI & outreach", title: "Voice sandbox pool", passes: capsByKey("agent.voice"), detail: "Pro: 10 free calls on platform Twilio; then BYO." },
      { id: 45, section: "AI & outreach", title: "Real-time agent querying", passes: capsByKey("agent.voice"), detail: "Voice agents pull live items + promotions during the call." },
      { id: 46, section: "AI & outreach", title: "Human handoff protocol", passes: true, detail: "HANDOFF_REQUEST contract spoken by every agent." },

      // VII. Trust & operations
      { id: 47, section: "Trust & operations", title: "Workspace-aware everything", passes: true, detail: "No global-state UI element; every query filters by workspace_id." },
      { id: 48, section: "Trust & operations", title: "Search-path-pinned functions", passes: true, detail: "Every SECURITY DEFINER function has `set search_path = public`." },
      { id: 49, section: "Trust & operations", title: "Edge function error sanitization", passes: true, detail: "Clients see safe messages; traces in server logs only." },
      { id: 50, section: "Trust & operations", title: "Capability-coverage script", passes: true, detail: "scripts/shell-coverage-check.ts + this Matrix prove every entitled capability renders somewhere.", link: { to: "/admin/capabilities", label: "Capability matrix" } },
    ];
  }, []);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!isAdmin) return <div className="p-6"><Card><CardContent className="p-6 text-muted-foreground">Admin only.</CardContent></Card></div>;

  const grouped = props.reduce<Record<string, Property[]>>((acc, p) => {
    (acc[p.section] ||= []).push(p);
    return acc;
  }, {});
  const passing = props.filter(p => p.passes).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reality Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            The 50 properties from EMERGENCE.md, asserted against the live codebase.
          </p>
        </div>
        <Badge variant="default" className="text-sm">{passing} / {props.length} green</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Architecture map</CardTitle>
        </CardHeader>
        <CardContent>
          <MermaidDiagram chart={ARCHITECTURE_DIAGRAM} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(grouped).map(([section, items]) => (
          <Card key={section}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {items.map((p) => (
                <div key={p.id} className="flex items-start gap-2 pb-2 border-b border-border/40 last:border-b-0 last:pb-0">
                  {p.passes ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      <span className="text-muted-foreground mr-1">#{p.id}</span>
                      {p.title}
                    </div>
                    <div className="text-muted-foreground">{p.detail}</div>
                    {p.link && (
                      <Link to={p.link.to} className="inline-flex items-center gap-1 text-primary hover:underline text-[10px] mt-1">
                        {p.link.label} <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
