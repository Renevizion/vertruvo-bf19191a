import { useState, useCallback, useEffect, useRef } from "react";
import { AudioWaveform, MicOff, X, Volume2, Loader2, Phone, History, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConversation } from "@elevenlabs/react";
import { useSubscriptionTier, canAccessFeature } from "@/hooks/useSubscriptionTier";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useMachine } from "@xstate/react";
import { callMachine } from "@/machines/call-machine";
import { CallStateBadge } from "@/components/voice/CallStateBadge";
import { playConnectedTone, playDisconnectedTone, playSpeakingTone } from "@/lib/call-tones";

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
}

export function VoiceAssistantButton({ externalOpen, onExternalClose }: { externalOpen?: boolean; onExternalClose?: () => void } = {}) {
  const { data: subscriptionInfo } = useSubscriptionTier();
  const { data: isAdmin } = useIsAdmin();
  const hasAccess = isAdmin || canAccessFeature(subscriptionInfo?.tier || 'free', 'voice_assistant');

  const [isOpen, setIsOpen] = useState(externalOpen ?? false);

  useEffect(() => {
    if (externalOpen !== undefined) setIsOpen(externalOpen);
  }, [externalOpen]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callState, sendCallEvent] = useMachine(callMachine);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const workspaceIdRef = useRef<string | null>(null);
  const toneStatusRef = useRef<string | null>(null);
  const actionsRef = useRef<Array<{ tool: string; params: any; result: any; timestamp: string }>>([]);
  const transcriptsRef = useRef<TranscriptEntry[]>([]);
  const sessionStartRef = useRef<Date | null>(null);

  const executeToolCall = useCallback(async (toolName: string, params: Record<string, unknown>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return "Error: not authenticated";

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kiruvo-voice-tools`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tool_name: toolName, tool_args: params }),
        }
      );

      const result = await resp.json();
      
      // Track action for conversation log
      actionsRef.current.push({
        tool: toolName,
        params,
        result: { success: !result.error },
        timestamp: new Date().toISOString(),
      });

      return JSON.stringify(result);
    } catch (err) {
      console.error("[VOICE] Tool error:", err);
      return JSON.stringify({ error: "Failed to execute tool" });
    }
  }, []);

  // Save conversation log when session ends
  const saveConversationLog = useCallback(async () => {
    const currentTranscripts = transcriptsRef.current;
    const currentStart = sessionStartRef.current;
    const wsId = workspaceIdRef.current;
    if (!wsId || currentTranscripts.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const duration = currentStart 
        ? Math.round((Date.now() - currentStart.getTime()) / 1000) 
        : 0;

      const { error } = await supabase.from("voice_conversation_logs" as any).insert({
        workspace_id: wsId,
        user_id: user.id,
        started_at: currentStart?.toISOString() || new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        transcript: currentTranscripts,
        actions_taken: actionsRef.current,
      });
      if (error) console.error("[VOICE] Save log error:", error);
      else console.log("[VOICE] Conversation log saved successfully");
    } catch (err) {
      console.error("[VOICE] Failed to save conversation log:", err);
    }
  }, []);

  const conversation = useConversation({
    clientTools: {
      get_new_leads: async (params: any) => executeToolCall("get_new_leads", params),
      get_today_schedule: async (params: any) => executeToolCall("get_today_schedule", params),
      get_tasks: async (params: any) => executeToolCall("get_tasks", params),
      send_offer_to_leads: async (params: any) => executeToolCall("send_offer_to_leads", params),
      get_lead_details: async (params: any) => executeToolCall("get_lead_details", params),
      get_open_slots: async (params: any) => executeToolCall("get_open_slots", params),
      get_active_promotions: async (params: any) => executeToolCall("get_active_promotions", params),
      create_task: async (params: any) => executeToolCall("create_task", params),
      get_products_services: async (params: any) => executeToolCall("get_products_services", params),
      // New tools
      add_note_to_lead: async (params: any) => executeToolCall("add_note_to_lead", params),
      trigger_workflow: async (params: any) => executeToolCall("trigger_workflow", params),
      list_workflows: async (params: any) => executeToolCall("list_workflows", params),
      drop_voicemail: async (params: any) => executeToolCall("drop_voicemail", params),
    },
    onConnect: () => {
      console.log("[VOICE] Connected to ElevenLabs agent");
      setIsConnecting(false);
      const now = new Date();
      setSessionStartTime(now);
      sessionStartRef.current = now;
    },
    onDisconnect: async () => {
      console.log("[VOICE] Disconnected");
      setIsConnecting(false);
      // Auto-save conversation log on disconnect
      await saveConversationLog();
    },
    onMessage: (message: any) => {
      if (message.type === "user_transcript") {
        const text = message.user_transcription_event?.user_transcript;
        if (text) {
          setLiveTranscript("");
          setTranscripts((prev) => {
            const next = [...prev, { role: "user" as const, text, timestamp: new Date().toISOString() }];
            transcriptsRef.current = next;
            return next;
          });
        }
      } else if (message.type === "agent_response") {
        const text = message.agent_response_event?.agent_response;
        if (text) {
          setTranscripts((prev) => {
            const next = [...prev, { role: "assistant" as const, text, timestamp: new Date().toISOString() }];
            transcriptsRef.current = next;
            return next;
          });
        }
      } else if (message.type === "agent_response_correction") {
        const text = message.agent_response_correction_event?.corrected_agent_response;
        if (text) {
          setTranscripts((prev) => {
            const updated = [...prev];
            let lastAssistant = -1;
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === "assistant") { lastAssistant = i; break; }
            }
            if (lastAssistant >= 0) updated[lastAssistant] = { role: "assistant", text, timestamp: new Date().toISOString() };
            transcriptsRef.current = updated;
            return updated;
          });
        }
      }
    },
    onError: (error) => {
      console.error("[VOICE] Error:", error);
      sendCallEvent({ type: "FAIL" });
      toast.error("Voice connection error. Please try again.");
      setIsConnecting(false);
    },
  });

  const trackVoiceUsage = useCallback(async (wsId: string) => {
    try {
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Use RPC to increment usage atomically
      await supabase.rpc("can_use_feature" as any, {
        p_workspace_id: wsId,
        p_feature_key: "voice_assistant_sessions",
        p_increment_usage: true,
      });
    } catch (err) {
      console.error("[VOICE] Usage tracking error:", err);
    }
  }, []);

  const startConversation = useCallback(async () => {
    if (!hasAccess) {
      toast.error("Voice Assistant requires an Enterprise subscription. Upgrade to access this feature.");
      return;
    }
    setIsConnecting(true);
    actionsRef.current = [];
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("kiruvo-realtime-session");

      if (error || !data?.signed_url) {
        throw new Error(data?.error || error?.message || "Failed to start session");
      }

      setWorkspaceId(data.workspace_id);
      workspaceIdRef.current = data.workspace_id;

      // Track usage (non-blocking)
      trackVoiceUsage(data.workspace_id);

      await conversation.startSession({
        signedUrl: data.signed_url,
      });
    } catch (err: any) {
      console.error("[VOICE] Start error:", err);
      toast.error(err.message || "Couldn't start voice assistant");
      setIsConnecting(false);
    }
  }, [conversation, hasAccess, trackVoiceUsage]);

  const endConversation = useCallback(async () => {
    await saveConversationLog();
    await conversation.endSession();
    setTranscripts([]);
    transcriptsRef.current = [];
    setLiveTranscript("");
    actionsRef.current = [];
    setSessionStartTime(null);
    sessionStartRef.current = null;
  }, [conversation, saveConversationLog]);

  const handleClose = useCallback(async () => {
    if (conversation.status === "connected") {
      await saveConversationLog();
      await conversation.endSession();
    }
    setIsOpen(false);
    onExternalClose?.();
    setTranscripts([]);
    setLiveTranscript("");
    setIsConnecting(false);
    actionsRef.current = [];
    setSessionStartTime(null);
  }, [conversation, saveConversationLog]);

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

  useEffect(() => {
    if (isConnecting || conversation.status === "connecting") {
      sendCallEvent({ type: "START" });
      return;
    }
    if (conversation.status === "connected") {
      sendCallEvent({ type: isSpeaking ? "SPEAKING" : "CONNECTED" });
      return;
    }
    if (conversation.status === "disconnected") {
      sendCallEvent({ type: "DISCONNECT" });
    }
  }, [conversation.status, isConnecting, isSpeaking, sendCallEvent]);

  useEffect(() => {
    if (!isConnected) return;
    if (isSpeaking) {
      sendCallEvent({ type: "SPEAKING" });
      void playSpeakingTone();
    } else {
      sendCallEvent({ type: "LISTENING" });
    }
  }, [isConnected, isSpeaking, sendCallEvent]);

  useEffect(() => {
    if (toneStatusRef.current === conversation.status) return;

    if (conversation.status === "connected") {
      void playConnectedTone();
    }
    if (conversation.status === "disconnected" && !isConnecting && toneStatusRef.current) {
      void playDisconnectedTone();
    }

    toneStatusRef.current = conversation.status;
  }, [conversation.status, isConnecting]);

  useEffect(() => {
    const el = document.getElementById("voice-transcripts-end");
    el?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-24 sm:right-5 z-50 w-full sm:w-[360px] max-h-[85vh] sm:max-h-[520px] rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground"
            )}
          />
          <span className="font-semibold text-sm">Thermi Voice</span>
          <CallStateBadge status={String(callState.value)} />
          {isConnected && (
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Transcripts */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[320px]">
        {!isConnected && !isConnecting && transcripts.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            {!hasAccess ? (
              <>
                <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Enterprise Feature</p>
                <p className="text-xs mt-1 opacity-70">
                  Voice Assistant is available on the Enterprise plan
                </p>
                <p className="text-[10px] mt-3 opacity-50">
                  Upgrade to unlock hands-free AI voice commands
                </p>
              </>
            ) : (
              <>
                <AudioWaveform className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Tap to start a live conversation</p>
                <p className="text-xs mt-1 opacity-70">
                  Real-time voice — just talk naturally
                </p>
                <p className="text-[10px] mt-3 opacity-50">
                  Add notes • Trigger workflows • Drop voicemails
                </p>
              </>
            )}
          </div>
        )}

        {transcripts.map((t, i) => (
          <div
            key={i}
            className={cn(
              "text-sm rounded-xl px-3 py-2 max-w-[85%]",
              t.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-muted text-foreground"
            )}
          >
            {t.text}
          </div>
        ))}

        {liveTranscript && (
          <div className="ml-auto bg-primary/20 text-primary text-sm rounded-xl px-3 py-2 italic">
            {liveTranscript}
          </div>
        )}

        <div id="voice-transcripts-end" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 border-t border-border bg-muted/30">
        {isSpeaking && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Volume2 className="h-3 w-3 animate-pulse" />
            Speaking
          </div>
        )}

        {!isConnected ? (
          <button
            onClick={startConversation}
            disabled={isConnecting}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
              "bg-primary text-primary-foreground hover:scale-105",
              isConnecting && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Start conversation"
          >
            {isConnecting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </button>
        ) : (
          <button
            onClick={endConversation}
            className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-105 transition-all duration-200 ring-4 ring-destructive/30 animate-pulse"
            aria-label="End conversation"
          >
            <MicOff className="h-6 w-6" />
          </button>
        )}

        {isConnected && !isSpeaking && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <AudioWaveform className="h-3 w-3 animate-pulse text-primary" />
            Listening
          </div>
        )}
      </div>
    </div>
  );
}
