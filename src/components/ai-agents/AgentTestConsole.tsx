import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, CheckCircle, XCircle } from "lucide-react";
import { useAgentRuntime } from "@/hooks/useAgentRuntime";
import { useQueryClient } from "@tanstack/react-query";

interface AgentTestConsoleProps {
  agentId: string;
  agentName: string;
}

export function AgentTestConsole({ agentId, agentName }: AgentTestConsoleProps) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<any>(null);
  const { mutate: executeAgent, isPending } = useAgentRuntime();
  const queryClient = useQueryClient();

  const handleTest = () => {
    if (!input.trim()) return;

    setResponse(null);
    executeAgent(
      { agentId, input: input.trim() },
      {
        onSuccess: (data) => {
          setResponse({ success: true, data });
          // Refetch usage data to show new logs immediately
          queryClient.invalidateQueries({ queryKey: ['agent-usage', agentId] });
        },
        onError: (error) => {
          setResponse({ success: false, error: error.message });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Agent: {agentName}</CardTitle>
        <CardDescription>
          Send a test message to see how your agent responds using its configured integrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Input</label>
          <Textarea
            placeholder="Enter a test message for the agent..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[100px]"
            disabled={isPending}
          />
        </div>

        <Button onClick={handleTest} disabled={isPending || !input.trim()}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Test Agent
            </>
          )}
        </Button>

        {response && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {response.success ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Success</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Error</span>
                </>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              {response.success ? (
                <>
                  <div>
                    <span className="text-sm font-medium">Response:</span>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{response.data.response}</p>
                  </div>
                  {response.data.usage && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <span>Type: {response.data.type}</span>
                      {response.data.usage.total_tokens && (
                        <span className="ml-4">Tokens: {response.data.usage.total_tokens}</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-destructive">{response.error}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
