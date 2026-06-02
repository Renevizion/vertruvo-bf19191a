import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Loader2, Mail, Users } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  details: Record<string, any>;
}

interface QuickSendDialogProps {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickSendDialog({ item, open, onOpenChange }: QuickSendDialogProps) {
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState(`${item.title}`);
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
      return data;
    },
  });

  const { data: emailLists = [] } = useQuery({
    queryKey: ["email-lists-for-send", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data: lists, error } = await supabase
        .from("email_lists")
        .select("id, name, color")
        .eq("workspace_id", workspace.id)
        .eq("is_active", true);
      if (error) throw error;

      // Get subscriber counts
      const withCounts = await Promise.all(
        (lists || []).map(async (list) => {
          const { count } = await supabase
            .from("email_list_subscribers")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id)
            .eq("status", "active");
          return { ...list, subscriber_count: count || 0 };
        })
      );
      return withCounts;
    },
    enabled: !!workspace?.id,
  });

  const toggleList = (id: string) => {
    setSelectedLists(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const totalRecipients = emailLists
    .filter(l => selectedLists.includes(l.id))
    .reduce((sum, l) => sum + (l.subscriber_count || 0), 0);

  const buildEmailContent = () => {
    const details = item.details || {};
    let body = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`;
    body += `<h1 style="font-size: 24px; color: #0F8B5F; margin-bottom: 16px;">${item.title}</h1>`;

    if (item.description) {
      body += `<p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">${item.description}</p>`;
    }

    if (customMessage) {
      body += `<p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">${customMessage}</p>`;
    }

    const detailItems: string[] = [];
    if (details.schedule) detailItems.push(`📅 <strong>Schedule:</strong> ${details.schedule}`);
    if (details.location) detailItems.push(`📍 <strong>Location:</strong> ${details.location}`);
    if (details.price) detailItems.push(`💰 <strong>Price:</strong> ${details.price}`);

    if (detailItems.length > 0) {
      body += `<div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 20px;">`;
      body += detailItems.map(d => `<p style="margin: 8px 0; font-size: 14px; color: #555;">${d}</p>`).join("");
      body += `</div>`;
    }

    body += `</div>`;
    return body;
  };

  const handleSend = async () => {
    if (selectedLists.length === 0) {
      toast.error("Select at least one email list");
      return;
    }

    setIsSending(true);
    try {
      // Create a campaign and send it
      const { data: campaign, error: campError } = await supabase
        .from("email_campaigns")
        .insert({
          workspace_id: workspace!.id,
          name: `Quick Send: ${item.title}`,
          subject: customSubject,
          content: buildEmailContent(),
          status: "sending",
          target_list_ids: selectedLists,
        })
        .select()
        .single();

      if (campError) throw campError;

      // Trigger the send
      const { error: sendError } = await supabase.functions.invoke("send-campaign-email", {
        body: { campaignId: campaign.id },
      });

      if (sendError) throw sendError;

      toast.success(`Sending to ${totalRecipients} recipients`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Quick Send: {item.title}
          </SheetTitle>
          <SheetDescription>
            Send this content to one or more email lists. No campaign setup required.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Subject Line</Label>
            <Input value={customSubject} onChange={e => setCustomSubject(e.target.value)} />
          </div>

          <div>
            <Label>Additional Message (optional)</Label>
            <Textarea
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder="Add a personal note above the content details..."
              rows={2}
            />
          </div>

          <div>
            <Label className="mb-2 block">Send To</Label>
            {emailLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No email lists yet. Create one in Campaigns → Email Lists.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {emailLists.map(list => (
                  <label
                    key={list.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedLists.includes(list.id)}
                      onCheckedChange={() => toggleList(list.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{list.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {list.subscriber_count}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </div>

          {totalRecipients > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">
                Will send to <strong>{totalRecipients}</strong> recipients across {selectedLists.length} list{selectedLists.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={isSending || selectedLists.length === 0}
          >
            {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Now
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
