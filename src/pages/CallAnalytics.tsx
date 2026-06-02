import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Clock, TrendingUp, CheckCircle, XCircle, BarChart3, ChevronDown, User, FileText, Bot, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";


const CallAnalytics = () => {
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: workspace } = useQuery({
    queryKey: ['user-workspace', session?.user?.id],
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
    }
  });

  const { data: calls, isLoading } = useQuery({
    queryKey: ['call-analytics', workspace?.workspace_id],
    enabled: !!workspace?.workspace_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          call_templates(name),
          leads(name, phone),
          contacts(name, phone),
          ai_agents(name, type)
        `)
        .eq('workspace_id', workspace!.workspace_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Calculate metrics
  const totalCalls = calls?.length || 0;
  const completedCalls = calls?.filter(c => c.status === 'completed').length || 0;
  const failedCalls = calls?.filter(c => c.status === 'failed' || c.status === 'busy' || c.status === 'no-answer').length || 0;
  const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
  
  const totalDuration = calls?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0;
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  // Template usage
  const templateUsage = calls?.reduce((acc: any, call) => {
    if (call.call_templates?.name) {
      acc[call.call_templates.name] = (acc[call.call_templates.name] || 0) + 1;
    }
    return acc;
  }, {});

  const topTemplates = Object.entries(templateUsage || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  // Agent usage
  const agentUsage = calls?.reduce((acc: any, call) => {
    if (call.ai_agents?.name) {
      acc[call.ai_agents.name] = (acc[call.ai_agents.name] || 0) + 1;
    }
    return acc;
  }, {});

  const topAgents = Object.entries(agentUsage || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  // Status breakdown
  const statusBreakdown = calls?.reduce((acc: any, call) => {
    acc[call.status] = (acc[call.status] || 0) + 1;
    return acc;
  }, {});

  // Daily call volume for current month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dailyCallVolume = daysInMonth.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const count = calls?.filter(call => 
      format(new Date(call.created_at), 'yyyy-MM-dd') === dayStr
    ).length || 0;
    return {
      date: format(day, 'MMM dd'),
      count
    };
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'no-answer':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Call Analytics</h1>
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Call Analytics</h1>
        <p className="text-sm text-muted-foreground">Every call. Every outcome. Live.</p>
      </div>

      {/* Key Metrics — premium tabular tiles */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total calls", value: totalCalls.toLocaleString(), sub: "All time", icon: Phone },
          { label: "Success rate", value: `${successRate}%`, sub: `${completedCalls} completed`, icon: TrendingUp },
          { label: "Avg duration", value: formatDuration(avgDuration), sub: "Per call", icon: Clock },
          { label: "Failed", value: failedCalls.toLocaleString(), sub: `${totalCalls > 0 ? Math.round((failedCalls / totalCalls) * 100) : 0}% of total`, icon: XCircle },
        ].map(({ label, value, sub, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </Card>
        ))}
      </div>


      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Call Status Breakdown
            </CardTitle>
            <CardDescription>Distribution of call outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statusBreakdown || {}).map(([status, count]: any) => {
                const percentage = totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{status}</span>
                      <span className="font-medium">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Most Used Templates
            </CardTitle>
            <CardDescription>Top 5 call scripts</CardDescription>
          </CardHeader>
          <CardContent>
            {topTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No template usage data yet
              </div>
            ) : (
              <div className="space-y-3">
                {topTemplates.map(([name, count]: any, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="text-sm">{name}</span>
                    </div>
                    <span className="text-sm font-medium">{count} calls</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Most Active AI Agents
            </CardTitle>
            <CardDescription>Top performing agents</CardDescription>
          </CardHeader>
          <CardContent>
            {topAgents.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No agent usage data yet
              </div>
            ) : (
              <div className="space-y-3">
                {topAgents.map(([name, count]: any, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="text-sm">{name}</span>
                    </div>
                    <span className="text-sm font-medium">{count} calls</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Call Volume — compact, no rotated labels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily call volume · {format(now, 'MMMM yyyy')}</CardTitle>
          <CardDescription className="text-xs">Calls per day this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-end justify-between gap-[2px]">
            {dailyCallVolume.map((day, i) => {
              const maxCalls = Math.max(...dailyCallVolume.map(d => d.count), 1);
              const height = (day.count / maxCalls) * 100;
              const showLabel = i % Math.ceil(dailyCallVolume.length / 8) === 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '2px' }}
                    title={`${day.date} · ${day.count} calls`}
                  />
                  <div className="text-[9px] text-muted-foreground tabular-nums">
                    {showLabel ? day.date.split(' ')[1] : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>


      {/* Call History - Expandable */}
      <Collapsible open={callHistoryOpen} onOpenChange={setCallHistoryOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  <CardTitle>Call History</CardTitle>
                  <Badge variant="secondary">{totalCalls} total</Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${callHistoryOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CardDescription>View detailed call logs and recordings</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {!calls || calls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No calls made yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calls.map((call) => (
                    <Card key={call.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Phone className="h-4 w-4" />
                              {call.phone_number}
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                              {call.leads?.name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Lead: {call.leads.name}
                                </span>
                              )}
                              {call.contacts?.name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Contact: {call.contacts.name}
                                </span>
                              )}
                              {call.ai_agents?.name && (
                                <span className="flex items-center gap-1">
                                  <Bot className="h-3 w-3" />
                                  Agent: {call.ai_agents.name}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <Badge className={getStatusColor(call.status)}>
                            {call.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">Started</div>
                              <div className="text-muted-foreground">
                                {format(new Date(call.created_at), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-muted-foreground">
                                {format(new Date(call.created_at), 'hh:mm a')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">Duration</div>
                              <div className="text-muted-foreground">
                                {formatDuration(call.duration || 0)}
                              </div>
                            </div>
                          </div>

                          {call.call_templates?.name && (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Template</div>
                                <div className="text-muted-foreground">
                                  {call.call_templates.name}
                                </div>
                              </div>
                            </div>
                          )}

                          {call.call_sid && (
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium">Call SID</div>
                                <div className="text-muted-foreground text-xs font-mono">
                                  {call.call_sid.substring(0, 20)}...
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {call.recording_url && (
                          <div className="mt-4 pt-4 border-t">
                            <audio controls className="w-full">
                              <source src={call.recording_url} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default CallAnalytics;
