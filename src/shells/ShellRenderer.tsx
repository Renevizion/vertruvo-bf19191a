import { useEffect, useMemo, useState } from "react";
import { CAPABILITIES, type Capability } from "@/capabilities/registry";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, ExternalLink, Lock, Send } from "lucide-react";

export interface ShellInstanceConfig {
  id: string;
  workspaceId: string;
  workspaceSlug: string | null;
  kind: "kiosk" | "widget" | "agent" | "extension" | "wl" | "api";
  name: string;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  accentColor?: string | null;
  capabilityKeys: string[];
  brandName?: string | null;
  logoUrl?: string | null;
  supportEmail?: string | null;
  footerNote?: string | null;
  layout?: {
    tileSize?: "compact" | "standard" | "large";
    openMode?: "inline" | "sheet" | "link";
    startOpen?: boolean;
    visualStyle?: "seed" | "focused" | "kiosk";
  };
  isPreview?: boolean;
}

/**
 * Universal renderer for a deployed shell instance.
 * Renders capability tiles IN-SHELL (embedded sheet/iframe) using the
 * workspace's branding overrides. Same engine, different paint.
 */
export function ShellRenderer({ instance }: { instance: ShellInstanceConfig }) {
  const [openCap, setOpenCap] = useState<Capability | null>(null);

  const resolvedPath = (cap: Capability): string | null => {
    if (!cap.publicPath) return null;
    if (cap.publicPath.includes(":workspaceSlug")) {
      if (!instance.workspaceSlug) return null;
      return cap.publicPath.replace(":workspaceSlug", instance.workspaceSlug);
    }
    return cap.publicPath;
  };

  const tiles = useMemo(() => {
    return instance.capabilityKeys
      .map((k) => CAPABILITIES[k])
      .filter((c): c is Capability => Boolean(c))
      .filter((c) => Boolean(resolvedPath(c)) || c.key === "agent.chat");
  }, [instance.capabilityKeys, instance.workspaceSlug]);

  const accent = instance.accentColor || "#059669";
  const brand = instance.brandName?.trim() || (instance.kind === "wl" ? instance.name : "Thermi");
  const isWhiteLabel = instance.kind === "wl" && Boolean(instance.brandName?.trim());
  const openMode = instance.layout?.openMode ?? "inline";
  const tileSize = instance.layout?.tileSize ?? "standard";

  useEffect(() => {
    if (!instance.layout?.startOpen || openCap || tiles.length === 0) return;
    setOpenCap(tiles[0]);
  }, [instance.layout?.startOpen, openCap, tiles]);

  return (
    <div className="min-h-[100dvh] surface-mesh bg-background flex flex-col">
      {instance.isPreview && (
        <div className="bg-amber-500/90 text-amber-950 text-xs px-4 py-1.5 text-center font-medium">
          Preview mode · this draft is not live
        </div>
      )}
      <header className="px-4 sm:px-10 py-6 sm:py-10 border-b bg-card/80 backdrop-blur">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            {instance.logoUrl ? (
              <img src={instance.logoUrl} alt={`${brand} logo`} className="h-9 w-9 rounded-md bg-muted object-contain" />
            ) : null}
            <p className="text-sm sm:text-base text-muted-foreground">{brand}</p>
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-normal">
            {instance.heroTitle || (isWhiteLabel ? `Welcome to ${brand}` : "Welcome")}
          </h1>
          {instance.heroSubtitle && (
            <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl">
              {instance.heroSubtitle}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-10 py-8 max-w-5xl w-full mx-auto">
        {tiles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No capabilities enabled on this shell yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((cap) => {
              const path = resolvedPath(cap);
              const available = Boolean(path) || cap.key === "agent.chat";
              return (
                <button
                  key={cap.key}
                  onClick={() => available && (openMode === "link" && path ? window.location.assign(path) : setOpenCap(cap))}
                  disabled={!available}
                  className="text-left group"
                >
                  <Card
                    className={`h-full surface-raised transition-all ${
                      available
                        ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                        : "opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <CardContent className={`${tileSize === "compact" ? "p-4" : tileSize === "large" ? "p-7 sm:p-8" : "p-5 sm:p-6"} space-y-2`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {cap.group}
                        </span>
                        {!available && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold leading-tight">
                        {cap.label}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cap.description}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <footer className="px-4 sm:px-10 py-6 text-xs text-muted-foreground border-t flex flex-wrap items-center justify-between gap-2">
        <span>
          {instance.footerNote || `© ${new Date().getFullYear()} ${brand}`}
        </span>
        {instance.supportEmail && (
          <a className="hover:text-foreground" href={`mailto:${instance.supportEmail}`}>{instance.supportEmail}</a>
        )}
      </footer>

      {openMode === "inline" && openCap && (
        <div className="px-4 sm:px-10 pb-8 max-w-5xl w-full mx-auto">
          <InlineCapability cap={openCap} path={resolvedPath(openCap)} />
        </div>
      )}

      <Sheet open={openMode !== "inline" && !!openCap} onOpenChange={(o) => !o && setOpenCap(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="flex items-center justify-between gap-3 text-base">
              <span>{openCap?.label}</span>
              {openCap && resolvedPath(openCap) && (
                <a
                  href={resolvedPath(openCap)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            {openCap?.key === "agent.chat" ? (
              <PublicAgentPanel brand={brand} />
            ) : openCap && resolvedPath(openCap) ? (
              <iframe
                title={openCap.label}
                src={resolvedPath(openCap)!}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="p-6 space-y-4 text-sm">
                <p className="text-muted-foreground">
                  This capability runs inside the team workspace. Sign in to use it.
                </p>
                {openCap?.saasPath && (
                  <Button asChild>
                    <a href={openCap.saasPath}>Open in app</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InlineCapability({ cap, path }: { cap: Capability; path: string | null }) {
  if (cap.key === "agent.chat") return <PublicAgentPanel brand="Thermi" />;
  if (!path) return null;

  return (
    <Card className="surface-raised overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="text-sm font-medium">{cap.label}</div>
          <a href={path} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <iframe title={cap.label} src={path} className="h-[680px] w-full border-0 bg-background" />
      </CardContent>
    </Card>
  );
}

function PublicAgentPanel({ brand }: { brand: string }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: `Hi — I can help with booking questions, check-in, packages, or getting a message to ${brand}.` },
  ]);
  const [input, setInput] = useState("");

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "assistant", text: "Got it. I can collect your details here, or you can use the booking/sign-up tile for the fastest handoff." },
    ]);
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col bg-background">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Bot className="h-3.5 w-3.5" /></span>}
            <div className={`max-w-[82%] rounded-md border px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" className="min-h-11 flex-1 rounded-md border bg-background px-3 text-sm" />
        <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
