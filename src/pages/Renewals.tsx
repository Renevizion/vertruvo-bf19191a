import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RenewalCampaignManager } from "@/components/renewals/RenewalCampaignManager";
import { ClassRostersOverview } from "@/components/rosters/ClassRostersOverview";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarClock, Megaphone } from "lucide-react";

export default function Renewals() {
  const { data: ws } = useQuery({
    queryKey: ["workspace-renewals-page"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["renewal-stats", ws?.workspace_id],
    enabled: !!ws?.workspace_id,
    queryFn: async () => {
      const wsId = ws!.workspace_id;
      const in14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const [bookings, rosters, campaigns] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId).lte("end_date", in14),
        supabase.from("program_rosters").select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId).eq("status", "renewing"),
        supabase.from("renewal_campaigns" as any).select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId),
      ]);
      return {
        upcoming: bookings.count || 0,
        renewing: rosters.count || 0,
        campaigns: campaigns.count || 0,
      };
    },
  });

  const tiles = [
    { icon: CalendarClock, label: "Ending in 14 days", value: stats?.upcoming ?? "—" },
    { icon: Users, label: "Marked renewing", value: stats?.renewing ?? "—" },
    { icon: Megaphone, label: "Active campaigns", value: stats?.campaigns ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relationships"
        title="Renewals"
        description="One surface for rosters, expiring periods, and the outreach that keeps clients close."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label} className="border-border/60">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
                  <p className="text-2xl font-semibold leading-tight">{t.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="rosters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rosters">Rosters</TabsTrigger>
          <TabsTrigger value="campaigns">Outreach</TabsTrigger>
        </TabsList>
        <TabsContent value="rosters" className="space-y-4">
          {ws?.workspace_id && <ClassRostersOverview workspaceId={ws.workspace_id} />}
        </TabsContent>
        <TabsContent value="campaigns" className="space-y-4">
          <RenewalCampaignManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
