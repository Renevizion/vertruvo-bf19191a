import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, PhoneOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const ActiveCallsMonitor = () => {
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: workspace } = useQuery({
    queryKey: ['user-workspaces', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: activeCalls } = useQuery({
    queryKey: ['active-calls', workspace?.workspace_id],
    enabled: !!workspace?.workspace_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          id,
          phone_number,
          status,
          created_at,
          duration,
          contacts(name),
          leads(name),
          ai_agents(name)
        `)
        .eq('workspace_id', workspace!.workspace_id)
        .in('status', ['queued', 'ringing', 'in-progress'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Real-time subscription
  useEffect(() => {
    if (!workspace?.workspace_id) return;

    const channel = supabase
      .channel('active-calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `workspace_id=eq.${workspace.workspace_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-calls'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.workspace_id, queryClient]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { variant: "default" | "secondary" | "destructive", icon: any, label: string }> = {
      'queued': { variant: 'secondary', icon: PhoneCall, label: 'Queued' },
      'ringing': { variant: 'default', icon: PhoneCall, label: 'Ringing' },
      'in-progress': { variant: 'default', icon: PhoneCall, label: 'In Progress' },
    };
    
    return configs[status] || { variant: 'secondary' as const, icon: PhoneOff, label: status };
  };

  if (!activeCalls || activeCalls.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5 animate-pulse" />
          Active Calls ({activeCalls.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeCalls.map((call) => {
            const config = getStatusConfig(call.status);
            const Icon = config.icon;
            
            return (
              <div
                key={call.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {call.contacts?.name || call.leads?.name || call.phone_number}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {call.phone_number}
                    </p>
                    {call.ai_agents?.name && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {call.ai_agents.name}
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant={config.variant} className="flex items-center gap-1 ml-4">
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};