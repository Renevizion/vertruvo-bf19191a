import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, CalendarIcon, Save, X, History, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { AgentInsightsCard } from "@/components/ai-agents/AgentInsightsCard";
import { MarkdownText } from "@/components/automations/MarkdownText";
import { useAgentSettings } from "@/hooks/useAgentSettings";
import { PageHeader } from "@/components/layout/PageHeader";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assignee_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  due_date: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [taskPulseReports, setTaskPulseReports] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "pending", dueDate: undefined as Date | undefined });
  const { toast } = useToast();
  const { enabled: agentEnabled } = useAgentSettings();
  const navigate = useNavigate();

  const fetchTasks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!workspace) {
      setLoading(false);
      return;
    }
    setWorkspaceId(workspace.id);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive"
      });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, name");

    if (error) {
      console.error("Error fetching contacts:", error);
    } else {
      setContacts(data || []);
    }
  };

  const fetchTaskPulseReports = async (currentWorkspaceId: string) => {
    const { data, error } = await supabase
      .from("agent_insights")
      .select("content, created_at, model_used")
      .eq("workspace_id", currentWorkspaceId)
      .eq("context_type", "task")
      .eq("insight_type", "suggestion")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setTaskPulseReports(data.map((row) => ({
        ...(!Array.isArray(row.content) && typeof row.content === "object" && row.content ? row.content : { content: String(row.content ?? "") }),
        createdAt: row.created_at,
        model: row.model_used,
      })));
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (workspaceId) fetchTaskPulseReports(workspaceId);
  }, [workspaceId]);

  const getContactName = (contactId: string | null) => {
    if (!contactId) return "-";
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name || "-";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "secondary",
      completed: "default",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace('_', ' ')}</Badge>;
  };

  const handleQuickComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } else {
      toast({
        title: newStatus === 'completed' ? "Task completed!" : "Task reopened",
        description: newStatus === 'completed' ? "Great job!" : "Task marked as pending",
      });
      fetchTasks();
    }
  };

  const beginCreate = () => {
    setEditingTaskId(null);
    setSelectedTaskId(null);
    setTaskForm({ title: "", description: "", status: "pending", dueDate: undefined });
    setShowComposer(true);
  };

  const beginEdit = (task: Task) => {
    setSelectedTaskId(task.id);
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      dueDate: task.due_date ? new Date(task.due_date) : undefined,
    });
    setShowComposer(true);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) {
      toast({ title: "Task title required", description: "Add a clear task name before saving.", variant: "destructive" });
      return;
    }

    setSavingTask(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingTaskId) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: taskForm.title.trim(),
            description: taskForm.description.trim() || null,
            status: taskForm.status,
            due_date: taskForm.dueDate?.toISOString() || null,
          })
          .eq("id", editingTaskId);
        if (error) throw error;
        toast({ title: "Task updated" });
      } else {
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .single();
        if (!workspace) throw new Error("No workspace found");

        const newTaskId = crypto.randomUUID();
        const { error } = await supabase.from("tasks").insert({
          id: newTaskId,
          workspace_id: workspace.id,
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          status: taskForm.status,
          due_date: taskForm.dueDate?.toISOString() || null,
          assignee_id: user.id,
        });
        if (error) throw error;
        setSelectedTaskId(newTaskId);
        toast({ title: "Task created" });
      }

      setShowComposer(false);
      setEditingTaskId(null);
      setTaskForm({ title: "", description: "", status: "pending", dueDate: undefined });
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({ title: "Could not save task", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSavingTask(false);
    }
  };

  const confirmDeleteTask = async () => {
    if (!deleteTask) return;
    const { error } = await supabase.from('tasks').delete().eq('id', deleteTask.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
      return;
    }
    toast({ title: "Task deleted" });
    if (selectedTaskId === deleteTask.id) setSelectedTaskId(null);
    setDeleteTask(null);
    fetchTasks();
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedTask = selectedTaskId ? tasks.find(task => task.id === selectedTaskId) || null : null;

  const selectedTaskPanel = selectedTask ? (
    <aside className="rounded-md border border-border/60 bg-background/45 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase text-muted-foreground">Selected task</p>
          <h2 className="mt-0.5 truncate text-sm font-semibold">{selectedTask.title}</h2>
        </div>
        {getStatusBadge(selectedTask.status)}
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{selectedTask.description || "No details added yet."}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Contact: <span className="text-foreground">{getContactName(selectedTask.contact_id)}</span></span>
        <span>Due: <span className="text-foreground">{selectedTask.due_date ? format(new Date(selectedTask.due_date), "MMM dd") : "Not set"}</span></span>
      </div>
      <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => beginEdit(selectedTask)}>
        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit inline
      </Button>
    </aside>
  ) : null;

  const rememberTaskPulse = (insight: any) => {
    setTaskPulseReports((prev) => [insight, ...prev].slice(0, 5));
    if (workspaceId) fetchTaskPulseReports(workspaceId);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        eyebrow="Core"
        title="Tasks"
        description="Your follow-ups and reminders. Things you need to do — not things that already happened."
        actions={
          <Button className="w-full sm:w-auto" onClick={beginCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        }
      />

      {showComposer && (
        <div className="surface-glass sheen-top rounded-xl border p-4 md:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{editingTaskId ? "Edit task" : "New task"}</h2>
                  <p className="text-sm text-muted-foreground">Keep the work item in context without leaving the task list.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowComposer(false); setEditingTaskId(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input id="task-title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Follow up with client" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={taskForm.status} onValueChange={(status) => setTaskForm({ ...taskForm, status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="task-description">Details</Label>
                  <Textarea id="task-description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Add notes, next steps, or context." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !taskForm.dueDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {taskForm.dueDate ? format(taskForm.dueDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={taskForm.dueDate} onSelect={(dueDate) => setTaskForm({ ...taskForm, dueDate })} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowComposer(false); setEditingTaskId(null); }}>Cancel</Button>
                  <Button onClick={saveTask} disabled={savingTask}>
                    <Save className="mr-2 h-4 w-4" />
                    {savingTask ? "Saving..." : "Save task"}
                  </Button>
                </div>
              </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 sm:w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground text-center sm:text-left">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {agentEnabled && (
        <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="max-w-[260px]">
            <AgentInsightsCard
              contextType="task"
              contextId="task-pulse"
              insightType="suggestion"
              contextData={{
                tasks: tasks.slice(0, 10),
                activities: [],
                leads: []
              }}
              title="Task pulse"
              enabled={agentEnabled}
              renderOutput={false}
              onInsightGenerated={rememberTaskPulse}
            />
          </div>
          <aside className="min-h-[92px] border-l border-border/50 pl-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Reports
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate("/insights")}>
                Open history <ExternalLink className="ml-1.5 h-3 w-3" />
              </Button>
            </div>
            {taskPulseReports.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {taskPulseReports.map((report, index) => (
                  <div key={`${report.createdAt}-${index}`} className="min-w-[280px] max-w-[420px] rounded-md border border-border/50 bg-transparent p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                      <span>{report.cached ? "Cached" : "Fresh"}</span>
                      <span>{report.createdAt ? format(new Date(report.createdAt), "MMM d, h:mm a") : "Now"}</span>
                    </div>
                    {typeof report.content === "string" ? (
                      <div className="max-h-40 overflow-y-auto pr-1">
                        <MarkdownText content={report.content} className="space-y-2 text-sm leading-6 text-muted-foreground" />
                      </div>
                    ) : (
                      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(report, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-14 items-center text-sm text-muted-foreground/75">Pulse reports will appear here beside the task list.</div>
            )}
          </aside>
        </div>
      )}

      {selectedTaskPanel}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Done</TableHead>
                <TableHead className="min-w-[120px]">Title</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[150px] hidden md:table-cell">Description</TableHead>
                <TableHead className="min-w-[120px] hidden lg:table-cell">Contact</TableHead>
                <TableHead className="min-w-[120px] hidden sm:table-cell">Due Date</TableHead>
                <TableHead className="min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading tasks...
                </TableCell>
              </TableRow>
            ) : filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={cn("cursor-pointer", task.status === 'completed' ? 'opacity-60' : '', selectedTaskId === task.id && "bg-primary/5")}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleQuickComplete(task.id, task.status)}
                      className="h-5 w-5"
                    />
                  </TableCell>
                  <TableCell className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell className="max-w-xs truncate hidden md:table-cell">{task.description || "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{getContactName(task.contact_id)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {task.due_date ? format(new Date(task.due_date), "MMM dd, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); beginEdit(task); }}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTask(task); }}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={!!deleteTask} onOpenChange={(open) => !open && setDeleteTask(null)}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Delete task</SheetTitle>
            <SheetDescription>
              Remove {deleteTask?.title ? `“${deleteTask.title}”` : "this task"}. This cannot be undone.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteTask(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTask}>Delete</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Tasks;
