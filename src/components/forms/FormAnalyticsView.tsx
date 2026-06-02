import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, LineChart } from "lucide-react";
import { FormABAnalytics } from "./FormABAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormAnalyticsSummary {
  id: string;
  form_id: string;
  views: number;
  submissions: number;
  conversion_rate: number;
  avg_time_to_submit: number;
  period_start: string;
  period_end: string;
}

interface FormAnalyticsViewProps {
  formId: string;
}

export function FormAnalyticsView({ formId }: FormAnalyticsViewProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['form-analytics', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_analytics_summary')
        .select('*')
        .eq('form_id', formId)
        .order('period_start', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as FormAnalyticsSummary[];
    },
    enabled: !!formId
  });

  const { data: metrics } = useQuery({
    queryKey: ['form-metrics', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_metrics')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: !!formId
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading analytics...</div>;
  }

  const totalViews = analytics?.reduce((sum, a) => sum + a.views, 0) || 0;
  const totalSubmissions = analytics?.reduce((sum, a) => sum + a.submissions, 0) || 0;
  const avgConversionRate = analytics?.length 
    ? analytics.reduce((sum, a) => sum + a.conversion_rate, 0) / analytics.length 
    : 0;
  const avgTimeToSubmit = analytics?.length
    ? analytics.reduce((sum, a) => sum + (a.avg_time_to_submit || 0), 0) / analytics.length
    : 0;

  const deviceBreakdown = Array.isArray(metrics) ? metrics.reduce((acc, m) => {
    const device = m.device_type || 'unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};

  return (
    <Tabs defaultValue="overall" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overall">Overall Performance</TabsTrigger>
        <TabsTrigger value="ab">A/B Testing</TabsTrigger>
      </TabsList>

      <TabsContent value="overall" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Views</CardDescription>
              <CardTitle className="text-3xl">{totalViews}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Submissions</CardDescription>
              <CardTitle className="text-3xl">{totalSubmissions}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Conversion Rate</CardDescription>
              <CardTitle className="text-3xl">
                {avgConversionRate.toFixed(1)}%
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Time to Submit</CardDescription>
              <CardTitle className="text-3xl">
                {Math.round(avgTimeToSubmit)}s
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Conversion Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics || analytics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available yet</p>
              ) : (
                <div className="space-y-2">
                  {analytics.slice(0, 7).map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.period_start).toLocaleDateString()}
                      </span>
                      <Badge variant="secondary">
                        {item.conversion_rate.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Device Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!deviceBreakdown || Object.keys(deviceBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground">No device data available</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(deviceBreakdown).map(([device, count]) => (
                    <div key={device} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{device}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="ab">
        <FormABAnalytics formId={formId} />
      </TabsContent>
    </Tabs>
  );
}
