import { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { ShellChrome } from "@/shells/ShellChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Calendar, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withTelemetry } from "@/lib/shell-health";
import { CAPABILITIES } from "@/capabilities/registry";
import { InlineError } from "@/lib/aaa";

export default function WidgetShell() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"menu" | "capture" | "chat" | "book">("menu");
  const [slug, setSlug] = useState<string | null>(null);

  // Resolve a public booking slug (first workspace with one) so "Book" actually opens it.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("workspaces").select("slug").not("slug", "is", null).limit(1).maybeSingle();
      setSlug((data as { slug?: string } | null)?.slug ?? null);
    })();
  }, []);

  return (
    <ShellChrome
      shell="widget"
      title="Thermi Widget"
      subtitle="Embeddable on any third-party site"
      accent="bg-gradient-to-br from-emerald-500 to-emerald-700"
      defaultCapability="agent.chat"
      onPickCapability={(k) => {
        const cap = CAPABILITIES[k];
        if (k === "crm.capture") setMode("capture");
        else if (k === "agent.chat") setMode("chat");
        else if (k === "booking.public") setMode("book");
        else if (cap?.saasPath) navigate(cap.saasPath);
        else toast.info(`${cap?.label ?? k} opens in workspace`);
      }}
    >
      <section aria-label="Widget primary actions">
        {mode === "menu" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ActionCard icon={<MessageCircle className="h-5 w-5" />} title="Ask the agent" desc="Chat with our AI assistant" onClick={() => setMode("chat")} />
            <ActionCard icon={<Calendar className="h-5 w-5" />} title="Book a time" desc="Pick a slot that works" onClick={() => setMode("book")} />
            <ActionCard icon={<FileText className="h-5 w-5" />} title="Leave a note" desc="We'll get back to you" onClick={() => setMode("capture")} />
          </div>
        )}
        {mode === "capture" && <CaptureForm onDone={() => setMode("menu")} />}
        {mode === "chat" && <ChatPanel onDone={() => setMode("menu")} />}
        {mode === "book" && <BookPanel slug={slug} onDone={() => setMode("menu")} />}
      </section>
    </ShellChrome>
  );
}

function ActionCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <Card role="button" tabIndex={0} aria-label={title} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }} className="cursor-pointer hover:bg-accent transition-colors min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div><div className="text-sm font-medium">{title}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
      </CardContent>
    </Card>
  );
}

function CaptureForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      await withTelemetry({ shell: "widget", capabilityKey: "crm.capture" }, async () => {
        const { error } = await supabase.functions.invoke("form-submit", {
          body: { source: "widget", name, email, message: msg },
        });
        if (error) throw error;
      });
      toast.success("Thanks — we'll be in touch.");
      onDone();
    } catch (e2) {
      const m = e2 instanceof Error ? e2.message : "Could not send. Try again.";
      setErr(m);
    } finally { setBusy(false); }
  }

  return (
    <form aria-label="Leave a note" onSubmit={submit} className="space-y-3 max-w-md">
      <Input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" className="min-h-[44px]" />
      <Input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" className="min-h-[44px]" />
      <Textarea placeholder="What's up?" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Message" />
      {err && <InlineError message={err} onRetry={() => setErr(null)} />}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="min-h-[44px]">
          {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{busy ? "Sending…" : "Send"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} className="min-h-[44px]">Back</Button>
      </div>
    </form>
  );
}

function ChatPanel({ onDone }: { onDone: () => void }) {
  return (
    <Card>
      <CardContent className="p-0">
        <iframe title="Thermi Agent" src="/shell/agent" className="w-full h-[520px] rounded-md border-0" />
        <div className="p-3 border-t flex justify-end">
          <Button variant="ghost" size="sm" onClick={onDone}>Back to menu</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BookPanel({ slug, onDone }: { slug: string | null; onDone: () => void }) {
  if (!slug) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">No public booking page is configured for this workspace yet. Set one up in <Link className="underline" to="/booking-sheet">Booking</Link>.</p>
          <Button variant="outline" onClick={onDone}>Back</Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <iframe title="Book a time" src={`/book/${slug}`} className="w-full h-[640px] rounded-md border-0" />
        <div className="p-3 border-t flex justify-end">
          <Button variant="ghost" size="sm" onClick={onDone}>Back to menu</Button>
        </div>
      </CardContent>
    </Card>
  );
}
