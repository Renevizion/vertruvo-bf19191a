import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Phone, MessageSquare, FileText, Calendar, StickyNote, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type TimelineEvent = {
  occurred_at: string;
  kind: string;
  source: string;
  title: string;
  summary: string | null;
  ref_table: string;
  ref_id: string;
  payload: Record<string, unknown>;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "conversation", label: "Conversations" },
  { key: "booking", label: "Bookings" },
  { key: "system", label: "System" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const iconFor = (source: string) => {
  switch (source) {
    case "voice":
      return Phone;
    case "email":
    case "sms":
    case "instagram":
      return MessageSquare;
    case "form":
      return FileText;
    case "booking":
      return Calendar;
    default:
      return StickyNote;
  }
};

interface Props {
  contactId: string;
}

export const ContactTimeline = ({ contactId }: Props) => {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [recap, setRecap] = useState<string | null>(null);
  const [recapping, setRecapping] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contact-timeline", contactId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_contact_timeline", {
        _contact_id: contactId,
        _limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as TimelineEvent[];
    },
    enabled: !!contactId,
  });

  const events = (data ?? []).filter((e) => filter === "all" || e.kind === filter);

  const handleRecap = async () => {
    setRecapping(true);
    setRecap(null);
    try {
      const top = (data ?? []).slice(0, 30);
      const { data: res, error } = await supabase.functions.invoke("recap-contact-timeline", {
        body: { events: top },
      });
      if (error) throw error;
      setRecap(res?.recap ?? "No recap returned");
    } catch (err) {
      toast.error("Recap unavailable", { description: (err as Error).message });
    } finally {
      setRecapping(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "ghost"}
              className="h-7 rounded-full px-3 text-[11px]"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-[11px]"
          onClick={handleRecap}
          disabled={recapping || !events.length}
        >
          {recapping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Recap
        </Button>
      </div>

      {recap && (
        <div className="mx-3 mb-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-foreground whitespace-pre-line">
          {recap}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No activity yet. Calls, messages, forms, and bookings will appear here automatically.
          </div>
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-4">
            {events.map((e, i) => {
              const Icon = iconFor(e.source);
              return (
                <li key={`${e.ref_table}-${e.ref_id}-${i}`} className="relative">
                  <span className="absolute -left-[22px] flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border">
                    <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                  </span>
                  <div className="rounded-md border bg-card p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium leading-tight">{e.title}</p>
                      <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[9px] uppercase">
                        {e.source}
                      </Badge>
                    </div>
                    {e.summary && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{e.summary}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(e.occurred_at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </ScrollArea>
    </div>
  );
};

export default ContactTimeline;
