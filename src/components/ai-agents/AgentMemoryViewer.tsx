import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentMemory {
  id: string;
  agent_id: string;
  memory_type: string;
  content: string;
  context: Record<string, any>;
  importance_score: number;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
}

interface AgentMemoryViewerProps {
  agentId: string;
}

export function AgentMemoryViewer({ agentId }: AgentMemoryViewerProps) {
  const { data: memories, isLoading } = useQuery({
    queryKey: ['agent-memory', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_memory')
        .select('*')
        .eq('agent_id', agentId)
        .order('importance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AgentMemory[];
    },
    enabled: !!agentId
  });

  const getMemoryTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      conversation: 'bg-blue-500',
      preference: 'bg-purple-500',
      insight: 'bg-green-500',
      fact: 'bg-orange-500',
      behavior: 'bg-pink-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getImportanceLabel = (score: number) => {
    if (score >= 8) return { label: 'Critical', color: 'text-red-500' };
    if (score >= 6) return { label: 'High', color: 'text-orange-500' };
    if (score >= 4) return { label: 'Medium', color: 'text-yellow-500' };
    return { label: 'Low', color: 'text-gray-500' };
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading memories...</div>;
  }

  if (!memories || memories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Agent Memory
          </CardTitle>
          <CardDescription>
            Your agent will learn and remember important context as it interacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No memories stored yet. The agent will start building memory as it processes conversations and interactions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Agent Memory
        </CardTitle>
        <CardDescription>
          {memories.length} memories • Learning from every interaction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {memories.map((memory) => {
          const importance = getImportanceLabel(memory.importance_score);
          return (
            <div
              key={memory.id}
              className="border rounded-lg p-3 space-y-2 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getMemoryTypeColor(memory.memory_type)}`} />
                  <Badge variant="outline" className="text-xs capitalize">
                    {memory.memory_type}
                  </Badge>
                  <span className={`text-xs font-medium ${importance.color}`}>
                    {importance.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {memory.access_count > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{memory.access_count}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm">{memory.content}</p>

              {Object.keys(memory.context).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {Object.entries(memory.context).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
