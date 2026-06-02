import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface CreateTaskDialogProps {
  trigger?: React.ReactNode;
  contactId?: string;
  leadId?: string;
  taskId?: string; // For editing existing tasks
  onSuccess?: () => void;
}

export const CreateTaskDialog = ({ trigger, contactId, leadId, taskId, onSuccess }: CreateTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing task data if editing
  useQuery({
    queryKey: ['task', taskId],
    enabled: !!taskId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      
      setTitle(data.title);
      setDescription(data.description || "");
      setStatus(data.status);
      if (data.due_date) setDueDate(new Date(data.due_date));
      
      return data;
    },
  });

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!workspace) throw new Error("No workspace found");

      if (taskId) {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            status,
            due_date: dueDate?.toISOString() || null,
            contact_id: contactId || null,
            lead_id: leadId || null,
          })
          .eq('id', taskId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        // Create new task
        const taskId_new = crypto.randomUUID();
        const { error } = await supabase.from("tasks").insert({
          id: taskId_new,
          workspace_id: workspace.id,
          title: title.trim(),
          description: description.trim() || null,
          status,
          due_date: dueDate?.toISOString() || null,
          contact_id: contactId || null,
          lead_id: leadId || null,
          assignee_id: user.id,
        });

        if (error) throw error;

        // Send task-assigned notification email (fire-and-forget)
        supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'task-assigned',
            recipientEmail: user.email,
            idempotencyKey: `task-assigned-${taskId_new}`,
            templateData: {
              taskTitle: title.trim(),
              dueDate: dueDate ? dueDate.toLocaleDateString('en-US', { dateStyle: 'long' }) : 'No due date',
              priority: 'Normal',
            },
          },
        }).catch(() => {});

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });

      // Reset form
      setTitle("");
      setDescription("");
      setDueDate(undefined);
      setStatus("pending");
      setOpen(false);

      onSuccess?.();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Task</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{taskId ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {taskId ? 'Update task details' : 'Add a new task and assign it to a contact or lead'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Task description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (taskId ? "Updating..." : "Creating...") : (taskId ? "Update Task" : "Create Task")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};