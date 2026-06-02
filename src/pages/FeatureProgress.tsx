import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface FeatureStatus {
  id: string;
  name: string;
  description: string;
  category: string;
  completed: boolean;
  completedAt?: string;
}

export const FeatureProgress = () => {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Get workspace ID
  useEffect(() => {
    const getWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (workspaces?.[0]) {
        setWorkspaceId(workspaces[0].id);
      }
    };

    getWorkspace();
  }, []);

  // Query onboarding progress
  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding-progress', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('step_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Calculate completion percentage
  const totalFeatures = progress?.length || 0;
  const completedFeatures = progress?.filter(p => p.completed).length || 0;
  const completionPercentage = totalFeatures > 0 ? (completedFeatures / totalFeatures) * 100 : 0;

  // Group features by category
  const groupedFeatures: Record<string, typeof progress> = {};
  progress?.forEach(feature => {
    const category = feature.step_name.split(':')[0] || 'General';
    if (!groupedFeatures[category]) {
      groupedFeatures[category] = [];
    }
    groupedFeatures[category].push(feature);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Platform Feature Status</h1>
        <p className="text-muted-foreground">
          Track the implementation status of all platform features
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>
            {completedFeatures} of {totalFeatures} features completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={completionPercentage} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{Math.round(completionPercentage)}% complete</span>
              <span>{totalFeatures - completedFeatures} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      <div className="grid gap-6">
        {Object.entries(groupedFeatures).map(([category, features]) => {
          const categoryCompleted = features.filter(f => f.completed).length;
          const categoryTotal = features.length;
          const categoryPercentage = (categoryCompleted / categoryTotal) * 100;

          return (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{category}</CardTitle>
                    <CardDescription>
                      {categoryCompleted} of {categoryTotal} features completed
                    </CardDescription>
                  </div>
                  <Badge variant={categoryCompleted === categoryTotal ? "default" : "secondary"}>
                    {Math.round(categoryPercentage)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={categoryPercentage} className="h-2" />
                  
                  <div className="space-y-3">
                    {features.map(feature => (
                      <div 
                        key={feature.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        {feature.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm leading-tight">
                            {feature.step_name.split(':')[1] || feature.step_name}
                          </h4>
                          {feature.data && typeof feature.data === 'object' && 'description' in feature.data && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {String(feature.data.description)}
                            </p>
                          )}
                        </div>
                        {feature.completed && feature.completed_at && (
                          <Badge variant="outline" className="flex-shrink-0">
                            Completed
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {Object.keys(groupedFeatures).length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Circle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No Progress Data Yet</h3>
              <p className="text-sm text-muted-foreground">
                Feature progress will be tracked here as you use the platform
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
