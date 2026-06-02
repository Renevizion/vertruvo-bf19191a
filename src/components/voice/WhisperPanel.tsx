import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Eye, EyeOff, Loader2, Sparkles, ListChecks, Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WhisperPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  contactId?: string | null;
  leadId?: string | null;
  defaultMode?: "whisper" | "listening";
}

type WhisperSession = {
  id: string;
  title: string | null;
  summary: string | null;
  key_points: string[];
  action_items: string[];
  sentiment: string | null;
};

export function WhisperPanel({ open, onOpenChange, workspaceId, contactId, leadId, defaultMode = "whisper" }: WhisperPanelProps) {
  const [mode, setMode] = useState<"whisper" | "listening">(defaultMode);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<WhisperSession | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const recRef = useRef<any>(null);
  const startedAtRef = useRef<number>(0);

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Browser speech recognition not available. You can paste/type a transcript instead.");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let buf = transcript ? transcript + " " : "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) buf += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setTranscript((buf + interim).trim());
    };
    rec.onerror = (e: any) => toast.error(`Recording error: ${e.error || "unknown"}`);
    rec.onend = () => setRecording(false);
    rec.start();
    recRef.current = rec;
    startedAtRef.current = Date.now();
    setRecording(true);
    toast.success(mode === "whisper" ? "Whisper recording (private)" : "Listening — transcript will be summarized");
  };

  const stopRecording = () => {
    try { recRef.current?.stop(); } catch {}
    setRecording(false);
  };

  const summarize = async () => {
    if (!workspaceId) return toast.error("No workspace");
    if (!transcript.trim()) return toast.error("Transcript is empty");
    setLoading(true);
    try {
      const durationSeconds = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : null;
      const { data, error } = await supabase.functions.invoke("whisper-summarize", {
        body: { workspaceId, contactId, leadId, mode, channel: "voice", transcript, durationSeconds },
      });
      if (error) throw error;
      setSession(data.session);
      toast.success("Summary ready");
    } catch (e: any) {
      toast.error(e.message || "Summarization failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTranscript("");
    setSession(null);
    setShowTranscript(false);
    startedAtRef.current = 0;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { stopRecording(); reset(); } }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {mode === "whisper" ? "Whisper Mode" : "Listening Mode"}
          </SheetTitle>
          <SheetDescription>
            {mode === "whisper"
              ? "Private call/message capture. Only the summary is shown — full transcript stays hidden by default."
              : "Quietly listening to your live call. Summarizes after you stop."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Button variant={mode === "whisper" ? "default" : "outline"} size="sm" onClick={() => setMode("whisper")}>Whisper</Button>
            <Button variant={mode === "listening" ? "default" : "outline"} size="sm" onClick={() => setMode("listening")}>Listening</Button>
          </div>

          <div className="flex gap-2">
            {!recording ? (
              <Button onClick={startRecording} className="flex-1 gap-2">
                <Mic className="h-4 w-4" /> Start
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="flex-1 gap-2">
                <MicOff className="h-4 w-4" /> Stop
              </Button>
            )}
            <Button onClick={summarize} disabled={loading || !transcript.trim()} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Summarize
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Transcript (paste or speak)</label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak or paste transcript here. In whisper mode this stays private."
              className="min-h-[120px] text-xs"
            />
          </div>

          {session && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{session.title || "Whisper session"}</div>
                {session.sentiment && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Heart className="h-3 w-3" /> {session.sentiment}
                  </Badge>
                )}
              </div>
              {session.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed">{session.summary}</p>
              )}
              {session.key_points?.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1">Key points</div>
                  <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                    {session.key_points.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
              )}
              {session.action_items?.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1 flex items-center gap-1"><ListChecks className="h-3 w-3" /> Action items</div>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    {session.action_items.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
              )}
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowTranscript((v) => !v)}>
                {showTranscript ? <><EyeOff className="h-3 w-3" /> Hide transcript</> : <><Eye className="h-3 w-3" /> Reveal transcript</>}
              </Button>
              {showTranscript && (
                <div className="text-[11px] text-muted-foreground border-l-2 border-muted pl-2 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {transcript}
                </div>
              )}
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
