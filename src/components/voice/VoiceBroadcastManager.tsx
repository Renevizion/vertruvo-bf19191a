import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Radio, Play, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export function VoiceBroadcastManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    message_text: "",
    source_filter: "all",
    objective_id: "none" as string,
    objective_text: "",
  });

  const { data: workspaceMember } = useQuery({
    queryKey: ["workspace-member-vb"],
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

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ["voice-broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_broadcasts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!workspaceMember,
  });

  const { data: leadCount } = useQuery({
    queryKey: ["leads-with-phone"],
    queryFn: async () => {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .not("phone", "is", null);
      return count || 0;
    },
    enabled: !!workspaceMember,
  });

  const { data: savedObjectives } = useQuery({
    queryKey: ["call-objectives-picker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("call_objectives" as any)
        .select("id, name, objective_text")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!workspaceMember,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      // Create broadcast
      const { data: broadcast, error } = await supabase
        .from("voice_broadcasts" as any)
        .insert({
          workspace_id: workspaceMember?.workspace_id,
          name: values.name,
          message_text: values.message_text,
          target_filter: { source: values.source_filter },
          objective_id: values.objective_id !== "none" ? values.objective_id : null,
          objective_text: values.objective_text?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Add recipients (leads with phone numbers)
      let query = supabase
        .from("leads")
        .select("id, phone")
        .not("phone", "is", null);
      
      if (values.source_filter !== "all") {
        query = query.eq("source", values.source_filter);
      }

      const { data: leads } = await query;
      if (leads?.length) {
        const recipients = leads.map((lead: any) => ({
          broadcast_id: (broadcast as any).id,
          lead_id: lead.id,
          phone_number: lead.phone,
        }));
        await supabase.from("voice_broadcast_recipients" as any).insert(recipients);
        await supabase
          .from("voice_broadcasts" as any)
          .update({ total_recipients: leads.length })
          .eq("id", (broadcast as any).id);
      }

      return broadcast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-broadcasts"] });
      toast.success("Broadcast created");
      setDialogOpen(false);
      setForm({ name: "", message_text: "", source_filter: "all", objective_id: "none", objective_text: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startMutation = useMutation({
    mutationFn: async (broadcastId: string) => {
      const { data, error } = await supabase.functions.invoke("voice-broadcast", {
        body: { broadcast_id: broadcastId, action: "start" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["voice-broadcasts"] });
      toast.success(`Broadcast sent to ${data.sent} recipients`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
      case "in_progress": return <Clock className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />;
      case "draft": return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Voice Broadcasts</h3>
          <p className="text-sm text-muted-foreground">Send voice messages to groups of leads at once</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Voice Broadcast</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Broadcast Name</Label>
                <Input
                  placeholder="e.g. Monthly Promotion Announcement"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Message (will be spoken by AI voice)</Label>
                <Textarea
                  placeholder="Hi! We're calling to let you know about our special holiday offer..."
                  rows={4}
                  value={form.message_text}
                  onChange={(e) => setForm({ ...form, message_text: e.target.value })}
                />
              </div>
              <div>
                <Label>Target Leads</Label>
                <Select value={form.source_filter} onValueChange={(v) => setForm({ ...form, source_filter: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All leads with phone ({leadCount})</SelectItem>
                    <SelectItem value="website">Website leads</SelectItem>
                    <SelectItem value="referral">Referral leads</SelectItem>
                    <SelectItem value="social">Social media leads</SelectItem>
                    <SelectItem value="manual">Manually added</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-md border border-border p-3">
                <Label className="text-xs uppercase text-muted-foreground tracking-wide">Objective (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  How will we know this call succeeded? Pick a saved objective or type one — AI will judge each call against it.
                </p>
                <Select
                  value={form.objective_id}
                  onValueChange={(v) => {
                    const picked = savedObjectives?.find((o) => o.id === v);
                    setForm({
                      ...form,
                      objective_id: v,
                      objective_text: picked ? picked.objective_text : form.objective_text,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Use a saved objective…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None / type below —</SelectItem>
                    {savedObjectives?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="e.g. Confirm the appointment for Saturday at 10am, or have them press 1 to confirm / 2 to reschedule."
                  rows={2}
                  value={form.objective_text}
                  onChange={(e) => setForm({ ...form, objective_text: e.target.value, objective_id: "none" })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || !form.message_text || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Broadcast"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !broadcasts?.length ? (
        <Card className="p-8 text-center">
          <Radio className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No broadcasts yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create one to send a voice message to multiple leads</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((bc: any) => (
            <Card key={bc.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(bc.status)}
                    <p className="font-medium text-sm">{bc.name}</p>
                    <Badge variant="secondary" className="text-[10px] capitalize">{bc.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{bc.message_text}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {bc.total_recipients} recipients
                    </span>
                    {bc.sent_count > 0 && (
                      <span className="text-primary">{bc.sent_count} sent</span>
                    )}
                    {bc.failed_count > 0 && (
                      <span className="text-destructive">{bc.failed_count} failed</span>
                    )}
                    <span>{format(new Date(bc.created_at), "MMM d, h:mm a")}</span>
                  </div>
                </div>
                {bc.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => startMutation.mutate(bc.id)}
                    disabled={startMutation.isPending}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Send Now
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
