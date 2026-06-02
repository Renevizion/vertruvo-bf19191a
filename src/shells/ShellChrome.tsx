import { ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CAPABILITIES, type ShellKey } from "@/capabilities/registry";
import { useShellHeartbeat, recordShellEvent } from "@/lib/shell-health";
import { resolveViewerFromSession, type Viewer } from "@/lib/viewer";
import { useCapabilityDeepLink } from "@/core/deep-link";
import { ExternalLink, Sparkles, ChevronRight } from "lucide-react";

/**
 * ShellChrome — the standard frame every non-SaaS shell wears.
 * Tier-1 AI UX: clear landmarks, aria-live status, keyboard focusable cards,
 * 44px tap targets, semantic regions, top-of-page skip link.
 *
 * Also auto-handles capability deep links: `?#cap=<key>` on any shell URL
 * is dispatched to `onPickCapability` once the viewer is resolved.
 */
export function ShellChrome({
  shell,
  title,
  subtitle,
  accent,
  children,
  defaultCapability,
  onPickCapability,
}: {
  shell: ShellKey;
  title: string;
  subtitle: string;
  accent: string;
  children: ReactNode;
  defaultCapability?: string;
  onPickCapability?: (key: string) => void;
}) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  useEffect(() => { void resolveViewerFromSession().then(setViewer); }, []);
  useShellHeartbeat(shell, viewer);

  const deepLink = useCapabilityDeepLink();
  const dispatchedDeepLink = useRef<string | null>(null);
  useEffect(() => {
    if (!deepLink || !onPickCapability) return;
    if (dispatchedDeepLink.current === deepLink.capabilityKey) return;
    dispatchedDeepLink.current = deepLink.capabilityKey;
    void recordShellEvent({
      shell, workspaceId: viewer?.workspaceId, viewerRole: viewer?.role,
      capabilityKey: deepLink.capabilityKey, status: "ok",
      metadata: { kind: "deeplink", args: deepLink.args },
    });
    onPickCapability(deepLink.capabilityKey);
  }, [deepLink, onPickCapability, shell, viewer?.workspaceId, viewer?.role]);

  const entitled = Object.values(CAPABILITIES).filter(c => c.shellDefaults.includes(shell));

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <a href="#shell-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-3 py-2 rounded-md z-50">
        Skip to content
      </a>

      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 ${accent}`} aria-hidden>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{title}</h1>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase text-[10px] tracking-wide">{shell}</Badge>
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link to="/dashboard" aria-label="Open full Thermi workspace">
                Open Thermi <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="shell-main" role="main" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {children}

        <section aria-labelledby="more-capabilities" className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h2 id="more-capabilities" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              More in this shell
            </h2>
            <Badge variant="secondary" className="text-[10px]">{entitled.length}</Badge>
          </div>
          <ScrollArea className="w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {entitled.map(c => (
                <Card
                  key={c.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${c.label}: ${c.description}`}
                  onClick={() => {
                    void recordShellEvent({ shell, capabilityKey: c.key, status: "ok", viewerRole: viewer?.role, workspaceId: viewer?.workspaceId, metadata: { kind: "capability_pick" } });
                    onPickCapability?.(c.key);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPickCapability?.(c.key); } }}
                  className={`min-h-[44px] cursor-pointer transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${c.key === defaultCapability ? "border-primary" : ""}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{c.label}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-2">{c.description}</div>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                    </div>
                    <Badge variant="outline" className="mt-2 text-[9px] uppercase tracking-wide">{c.tier}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </section>
      </main>

      <footer role="contentinfo" className="border-t py-3 text-center text-[10px] text-muted-foreground">
        Powered by <Link to="/" className="underline">Thermi</Link> · {shell} shell
      </footer>
    </div>
  );
}
