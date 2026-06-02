import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  User, 
  CheckSquare, 
  Phone, 
  Settings, 
  Users, 
  BarChart3,
  Workflow,
  FileText,
  Bot,
  BookOpen,
  Columns,
  TrendingUp,
  Zap,
  Clock,
  Sparkles,
  ArrowRightLeft
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PromptCampaignLauncher } from "@/components/campaign/PromptCampaignLauncher";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", u.user.id).maybeSingle();
      if (ws?.id) setWorkspaceId(ws.id);
    })();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: contacts = [] } = useQuery({
    queryKey: ["search-contacts", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email, phone")
        .or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length > 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["search-tasks", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status")
        .ilike("title", `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length > 0,
  });

  const { data: callLogs = [] } = useQuery({
    queryKey: ["search-calls", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("call_logs")
        .select("id, phone_number, status, created_at")
        .ilike("phone_number", `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length > 0,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["search-leads", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, name, email, stage_id")
        .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length > 0,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["search-workflows", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("workflows")
        .select("id, name, trigger_type, is_active")
        .ilike("name", `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length > 0,
  });

  const { data: forms = [] } = useQuery({
    queryKey: ["search-forms", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("forms")
        .select("id, name, is_active")
        .ilike("name", `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length > 0,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["search-agents", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("ai_agents")
        .select("id, name, type, status")
        .ilike("name", `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length > 0,
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["search-pipelines", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("pipelines")
        .select("id, name, description")
        .ilike("name", `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length > 0,
  });

  const quickActions = [
    { name: "View Dashboard", path: "/dashboard", icon: BarChart3 },
    { name: "All Contacts", path: "/contacts", icon: User },
    { name: "My Tasks", path: "/tasks", icon: CheckSquare },
    { name: "Call Analytics", path: "/call-analytics", icon: Phone },
    { name: "Workflows", path: "/automations", icon: Workflow },
    { name: "Pipelines", path: "/pipelines", icon: TrendingUp },
    { name: "Forms", path: "/forms", icon: FileText },
    { name: "AI Agents", path: "/ai-agents", icon: Bot },
  ];

  const adminPages = [
    { name: "Admin Dashboard", path: "/admin", icon: BarChart3 },
    { name: "User Management", path: "/admin", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <>
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search contacts, tasks, calls..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center">
            <div className="mb-2 text-muted-foreground">No results found</div>
            <div className="text-xs text-muted-foreground">
              Try searching for contacts, leads, tasks, or workflows
            </div>
          </div>
        </CommandEmpty>

        {!search && (
          <>
            <CommandGroup heading="AI Shortcuts">
              <CommandItem
                onSelect={() => handleSelect(() => { if (workspaceId) setLauncherOpen(true); })}
                disabled={!workspaceId}
              >
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                Launch outreach from a prompt
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate("/handoffs"))}>
                <ArrowRightLeft className="mr-2 h-4 w-4 text-primary" />
                Open Handoff inbox
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate("/ai-trust-center"))}>
                <Zap className="mr-2 h-4 w-4 text-primary" />
                AI Trust Center
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.path}
                  onSelect={() => handleSelect(() => navigate(action.path))}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {contacts.map((contact: any) => (
              <CommandItem
                key={contact.id}
                onSelect={() =>
                  handleSelect(() => navigate(`/contacts/${contact.id}`))
                }
              >
                <User className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{contact.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {contact.email || contact.phone}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {tasks.map((task: any) => (
              <CommandItem
                key={task.id}
                onSelect={() => handleSelect(() => navigate("/tasks"))}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {leads.length > 0 && (
          <CommandGroup heading="Leads">
            {leads.map((lead: any) => (
              <CommandItem
                key={lead.id}
                onSelect={() => handleSelect(() => navigate("/leads"))}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{lead.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {lead.email}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {callLogs.length > 0 && (
          <CommandGroup heading="Call Logs">
            {callLogs.map((call: any) => (
              <CommandItem
                key={call.id}
                onSelect={() => handleSelect(() => navigate("/call-analytics"))}
              >
                <Phone className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{call.phone_number}</span>
                  <span className="text-xs text-muted-foreground">
                    {call.status} - {new Date(call.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {workflows.length > 0 && (
          <CommandGroup heading="Workflows">
            {workflows.map((workflow: any) => (
              <CommandItem
                key={workflow.id}
                onSelect={() => handleSelect(() => navigate("/automations"))}
              >
                <Workflow className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{workflow.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {workflow.trigger_type} • {workflow.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {forms.length > 0 && (
          <CommandGroup heading="Forms">
            {forms.map((form: any) => (
              <CommandItem
                key={form.id}
                onSelect={() => handleSelect(() => navigate("/forms"))}
              >
                <FileText className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{form.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {form.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {agents.length > 0 && (
          <CommandGroup heading="AI Agents">
            {agents.map((agent: any) => (
              <CommandItem
                key={agent.id}
                onSelect={() => handleSelect(() => navigate("/ai-agents"))}
              >
                <Bot className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{agent.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {agent.type} • {agent.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {pipelines.length > 0 && (
          <CommandGroup heading="Pipelines">
            {pipelines.map((pipeline: any) => (
              <CommandItem
                key={pipeline.id}
                onSelect={() => handleSelect(() => navigate("/pipelines"))}
              >
                <Columns className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{pipeline.name}</span>
                  {pipeline.description && (
                    <span className="text-xs text-muted-foreground">
                      {pipeline.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {isAdmin && search.length > 0 && (
          <CommandGroup heading="Admin & Settings">
            {adminPages
              .filter((page) =>
                page.name.toLowerCase().includes(search.toLowerCase())
              )
              .map((page) => (
                <CommandItem
                  key={page.path}
                  onSelect={() => handleSelect(() => navigate(page.path))}
                >
                  <page.icon className="mr-2 h-4 w-4" />
                  {page.name}
                </CommandItem>
              ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
    {workspaceId && (
      <PromptCampaignLauncher open={launcherOpen} onOpenChange={setLauncherOpen} workspaceId={workspaceId} />
    )}
    </>
  );
};
