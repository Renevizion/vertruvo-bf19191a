import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface WorkflowRecommendationsProps {
  workflowId: string;
}

export function WorkflowRecommendations({ workflowId }: WorkflowRecommendationsProps) {
  const queryClient = useQueryClient();

  // Trigger recommendation generation when component mounts
  const generateRecommendations = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-workflow-recommendations');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-recommendations"] });
    },
  });

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["workflow-recommendations", workflowId],
    queryFn: async () => {
      // Generate fresh recommendations first
      await supabase.functions.invoke('generate-workflow-recommendations');
      
      const { data, error } = await supabase
        .from("workflow_recommendations")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("is_applied", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const applyRecommendation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_recommendations")
        .update({ is_applied: true, applied_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-recommendations", workflowId] });
      toast.success("Recommendation applied");
    },
  });

  const dismissRecommendation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_recommendations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-recommendations", workflowId] });
      toast.success("Recommendation dismissed");
    },
  });

  if (isLoading) return null;
  
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4" />
            No Recommendations Yet
          </CardTitle>
          <CardDescription>
            Recommendations are generated automatically based on workflow execution data. Execute this workflow a few times to get optimization suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => generateRecommendations.mutate()} 
            disabled={generateRecommendations.isPending}
            variant="outline"
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateRecommendations.isPending ? 'Analyzing...' : 'Generate Recommendations Now'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4" />
          Optimization Suggestions
        </CardTitle>
        <CardDescription>AI-powered recommendations to improve this workflow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-2 capitalize text-xs">
                      {rec.recommendation_type.replace(/_/g, " ")}
                    </Badge>
                    <h4 className="font-medium text-sm">{rec.title}</h4>
                    {rec.description && (
                      <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    )}
                    {rec.expected_improvement && (
                      <p className="text-xs text-primary mt-2">
                        Expected impact: {rec.expected_improvement}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => applyRecommendation.mutate(rec.id)}
                    disabled={applyRecommendation.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissRecommendation.mutate(rec.id)}
                    disabled={dismissRecommendation.isPending}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
