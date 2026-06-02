import { Card } from "@/components/ui/card";
import { Mail, Phone, FileText, UserPlus, ListTodo, Star, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  nodes: any[];
  edges: any[];
}

const templates: Template[] = [
  {
    id: "new-lead-welcome",
    name: "New Lead Welcome",
    description: "Send welcome email and create task when new lead is added",
    icon: <UserPlus className="h-5 w-5" />,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 100, y: 100 },
        data: { label: "New Lead Created", triggerType: "lead_created" }
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 100, y: 200 },
        data: { label: "Create Follow-up Task", actionType: "create_task" }
      }
    ],
    edges: [{ id: "e1", source: "trigger-1", target: "action-1" }]
  },
  {
    id: "form-to-lead",
    name: "Form Submission to Lead",
    description: "Convert form submissions to leads and assign to pipeline",
    icon: <FileText className="h-5 w-5" />,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 100, y: 100 },
        data: { label: "Form Submitted", triggerType: "form_submitted" }
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 100, y: 200 },
        data: { label: "Create Lead", actionType: "create_lead" }
      },
      {
        id: "action-2",
        type: "action",
        position: { x: 100, y: 300 },
        data: { label: "Sync to Google Sheets", actionType: "sync_to_sheets" }
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "action-1" },
      { id: "e2", source: "action-1", target: "action-2" }
    ]
  },
  {
    id: "high-value-alert",
    name: "High Value Lead Alert",
    description: "Send notification when high-value lead is created",
    icon: <Mail className="h-5 w-5" />,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 100, y: 100 },
        data: { label: "New Lead Created", triggerType: "lead_created" }
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 100, y: 200 },
        data: { label: "Value > $10,000?", conditionType: "lead_value_check" }
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 50, y: 300 },
        data: { label: "Create Urgent Task", actionType: "create_task" }
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "condition-1" },
      { id: "e2", source: "condition-1", target: "action-1", sourceHandle: "true" }
    ]
  },
  {
    id: "call-follow-up",
    name: "Missed Call Follow-up",
    description: "Create task when call is missed or unsuccessful",
    icon: <Phone className="h-5 w-5" />,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 100, y: 100 },
        data: { label: "Call Completed", triggerType: "call_completed" }
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 100, y: 200 },
        data: { label: "Call Successful?", conditionType: "call_status_check" }
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 200, y: 300 },
        data: { label: "Create Follow-up Task", actionType: "create_task" }
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "condition-1" },
      { id: "e2", source: "condition-1", target: "action-1", sourceHandle: "false" }
    ]
  },
  {
    id: "task-reminder",
    name: "Overdue Task Reminder",
    description: "Send reminders for overdue tasks",
    icon: <ListTodo className="h-5 w-5" />,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 100, y: 100 },
        data: { label: "Task Overdue", triggerType: "task_overdue" }
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 100, y: 200 },
        data: { label: "Create Reminder Task", actionType: "create_task" }
      }
    ],
    edges: [{ id: "e1", source: "trigger-1", target: "action-1" }]
  }
];

