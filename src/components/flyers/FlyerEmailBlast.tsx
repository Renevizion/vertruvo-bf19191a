import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Send, Loader2, Users, CalendarClock, Mail } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FlyerEmailBlastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flyerHtml: string;
  flyerTitle: string;
}

export function FlyerEmailBlast({ open, onOpenChange, flyerHtml, flyerTitle }: FlyerEmailBlastProps) {
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [subject, setSubject] = useState(`📢 ${flyerTitle}`);
  const [isSending, setIsSending] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("08:30");

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
    queryKey: ["email-lists-blast", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data: lists } = await supabase
        .from("email_lists")
        .select("id, name, color")
        .eq("workspace_id", workspace.id)
        .eq("is_active", true);
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

  const totalRecipients = emailLists
    .filter(l => selectedLists.includes(l.id))
    .reduce((sum, l) => sum + (l.subscriber_count || 0), 0);

  const handleSend = async () => {
    if (selectedLists.length === 0) {
      toast.error("Select at least one email list");
      return;
    }
    if (!workspace?.id) return;

    setIsSending(true);
    try {
      // Build the email-ready HTML wrapper around the flyer
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="padding: 20px 0; text-align: center;">
            ${flyerHtml}
          </div>
        </div>
      `;

      let scheduledAt: string | null = null;
      if (isScheduled && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(':').map(Number);
        const dt = new Date(scheduleDate);
        dt.setHours(hours, minutes, 0, 0);
        scheduledAt = dt.toISOString();
      }

      // Create campaign
      const { data: campaign, error: campError } = await supabase
        .from("email_campaigns")
        .insert({
          workspace_id: workspace.id,
          name: `Flyer Blast: ${flyerTitle}`,
          subject,
          content: emailHtml,
          status: scheduledAt ? "scheduled" : "sending",
          target_list_ids: selectedLists,
          scheduled_at: scheduledAt,
        })
        .select()
        .single();

      if (campError) throw campError;

      if (!scheduledAt) {
        // Send immediately
        const { error: sendError } = await supabase.functions.invoke("send-campaign-email", {
          body: { campaignId: campaign.id, workspaceId: workspace.id },
        });
        if (sendError) throw sendError;
        toast.success(`Flyer blast sent to ${totalRecipients} recipients!`);
      } else {
        toast.success(`Flyer blast scheduled for ${format(new Date(scheduledAt), 'MMM d \'at\' h:mm a')}`);
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send flyer blast");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Send Flyer as Email Blast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Subject Line</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div>
            <Label className="mb-2 block">Send To</Label>
            {emailLists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No email lists yet. Create one in Email Lists.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {emailLists.map(list => (
                  <label key={list.id} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-accent/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={selectedLists.includes(list.id)}
                      onCheckedChange={() => setSelectedLists(prev => prev.includes(list.id) ? prev.filter(l => l !== list.id) : [...prev, list.id])}
                    />
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                    <span className="text-sm font-medium flex-1">{list.name}</span>
                    <Badge variant="secondary" className="text-xs"><Users className="h-3 w-3 mr-1" />{list.subscriber_count}</Badge>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/10">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={isScheduled} onCheckedChange={(c) => setIsScheduled(!!c)} />
              <div className="flex-1">
                <span className="text-sm font-medium">Schedule for later</span>
                <p className="text-xs text-muted-foreground">e.g. Monday 8:30 AM</p>
              </div>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </label>
            {isScheduled && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !scheduleDate && "text-muted-foreground")}>
                        <CalendarClock className="h-4 w-4 mr-2" />
                        {scheduleDate ? format(scheduleDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-28">
                  <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {totalRecipients > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm">
                {isScheduled ? 'Will schedule to' : 'Will send to'} <strong>{totalRecipients}</strong> recipients
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={isSending || selectedLists.length === 0 || (isScheduled && !scheduleDate)}
            className="gap-2"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isScheduled ? 'Schedule Blast' : 'Send Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
