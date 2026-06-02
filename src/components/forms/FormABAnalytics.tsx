import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Trophy, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VariantStats {
  variantId: string;
  variantName: string;
  views: number;
  submissions: number;
  conversionRate: number;
  avgTimeToSubmit: number;
}

interface FormABAnalyticsProps {
  formId: string;
  onApplyWinner?: (winningVariantId: string) => void;
}

export function FormABAnalytics({ formId, onApplyWinner }: FormABAnalyticsProps) {
  const [variants, setVariants] = useState<VariantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [formId]);

  const loadAnalytics = async () => {
    try {
      // Get all active variants
      const { data: variantData, error: variantError } = await supabase
        .from("form_ab_tests")
        .select("id, variant_name")
        .eq("form_id", formId)
        .eq("is_active", true);

      if (variantError) throw variantError;

      if (!variantData || variantData.length === 0) {
        setVariants([]);
        setLoading(false);
        return;
      }

      // Get metrics for each variant
      const stats: VariantStats[] = await Promise.all(
        variantData.map(async (variant) => {
          // Get view count (all metrics entries for this variant)
          const { count: viewCount } = await supabase
            .from("form_metrics")
            .select("*", { count: "exact", head: true })
            .eq("form_id", formId)
            .eq("variant_id", variant.id);

          // Get submission count (converted = true)
          const { count: submissionCount } = await supabase
            .from("form_metrics")
            .select("*", { count: "exact", head: true })
            .eq("form_id", formId)
            .eq("variant_id", variant.id)
            .eq("converted", true);

          // Get average time to submit
          const { data: timeData } = await supabase
            .from("form_metrics")
            .select("time_to_submit")
            .eq("form_id", formId)
            .eq("variant_id", variant.id)
            .eq("converted", true)
            .not("time_to_submit", "is", null);

          const avgTime = timeData && timeData.length > 0
            ? timeData.reduce((sum, m) => sum + (m.time_to_submit || 0), 0) / timeData.length
            : 0;

          const views = viewCount || 0;
          const submissions = submissionCount || 0;
          const conversionRate = views > 0 ? (submissions / views) * 100 : 0;

          return {
            variantId: variant.id,
            variantName: variant.variant_name,
            views,
            submissions,
            conversionRate,
            avgTimeToSubmit: avgTime,
          };
        })
      );

      // Add control (no variant) stats
      const { count: controlViews } = await supabase
        .from("form_metrics")
        .select("*", { count: "exact", head: true })
        .eq("form_id", formId)
        .is("variant_id", null);

      const { count: controlSubmissions } = await supabase
        .from("form_metrics")
        .select("*", { count: "exact", head: true })
        .eq("form_id", formId)
        .is("variant_id", null)
        .eq("converted", true);

      const { data: controlTimeData } = await supabase
        .from("form_metrics")
        .select("time_to_submit")
        .eq("form_id", formId)
        .is("variant_id", null)
        .eq("converted", true)
        .not("time_to_submit", "is", null);

      const controlAvgTime = controlTimeData && controlTimeData.length > 0
        ? controlTimeData.reduce((sum, m) => sum + (m.time_to_submit || 0), 0) / controlTimeData.length
        : 0;

      const controlStats: VariantStats = {
        variantId: "control",
        variantName: "Control (Original)",
        views: controlViews || 0,
        submissions: controlSubmissions || 0,
        conversionRate:
          controlViews && controlViews > 0
            ? ((controlSubmissions || 0) / controlViews) * 100
            : 0,
        avgTimeToSubmit: controlAvgTime,
      };

      setVariants([controlStats, ...stats]);
    } catch (error) {
      console.error("Error loading A/B analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load A/B testing analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWinner = async (variantId: string, variantName: string) => {
    if (variantId === "control") {
      toast({
        title: "Already Applied",
        description: "Control is the current active form",
      });
      return;
    }

    if (onApplyWinner) {
      onApplyWinner(variantId);
    }

    toast({
      title: "Winner Applied",
      description: `${variantName} is now the active form`,
    });
  };

  const winner = variants.reduce(
    (best, current) =>
      current.conversionRate > best.conversionRate ? current : best,
    variants[0]
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading analytics...</div>;
  }

  if (variants.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">No A/B test data available. Create variants to start testing.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {variants.map((variant) => {
          const isWinner = variant.variantId === winner?.variantId && variants.length > 1;
          const improvement =
            variant.variantId !== "control" && variants[0]
              ? variant.conversionRate - variants[0].conversionRate
              : 0;

          return (
            <Card
              key={variant.variantId}
              className={`p-4 ${isWinner ? "border-primary border-2" : ""}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    {variant.variantName}
                    {isWinner && <Trophy className="h-4 w-4 text-primary" />}
                  </h4>
                  {variant.variantId !== "control" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleApplyWinner(variant.variantId, variant.variantName)
                      }
                    >
                      Apply Winner
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">
                      {variant.conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{variant.submissions}</p>
                    <p className="text-xs text-muted-foreground">
                      Submissions / {variant.views} views
                    </p>
                  </div>
                </div>

                {improvement !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      improvement > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {improvement > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>
                      {improvement > 0 ? "+" : ""}
                      {improvement.toFixed(1)}% vs control
                    </span>
                  </div>
                )}

                {variant.avgTimeToSubmit > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Avg time to submit: {Math.round(variant.avgTimeToSubmit)}s
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
