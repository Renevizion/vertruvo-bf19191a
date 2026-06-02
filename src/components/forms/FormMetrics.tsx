import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users } from "lucide-react";

interface FormMetricsProps {
  formId: string;
}

export function FormMetrics({ formId }: FormMetricsProps) {
  const { data: metrics } = useQuery({
    queryKey: ['form-metrics', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_metrics')
        .select('*')
        .eq('form_id', formId);
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const converted = data?.filter(m => m.converted).length || 0;
      const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';
      
      // Get submissions from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSubmissions = data?.filter(
        m => new Date(m.submitted_at) >= sevenDaysAgo
      ).length || 0;
      
      return {
        total,
        converted,
        conversionRate,
        recentSubmissions,
      };
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Form Analytics Tracking</CardTitle>
          <CardDescription>
            <strong>Real-time tracking:</strong> Every form submission records device type, browser, time-to-submit, IP, referrer, and session ID. This data powers conversion metrics and A/B test comparisons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.total || 0}</div>
                <p className="text-xs text-muted-foreground">real submissions tracked</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.conversionRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.converted || 0} became leads
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.recentSubmissions || 0}</div>
                <p className="text-xs text-muted-foreground">recent submissions</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}