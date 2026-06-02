import { useMemo, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Minus, Loader2, ArrowRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { deriveLeadSignals, type LeadSignalInput, type SuggestedMove } from "@/lib/lead-signals";

interface LeadIntelligenceStripProps {
  lead: LeadSignalInput['lead'];
  activities: LeadSignalInput['activities'];
  stageName?: string | null;
  agentEnabled: boolean;
  onAction: (move: SuggestedMove) => void;
}

const bucketStyles: Record<string, string> = {
  Hot: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
  Warm: 'bg-primary/10 text-primary border-primary/30',
  Cold: 'bg-muted text-muted-foreground border-border',
};

export function LeadIntelligenceStrip({
  lead, activities, stageName, agentEnabled, onAction,
}: LeadIntelligenceStripProps) {
  const signals = useMemo(
    () => deriveLeadSignals({ lead, activities, stageName }),
    [lead, activities, stageName],
  );
  const { toast } = useToast();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [altMoves, setAltMoves] = useState<SuggestedMove[] | null>(null);
  const [loadingAlts, setLoadingAlts] = useState(false);

  const expandWithAI = async () => {
    if (loadingSummary) return;
    setLoadingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('mistral-agent', {
        body: {
          contextType: 'lead',
          contextId: lead.id,
          insightType: 'summary',
          contextData: { ...lead, activities: activities.slice(0, 8), stageName },
          forceRefresh: false,
        },
      });
      if (error) throw error;
      const content = typeof data?.insights?.content === 'string'
        ? data.insights.content
        : JSON.stringify(data?.insights ?? {});
      setAiSummary(content);
    } catch (e: any) {
      toast({ title: 'Could not expand', description: e?.message || 'Try again later', variant: 'destructive' });
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadAlternates = async () => {
    if (loadingAlts || altMoves) return;
    setLoadingAlts(true);
    try {
      const { data, error } = await supabase.functions.invoke('mistral-agent', {
        body: {
          contextType: 'lead',
          contextId: lead.id,
          insightType: 'suggestion',
          contextData: { ...lead, activities: activities.slice(0, 8), stageName },
          forceRefresh: false,
        },
      });
      if (error) throw error;
      // Best-effort parse — fall back to a rules table.
      const raw: string = typeof data?.insights?.content === 'string' ? data.insights.content : '';
      const parsed = raw
        .split(/\n+/)
        .map((l) => l.replace(/^[-•\d.\s]+/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
        .map<SuggestedMove>((label) => ({ label, action: 'task' }));
      setAltMoves(parsed.length ? parsed : [
        { label: 'Send a check-in email', action: 'send_email' },
        { label: 'Schedule a call', action: 'book' },
        { label: 'Add a follow-up task', action: 'task' },
      ]);
    } catch {
      setAltMoves([
        { label: 'Send a check-in email', action: 'send_email' },
        { label: 'Schedule a call', action: 'book' },
        { label: 'Add a follow-up task', action: 'task' },
      ]);
    } finally {
      setLoadingAlts(false);
    }
  };

  const TrendIcon = signals.trend > 0 ? TrendingUp : signals.trend < 0 ? TrendingDown : Minus;
  const trendColor = signals.trend > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : signals.trend < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground';

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-3.5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* SCORE */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-help shrink-0",
                bucketStyles[signals.bucket],
              )}>
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-wider opacity-70 font-medium">Score</span>
                  <span className="text-lg font-bold tabular-nums">{signals.score}</span>
                </div>
                <div className="h-8 w-px bg-current opacity-20" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold">{signals.bucket}</span>
                  <span className={cn("text-[11px] flex items-center gap-0.5 tabular-nums", trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    {signals.trend > 0 ? '+' : ''}{signals.trend} 7d
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium mb-1 text-xs">How this score was built</p>
              <ul className="space-y-0.5 text-xs">
                {signals.reasoning.map((r, i) => (
                  <li key={i} className="text-muted-foreground">{r}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>

          {/* SUMMARY */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground/90 leading-snug">
              {aiSummary ? aiSummary : signals.summaryLine}
            </p>
            {agentEnabled && !aiSummary && (
              <button
                type="button"
                onClick={expandWithAI}
                disabled={loadingSummary}
                className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary hover:text-primary/80 transition-colors disabled:opacity-60"
              >
                {loadingSummary
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Reading the thread…</>
                  : <><Sparkles className="h-3 w-3" /> Expand with AI</>}
              </button>
            )}
            {aiSummary && (
              <button
                type="button"
                onClick={() => setAiSummary(null)}
                className="inline-flex items-center gap-1 mt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Show signals
              </button>
            )}
          </div>

          {/* NEXT MOVE */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onAction(signals.suggestedMove)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-2 text-xs font-medium"
                >
                  {signals.suggestedMove.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              {signals.suggestedMove.hint && (
                <TooltipContent side="bottom"><p className="text-xs">{signals.suggestedMove.hint}</p></TooltipContent>
              )}
            </Tooltip>
            {agentEnabled && (
              <DropdownMenu onOpenChange={(o) => o && loadAlternates()}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-border/60 hover:bg-accent transition-colors h-8 w-8"
                    aria-label="More moves"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {loadingAlts && (
                    <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                    </div>
                  )}
                  {!loadingAlts && (altMoves ?? []).map((m, i) => (
                    <DropdownMenuItem key={i} onClick={() => onAction(m)} className="text-xs">
                      <Sparkles className="h-3 w-3 mr-2 text-primary" />
                      {m.label}
                    </DropdownMenuItem>
                  ))}
                  {!loadingAlts && !altMoves && (
                    <div className="px-2 py-2 text-xs text-muted-foreground">More moves appear here</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
