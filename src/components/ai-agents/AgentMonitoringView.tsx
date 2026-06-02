import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Activity, Brain, FileText, TrendingUp, Play, Phone, MessageSquare, Bot, BookOpen, Volume2, Info, HelpCircle, Radio } from "lucide-react";
import { AgentMemoryViewer } from "./AgentMemoryViewer";
import { AgentTestConsole } from "./AgentTestConsole";
import { LiveCallMonitor } from "./LiveCallMonitor";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  greeting?: string;
  instructions?: string;
  voice?: string;
  phone_number?: string;
  knowledge_bases?: { name: string };
}

interface AgentMonitoringViewProps {
  agentId: string;
  agentName: string;
  workspaceId: string;
  agent?: Agent;
}

export function AgentMonitoringView({ agentId, agentName, workspaceId, agent }: AgentMonitoringViewProps) {
  // Fetch agent usage data with real-time subscription
  const { data: usageData, refetch: refetchUsage } = useQuery({
    queryKey: ['agent-usage', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_usage')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
    refetchInterval: 5000 // Refetch every 5 seconds for near real-time
  });

  // Fetch agent insights related to this agent
  const { data: insights } = useQuery({
    queryKey: ['agent-insights', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_insights')
        .select('*')
        .eq('context_type', 'agent')
        .eq('context_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!agentId
  });

  // Aggregate usage statistics
  const totalUsage = usageData?.reduce((sum, u) => sum + (u.usage_count || 0), 0) || 0;
  const totalTokens = usageData?.reduce((sum, u) => sum + (u.tokens_used || 0), 0) || 0;
  const totalCost = usageData?.reduce((sum, u) => sum + (u.cost_usd || 0), 0) || 0;

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'voice': return Phone;
      case 'conversation': return MessageSquare;
      default: return Bot;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'draft': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const IconComponent = agent ? getAgentIcon(agent.type) : Bot;

  const TabWithTooltip = ({ value, icon: Icon, label, tooltip }: { value: string; icon: any; label: string; tooltip: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <TabsTrigger value={value} className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-6">
      {/* Agent Details Card */}
      {agent && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconComponent className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl">{agent.name}</CardTitle>
                  <Badge className={`${getStatusColor(agent.status)} capitalize`}>
                    {agent.status}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {agent.type === "voice" ? "Voice Agent" : agent.type === "conversation" ? "Chat Agent" : "Workflow Agent"}
                  </Badge>
                </div>
                {agent.description && (
                  <CardDescription className="mt-1">{agent.description}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {agent.greeting && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Greeting</p>
                <p className="text-sm">{agent.greeting}</p>
              </div>
            )}
            {agent.instructions && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Instructions</p>
                <p className="text-sm whitespace-pre-wrap">{agent.instructions}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-sm">
              {agent.voice && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  <span className="capitalize">{agent.voice}</span>
                </div>
              )}
              {agent.phone_number && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{agent.phone_number}</span>
                </div>
              )}
              {agent.knowledge_bases?.name && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{agent.knowledge_bases.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">Agent invocations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total token consumption</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">USD spent</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="w-full flex flex-wrap justify-start gap-1">
          <TabWithTooltip
            value="live"
            icon={Radio}
            label="Live Calls"
            tooltip="Live, in-progress calls handled by this agent. See current stage, elapsed time, and streaming transcript in real-time."
          />
          <TabWithTooltip 
            value="test" 
            icon={Play} 
            label="Test" 
            tooltip="Send test messages to your agent and see real responses. This is how you verify your agent works correctly."
          />
          <TabWithTooltip 
            value="activity" 
            icon={Activity} 
            label="Activity" 
            tooltip="Shows all agent interactions and usage history. Data appears here after you use the Test console or integrate the agent."
          />
          <TabWithTooltip 
            value="memory" 
            icon={Brain} 
            label="Memory" 
            tooltip="Agent memory stores context from conversations. Memories are created when the agent processes interactions and learns preferences."
          />
          <TabWithTooltip 
            value="insights" 
            icon={TrendingUp} 
            label="Insights" 
            tooltip="AI-generated insights about agent performance. Insights are created after the agent has enough interaction data to analyze."
          />
          <TabWithTooltip 
            value="logs" 
            icon={FileText} 
            label="Logs" 
            tooltip="Detailed execution logs showing exactly what the agent did during each interaction. Use this for debugging."
          />
          <TabWithTooltip 
            value="errors" 
            icon={AlertCircle} 
            label="Errors" 
            tooltip="Any errors encountered during agent execution appear here. A clean slate means no errors have occurred."
          />
        </TabsList>

        {/* Live Calls Tab */}
        <TabsContent value="live" className="space-y-4">
          <LiveCallMonitor agentId={agentId} workspaceId={workspaceId} />
        </TabsContent>

        {/* Test Console Tab */}
        <TabsContent value="test" className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-600 dark:text-blue-400">How to use the Test Console</p>
              <p className="text-muted-foreground mt-1">
                Type a message below and click "Test Agent" to see how your agent responds. 
                This routes through the Thermi AI gateway using your agent's tools and memory to generate a real response.
                Each test is logged in the Activity tab.
              </p>
            </div>
          </div>
          <AgentTestConsole agentId={agentId} agentName={agentName} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Agent usage and interaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {!usageData || usageData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">No activity recorded yet</p>
                    <p className="text-sm text-center max-w-sm mt-2">
                      Use the <strong>Test</strong> tab to send messages to your agent. 
                      Each interaction will be logged here with usage metrics.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {usageData.map((usage) => (
                      <div key={usage.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{usage.integration_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(usage.created_at!), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant="outline">{usage.usage_count}x</Badge>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Tokens: {usage.tokens_used?.toLocaleString() || 0}
                          </span>
                          {usage.cost_usd && (
                            <span className="text-muted-foreground">
                              Cost: ${usage.cost_usd.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm mb-4">
            <Brain className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-600 dark:text-purple-400">About Agent Memory</p>
              <p className="text-muted-foreground mt-1">
                Memories are stored when the agent processes conversations and identifies important context.
                Memory types include: <strong>conversation</strong> (chat history), <strong>preference</strong> (user preferences), 
                <strong>fact</strong> (business facts), and <strong>insight</strong> (learned patterns).
              </p>
            </div>
          </div>
          <AgentMemoryViewer agentId={agentId} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Insights</CardTitle>
              <CardDescription>AI-generated findings and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {!insights || insights.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">No insights generated yet</p>
                    <p className="text-sm text-center max-w-sm mt-2">
                      Insights are automatically generated after your agent has processed enough interactions.
                      Keep using your agent to build up data for analysis.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {insights.map((insight) => (
                      <Card key={insight.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{insight.title}</CardTitle>
                            <Badge variant="outline">{insight.insight_type}</Badge>
                          </div>
                          {insight.description && (
                            <CardDescription>{insight.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {insight.metric_value && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{insight.metric_value}</span>
                              {insight.metric_unit && (
                                <span className="text-sm text-muted-foreground">{insight.metric_unit}</span>
                              )}
                              {insight.trend && (
                                <Badge variant={insight.trend === 'up' ? 'default' : 'secondary'}>
                                  {insight.trend_percentage}%
                                </Badge>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(insight.created_at!), { addSuffix: true })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>Detailed agent execution history</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {!usageData || usageData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">No execution logs yet</p>
                    <p className="text-sm text-center max-w-sm mt-2">
                      Logs are created each time your agent processes a request.
                      Use the <strong>Test</strong> tab to generate your first logs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {usageData.map((usage, index) => (
                      <div key={usage.id} className="font-mono text-xs border rounded p-3 bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <span className="text-green-500">[SUCCESS]</span>
                          <span>{new Date(usage.created_at!).toLocaleString()}</span>
                        </div>
                        <div className="text-foreground">
                          Integration: <span className="text-primary">{usage.integration_type === 'lovable' ? 'Thermi' : usage.integration_type}</span> | 
                          Tokens: {usage.tokens_used?.toLocaleString() || 0} | 
                          Cost: ${(usage.cost_usd || 0).toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
              <CardDescription>Execution errors and failures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 opacity-50 text-green-500" />
                <p className="font-medium text-green-600">No Errors</p>
                <p className="text-sm text-center max-w-sm mt-2">
                  Your agent is running smoothly. Errors will appear here if any issues occur during execution.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}