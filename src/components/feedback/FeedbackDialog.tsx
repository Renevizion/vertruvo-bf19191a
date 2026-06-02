import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FeedbackDialog = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter your feedback");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      if (!workspace) throw new Error("No workspace found");
      const { error } = await supabase.from('feedback').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        message: message.trim(),
        category: category || null,
      });
      if (error) throw error;
      toast.success("Feedback submitted. Thank you.");
      setMessage("");
      setCategory("");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <MessageCircle className="h-4 w-4" />
        Send Feedback
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">Send Feedback</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">Share thoughts, report issues, or suggest features.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select a category (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Feedback *</Label>
                <Textarea
                  placeholder="Tell us what you think..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  required
                  className="resize-none"
                />
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Submitting…</> : "Submit Feedback"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};