const quickAutomations = [
  {
    id: "qa-missed-call-text",
    title: "Missed call? Text them back.",
    description: "If someone calls and doesn't book, send them a text 2 hours later.",
    emoji: "📞",
    nodes: [
      { id: "t1", type: "trigger", position: { x: 100, y: 100 }, data: { label: "Call Not Answered", triggerType: "call_completed" } },
      { id: "a1", type: "action", position: { x: 100, y: 220 }, data: { label: "Wait 2 Hours", actionType: "wait" } },
      { id: "a2", type: "action", position: { x: 100, y: 340 }, data: { label: "Send Follow-up SMS", actionType: "send_sms" } },
    ],
    edges: [{ id: "e1", source: "t1", target: "a1" }, { id: "e2", source: "a1", target: "a2" }],
  },
  {
    id: "qa-form-to-sms",
    title: "New inquiry? Text them instantly.",
    description: "When someone fills out your form, send them a text within 60 seconds.",
    emoji: "📋",
    nodes: [
      { id: "t1", type: "trigger", position: { x: 100, y: 100 }, data: { label: "Form Submitted", triggerType: "form_submitted" } },
      { id: "a1", type: "action", position: { x: 100, y: 220 }, data: { label: "Create Lead", actionType: "create_lead" } },
      { id: "a2", type: "action", position: { x: 100, y: 340 }, data: { label: "Send Welcome SMS", actionType: "send_sms" } },
    ],
    edges: [{ id: "e1", source: "t1", target: "a1" }, { id: "e2", source: "a1", target: "a2" }],
  },
  {
    id: "qa-booking-reminder",
    title: "Remind them the day before.",
    description: "Send a reminder text 24 hours before every booked appointment.",
    emoji: "🗓️",
    nodes: [
      { id: "t1", type: "trigger", position: { x: 100, y: 100 }, data: { label: "Appointment Tomorrow", triggerType: "appointment_reminder" } },
      { id: "a1", type: "action", position: { x: 100, y: 220 }, data: { label: "Send Reminder SMS", actionType: "send_sms" } },
    ],
    edges: [{ id: "e1", source: "t1", target: "a1" }],
  },
  {
    id: "qa-no-show-followup",
    title: "No-show? Reach back out.",
    description: "If someone misses their appointment, follow up with a reschedule link.",
    emoji: "🔄",
    nodes: [
      { id: "t1", type: "trigger", position: { x: 100, y: 100 }, data: { label: "Appointment No-Show", triggerType: "appointment_no_show" } },
      { id: "a1", type: "action", position: { x: 100, y: 220 }, data: { label: "Wait 1 Hour", actionType: "wait" } },
      { id: "a2", type: "action", position: { x: 100, y: 340 }, data: { label: "Send Reschedule SMS", actionType: "send_sms" } },
    ],
    edges: [{ id: "e1", source: "t1", target: "a1" }, { id: "e2", source: "a1", target: "a2" }],
  },
];

interface WorkflowTemplatesProps {
  onSelectTemplate: (template: { name: string; description: string; nodes: any[]; edges: any[] }) => void;
}

export function WorkflowTemplates({ onSelectTemplate }: WorkflowTemplatesProps) {
  // Fetch published templates from admin
  const { data: publishedTemplates } = useQuery({
    queryKey: ["workflow-templates-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .eq("key", "workflow_templates")
        .single();

      if (error && error.code !== "PGRST116") return [];
      return (data?.value as any) || [];
    },
  });

  // Combine default templates with published ones
  const allTemplates = [
    ...templates,
    ...(publishedTemplates || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: <FileText className="h-5 w-5" />,
      nodes: t.nodes,
      edges: t.edges,
      is_featured: t.is_featured,
      category: t.category,
    })),
  ];

  const featuredTemplates = allTemplates.filter((t: any) => t.is_featured);
  const regularTemplates = allTemplates.filter((t: any) => !t.is_featured);

  return (
    <div className="space-y-6 p-1">
      {/* Quick Automations — plain-English one-click */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Quick Automations</h3>
          <span className="text-xs text-muted-foreground">One click to activate</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {quickAutomations.map((qa) => (
            <button
              key={qa.id}
              onClick={() => onSelectTemplate({ name: qa.title, description: qa.description, nodes: qa.nodes, edges: qa.edges })}
              className="group flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5 transition-all text-left"
            >
              <span className="text-2xl shrink-0 mt-0.5">{qa.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{qa.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{qa.description}</div>
                <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Use this template →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-3">All Templates</h3>

        {featuredTemplates.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span>Featured</span>
            </div>
            <div className="grid gap-2">
              {featuredTemplates.map((template: any) => (
                <Card
                  key={template.id}
                  className="p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onSelectTemplate({
                    name: template.name,
                    description: template.description,
                    nodes: template.nodes,
                    edges: template.edges,
                  })}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{template.name}</h4>
                        {template.category && (
                          <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-2">
          {regularTemplates.map((template: any) => (
            <Card
              key={template.id}
              className="p-3 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => onSelectTemplate({
                name: template.name,
                description: template.description,
                nodes: template.nodes,
                edges: template.edges,
              })}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-primary">{template.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{template.name}</h4>
                    {template.category && (
                      <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
