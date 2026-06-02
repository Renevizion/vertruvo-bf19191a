import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, FileText, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export function CallSummaryManager() {
  const queryClient = useQueryClient();
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const { data: callLogs, isLoading } = useQuery({
    queryKey: ["call-logs-with-recordings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("id, phone_number, status, duration, recording_url, transcript, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async (callId: string) => {
      setSummarizingId(callId);
      const { data, error } = await supabase.functions.invoke("voice-call-summary", {
        body: { call_id: callId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-logs-with-recordings"] });
      toast.success("Call transcribed and summarized");
      setSummarizingId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setSummarizingId(null);
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Call Summaries</h3>
        <p className="text-sm text-muted-foreground">
          Auto-transcribe and summarize phone calls with leads
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading calls...</p>
      ) : !callLogs?.length ? (
        <Card className="p-8 text-center">
          <Phone className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No call recordings yet</p>
          <p className="text-xs text-muted-foreground mt-1">Make calls through the platform to get transcripts and summaries</p>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {callLogs.map((call) => (
              <Card key={call.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium">{call.phone_number}</p>
                      <Badge variant="secondary" className="text-[10px] capitalize">{call.status}</Badge>
                      {call.duration && (
                        <span className="text-xs text-muted-foreground">{call.duration}s</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(call.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>

                    {call.summary && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Summary:</p>
                        <p className="text-sm whitespace-pre-wrap">{call.summary}</p>
                      </div>
                    )}

                    {call.transcript && !call.summary && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Transcript:</p>
                        <p className="text-sm line-clamp-3">{call.transcript}</p>
                      </div>
                    )}
                  </div>

                  {call.recording_url && !call.transcript && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => summarizeMutation.mutate(call.id)}
                      disabled={summarizingId === call.id}
                    >
                      {summarizingId === call.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 mr-1" />
                      )}
                      Summarize
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
