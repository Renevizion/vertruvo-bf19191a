import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Voicemail, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function VoicemailDropsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", tts_text: "" });

  const { data: workspaceMember } = useQuery({
    queryKey: ["workspace-member-vm"],
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

  const { data: voicemails, isLoading } = useQuery({
    queryKey: ["voicemail-drops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voicemail_drops" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!workspaceMember,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: { name: string; tts_text: string; id?: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from("voicemail_drops" as any)
          .update({ name: values.name, tts_text: values.tts_text })
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("voicemail_drops" as any).insert({
          workspace_id: workspaceMember?.workspace_id,
          name: values.name,
          tts_text: values.tts_text,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voicemail-drops"] });
      toast.success(editId ? "Voicemail updated" : "Voicemail drop created");
      setDialogOpen(false);
      setEditId(null);
      setForm({ name: "", tts_text: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voicemail_drops" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voicemail-drops"] });
      toast.success("Voicemail drop deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("voicemail_drops" as any)
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["voicemail-drops"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Voicemail Drops</h3>
          <p className="text-sm text-muted-foreground">Pre-recorded messages for leads who don't answer</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm({ name: "", tts_text: "" }); } }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Voicemail
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Create"} Voicemail Drop</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="e.g. New Lead Follow-up"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Message (will be spoken by AI voice)</Label>
                <Textarea
                  placeholder="Hi, this is [business name]. I'm calling about your inquiry..."
                  rows={4}
                  value={form.tts_text}
                  onChange={(e) => setForm({ ...form, tts_text: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This text will be converted to speech using the AI voice
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => saveMutation.mutate({ ...form, id: editId || undefined })}
                disabled={!form.name || !form.tts_text || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !voicemails?.length ? (
        <Card className="p-8 text-center">
          <Voicemail className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No voicemail drops yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create one to use with Thermi Voice or outbound calls</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {voicemails.map((vm: any) => (
            <Card key={vm.id} className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{vm.name}</p>
                  <Badge variant={vm.is_active ? "default" : "secondary"} className="text-[10px]">
                    {vm.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{vm.tts_text}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={vm.is_active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: vm.id, is_active: checked })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setEditId(vm.id); setForm({ name: vm.name, tts_text: vm.tts_text }); setDialogOpen(true); }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteMutation.mutate(vm.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
