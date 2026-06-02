import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Trash2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CallObjectivesManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", success_criteria: "", expected_keypresses: "" });

  const { data: workspace } = useQuery({
    queryKey: ["workspace-objectives"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).single();
      return data;
    },
  });

  const { data: objectives } = useQuery({
    queryKey: ["call-objectives"],
    enabled: !!workspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_objectives" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let keypresses = {};
      if (form.expected_keypresses.trim()) {
        try { keypresses = JSON.parse(form.expected_keypresses); }
        catch { throw new Error('Keypress map must be valid JSON, e.g. {"1": "yes", "2": "reschedule"}'); }
      }
      const { error } = await supabase.from("call_objectives" as any).insert({
        workspace_id: workspace?.workspace_id,
        name: form.name,
        description: form.description || null,
        success_criteria: form.success_criteria,
        expected_keypresses: keypresses,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-objectives"] });
      toast.success("Objective saved");
      setOpen(false);
      setForm({ name: "", description: "", success_criteria: "", expected_keypresses: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("call_objectives" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["call-objectives"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Call Objectives</h3>
          <p className="text-sm text-muted-foreground">Reusable goals for voice campaigns. Pick one when launching a campaign or type a custom one.</p>
        </div>
        <Button size="sm" onClick={() => setOpen((value) => !value)}><Plus className="h-4 w-4 mr-1" />New Objective</Button>
      </div>

      {open && (
        <Card className="surface-glass sheen-top p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">New objective</h4>
              <p className="text-sm text-muted-foreground">Define a reusable outcome for calls and campaigns.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input placeholder="e.g. Confirm appointment" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Success criteria</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Recipient confirmed they will attend, OR pressed 1 to confirm."
                  value={form.success_criteria}
                  onChange={(e) => setForm({ ...form, success_criteria: e.target.value })}
                />
              </div>
              <div>
                <Label>Expected keypresses (optional JSON)</Label>
                <Textarea
                  rows={2}
                  placeholder='{"1": "confirm", "2": "reschedule", "3": "cancel"}'
                  value={form.expected_keypresses}
                  onChange={(e) => setForm({ ...form, expected_keypresses: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.success_criteria || createMutation.isPending}>Save</Button>
            </div>
        </Card>
      )}

      {!objectives?.length ? (
        <Card className="p-8 text-center">
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No objectives yet. Create one to reuse across campaigns.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {objectives.map((o) => (
            <Card key={o.id} className="p-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{o.name}</p>
                  {Object.keys(o.expected_keypresses || {}).length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {Object.keys(o.expected_keypresses).length} key(s)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{o.success_criteria}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(o.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
