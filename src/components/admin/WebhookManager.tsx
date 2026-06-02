import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const WebhookManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [] as string[],
    secret: "",
  });

  const { data: webhooks } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_configs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createWebhook = useMutation({
    mutationFn: async (webhook: typeof newWebhook) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      const { error } = await supabase.from("webhook_configs").insert({
        ...webhook,
        workspace_id: workspaces?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setIsDialogOpen(false);
      setNewWebhook({ name: "", url: "", events: [], secret: "" });
      toast.success("Webhook created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create webhook: " + error.message);
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_configs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
  });

  const toggleWebhook = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("webhook_configs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const eventTypes = [
    "workflow.started",
    "workflow.completed",
    "workflow.failed",
    "lead.created",
    "lead.updated",
    "subscription.created",
    "subscription.canceled",
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Webhook Management</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  placeholder="My Webhook"
                />
              </div>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <Label htmlFor="secret">Secret (optional)</Label>
                <Input
                  id="secret"
                  type="password"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                  placeholder="Webhook secret for verification"
                />
              </div>
              <div>
                <Label>Events</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {eventTypes.map((event) => (
                    <Badge
                      key={event}
                      variant={newWebhook.events.includes(event) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setNewWebhook({
                          ...newWebhook,
                          events: newWebhook.events.includes(event)
                            ? newWebhook.events.filter((e) => e !== event)
                            : [...newWebhook.events, event],
                        });
                      }}
                    >
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => createWebhook.mutate(newWebhook)}
                disabled={!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
              >
                Create Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks && webhooks.length > 0 ? (
              webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <span className="truncate max-w-xs">{webhook.url}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((event: string) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={(checked) =>
                        toggleWebhook.mutate({ id: webhook.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWebhook.mutate(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No webhooks configured
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
