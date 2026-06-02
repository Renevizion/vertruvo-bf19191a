import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";
import { Badge } from "@/components/ui/badge";

export const FeatureProgressWidget = () => {
  const { workspaceId, stats, isLoading, initialize, autoDetect, status } = useFeatureTracking();

  // Auto-initialize on mount if needed
  useEffect(() => {
    if (workspaceId && status && status.length === 0 && !isLoading) {
      console.log('[FeatureProgressWidget] No progress data, initializing...');
      initialize();
      
      // Auto-detect after initialization
      setTimeout(() => {
        autoDetect();
      }, 1000);
    }
  }, [workspaceId, status, isLoading]);

  const recentCompletions = status
    ?.filter(f => f.completed)
    ?.sort((a, b) => {
      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Features</CardTitle>
          <CardDescription>Loading feature status...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Platform Features</CardTitle>
            <CardDescription>
              {stats.completed} of {stats.total} features active
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => autoDetect()}
            title="Refresh feature detection"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">{Math.round(stats.percentage)}%</span>
          </div>
          <Progress value={stats.percentage} className="h-3" />
        </div>

        {/* Recent Completions */}
        {recentCompletions && recentCompletions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recently Activated</h4>
            <div className="space-y-2">
              {recentCompletions.map(feature => (
                <div
                  key={feature.id}
                  className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/50"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {feature.step_name.split(':')[1] || feature.step_name}
                    </p>
                    {feature.data && typeof feature.data === 'object' && 'category' in feature.data && (
                      <Badge variant="outline" className="mt-1">
                        {String(feature.data.category)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View All Link */}
        <Link to="/feature-progress">
          <Button variant="outline" className="w-full">
            View All Features
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completed}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {stats.total - stats.completed}
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {stats.total}
            </p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
