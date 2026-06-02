import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_at: string | null;
  metrics: {
    total_sent: number;
    total_opened: number;
    total_clicked: number;
    total_unsubscribed: number;
  } | null;
}

export const EmailCampaignPerformance = () => {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['email-campaigns-performance'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data: workspaceData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();

      if (!workspaceData) return [];

      const { data: campaignData } = await supabase
        .from('email_campaigns')
        .select(`
          id,
          name,
          status,
          sent_at
        `)
        .eq('workspace_id', workspaceData.workspace_id)
        .in('status', ['sent', 'sending'])
        .order('sent_at', { ascending: false })
        .limit(5);

      if (!campaignData) return [];

      // Fetch metrics for each campaign
      const campaignsWithMetrics = await Promise.all(
        campaignData.map(async (campaign) => {
          const { data: metrics } = await supabase
            .from('email_campaign_metrics')
            .select('*')
            .eq('campaign_id', campaign.id)
            .single();

          return {
            ...campaign,
            metrics,
          };
        })
      );

      return campaignsWithMetrics as Campaign[];
    },
  });

  const overallStats = campaigns?.reduce(
    (acc, campaign) => {
      if (!campaign.metrics) return acc;
      return {
        totalSent: acc.totalSent + campaign.metrics.total_sent,
        totalOpened: acc.totalOpened + campaign.metrics.total_opened,
        totalClicked: acc.totalClicked + campaign.metrics.total_clicked,
        totalUnsubscribed: acc.totalUnsubscribed + campaign.metrics.total_unsubscribed,
      };
    },
    { totalSent: 0, totalOpened: 0, totalClicked: 0, totalUnsubscribed: 0 }
  ) || { totalSent: 0, totalOpened: 0, totalClicked: 0, totalUnsubscribed: 0 };

  const openRate = overallStats.totalSent > 0
    ? ((overallStats.totalOpened / overallStats.totalSent) * 100).toFixed(1)
    : '0.0';
  const clickRate = overallStats.totalSent > 0
    ? ((overallStats.totalClicked / overallStats.totalSent) * 100).toFixed(1)
    : '0.0';
  const unsubscribeRate = overallStats.totalSent > 0
    ? ((overallStats.totalUnsubscribed / overallStats.totalSent) * 100).toFixed(1)
    : '0.0';

  const getOpenRate = (campaign: Campaign) => {
    if (!campaign.metrics || campaign.metrics.total_sent === 0) return '0';
    return ((campaign.metrics.total_opened / campaign.metrics.total_sent) * 100).toFixed(0);
  };

  const getClickRate = (campaign: Campaign) => {
    if (!campaign.metrics || campaign.metrics.total_sent === 0) return '0';
    return ((campaign.metrics.total_clicked / campaign.metrics.total_sent) * 100).toFixed(0);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Email Campaign Performance</h2>
        <div className="text-center py-8 text-muted-foreground">Loading campaign data...</div>
      </Card>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Email Campaign Performance</h2>
        <div className="text-center py-12">
          <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Email Campaigns Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first email campaign to start tracking performance metrics.
          </p>
          <Button variant="outline" asChild>
            <Link to="/settings?tab=email">Configure Email Services</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6">Email Campaign Performance</h2>

      {/* Overall Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold">{overallStats.totalSent.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Sent</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-3xl font-bold text-green-600">{openRate}%</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-muted-foreground">Open Rate</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-3xl font-bold text-blue-600">{clickRate}%</p>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-sm text-muted-foreground">Click Rate</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-3xl font-bold text-orange-600">{unsubscribeRate}%</p>
            <TrendingDown className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-sm text-muted-foreground">Unsubscribe</p>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div>
        <h3 className="text-sm font-medium mb-4">Recent Campaigns</h3>
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {campaign.sent_at ? formatDistanceToNow(new Date(campaign.sent_at), { addSuffix: true }) : 'Unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{getOpenRate(campaign)}%</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{getClickRate(campaign)}%</p>
                    <p className="text-xs text-muted-foreground">Click</p>
                  </div>
                  <Badge 
                    variant={campaign.status === 'sent' ? 'secondary' : 'default'}
                    className="capitalize"
                  >
                    {campaign.status}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Progress value={Number(getOpenRate(campaign))} className="h-2" />
                </div>
                <div className="flex-1">
                  <Progress value={Number(getClickRate(campaign))} className="h-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
