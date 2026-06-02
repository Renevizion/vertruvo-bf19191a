import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Clock, Mic, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ConversationLog {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript: Array<{ role: string; text: string; timestamp?: string }>;
  actions_taken: Array<{ tool: string; params: any; result: any; timestamp: string }>;
  summary: string | null;
  language: string;
}

export function VoiceConversationHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["voice-conversation-logs", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("voice_conversation_logs" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as ConversationLog[];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const transcriptText = log.transcript?.map((t) => t.text).join(" ").toLowerCase() || "";
    const actionsText = log.actions_taken?.map((a) => a.tool).join(" ").toLowerCase() || "";
    return transcriptText.includes(q) || actionsText.includes(q);
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const toolDisplayNames: Record<string, string> = {
    get_new_leads: "Checked leads",
    get_today_schedule: "Checked schedule",
    get_tasks: "Checked tasks",
    send_offer_to_leads: "Sent offer",
    get_lead_details: "Searched leads",
    get_open_slots: "Checked open slots",
    get_active_promotions: "Checked promotions",
    create_task: "Created task",
    get_products_services: "Checked products",
    add_note_to_lead: "Added note to lead",
    trigger_workflow: "Triggered workflow",
    list_workflows: "Listed workflows",
    drop_voicemail: "Dropped voicemail",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Voice Conversation History</h3>
          <p className="text-sm text-muted-foreground">
            Searchable transcripts of every Thermi voice session
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Mic className="h-3 w-3" />
          {filteredLogs?.length || 0} sessions
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transcripts, actions..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading history...</div>
      ) : !filteredLogs?.length ? (
        <Card className="p-8 text-center">
          <Mic className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">
            {searchQuery ? "No conversations match your search" : "No voice conversations yet. Start talking to Thermi!"}
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <Card key={log.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {format(new Date(log.started_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.transcript?.length || 0} messages • {log.actions_taken?.length || 0} actions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(log.duration_seconds)}
                      </Badge>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Actions summary */}
                      {log.actions_taken?.length > 0 && (
                        <div className="px-4 py-2 bg-muted/30 border-b border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Actions taken:</p>
                          <div className="flex flex-wrap gap-1">
                            {log.actions_taken.map((action, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] gap-1">
                                <Wrench className="h-2.5 w-2.5" />
                                {toolDisplayNames[action.tool] || action.tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transcript */}
                      <div className="px-4 py-3 space-y-2 max-h-[300px] overflow-y-auto">
                        {log.transcript?.map((t, i) => (
                          <div
                            key={i}
                            className={`text-sm rounded-lg px-3 py-1.5 max-w-[85%] ${
                              t.role === "user"
                                ? "ml-auto bg-primary/10 text-foreground"
                                : "mr-auto bg-muted text-foreground"
                            }`}
                          >
                            <span className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                              {t.role === "user" ? "You" : "Thermi"}
                            </span>
                            {t.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
