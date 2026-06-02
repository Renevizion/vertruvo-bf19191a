import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MarkdownText } from "@/components/automations/MarkdownText";

interface AgentInsightsCardProps {
  contextType: 'lead' | 'contact' | 'kpi' | 'task' | 'conversation' | 'sheets';
  contextId?: string;
  insightType: string;
  contextData: any;
  title?: string;
  enabled?: boolean;
  renderOutput?: boolean;
  onInsightGenerated?: (insight: any) => void;
}

export function AgentInsightsCard({ 
  contextType, 
  contextId, 
  insightType, 
  contextData,
  title = "AI Insights",
  enabled = true,
  renderOutput = true,
  onInsightGenerated,
}: AgentInsightsCardProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [cached, setCached] = useState(false);
  const { toast } = useToast();

  // Removed auto-fetch - insights are now opt-in only

  const fetchInsights = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mistral-agent', {
        body: { 
          contextType, 
          contextId, 
          insightType, 
          contextData,
          forceRefresh 
        }
      });

      if (error) throw error;

      setInsights(data.insights);
      setCached(data.cached);
      onInsightGenerated?.({ ...data.insights, cached: data.cached, model: data.model, createdAt: data.created_at || new Date().toISOString() });
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast({
        title: "Failed to load insights",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  const compact = contextType === "task";

  return (
    <Card className={compact ? "border-border/60 bg-background/70 shadow-none" : "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"}>
      <CardHeader className={compact ? "px-3 py-2" : "pb-3"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={compact ? "h-3.5 w-3.5 text-primary" : "h-4 w-4 text-primary"} />
            <CardTitle className={compact ? "text-xs font-medium" : "text-base"}>{title}</CardTitle>
            {cached && (
              <Badge variant="secondary" className="text-xs">
                Cached
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-3 pb-3 pt-0" : undefined}>
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </div>
        ) : insights && renderOutput ? (
          <div className="space-y-2">
            {typeof insights.content === 'string' ? (
              <MarkdownText content={insights.content} className="space-y-2 text-sm leading-6 text-muted-foreground" />
            ) : (
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(insights, null, 2)}
              </pre>
            )}
          </div>
        ) : insights && !renderOutput ? (
          <button
            type="button"
            onClick={() => fetchInsights(true)}
            className="group flex w-full items-center justify-between rounded-md border border-transparent px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-medium text-muted-foreground">Saved to reports</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fetchInsights(false)}
            className={compact
              ? "group flex w-full items-center justify-between rounded-md border bg-background/60 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
              : "group w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-5 text-left transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
            }
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className={compact ? "flex items-center gap-2" : "space-y-1"}>
                <span className={compact ? "block text-xs font-medium text-foreground" : "block text-sm font-medium text-foreground"}>Analyze</span>
                {!compact && (
                  <span className="block text-xs leading-5 text-muted-foreground">
                    Produces a concise suggestion set when you need it; nothing runs automatically.
                  </span>
                )}
              </span>
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  );
}