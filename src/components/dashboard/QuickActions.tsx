import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Phone,
  CreditCard,
  Palette,
  MessageSquare,
  Workflow,
  ArrowUpRight,
} from "lucide-react";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Organize Leads",
      description: "View and manage your pipeline",
      icon: Users,
      href: "/leads",
    },
    {
      title: "AI Agent Calls",
      description: "Automated outreach & voicemail",
      icon: Phone,
      href: "/ai-agents",
    },
    {
      title: "Human Outreach",
      description: "Call templates & scripts",
      icon: MessageSquare,
      href: "/call-templates",
    },
    {
      title: "Point of Sale",
      description: "Sell items & charge customers",
      icon: CreditCard,
      href: "/leads",
    },
    {
      title: "Create Content",
      description: "Social media & creatives",
      icon: Palette,
      href: "/social-media",
    },
    {
      title: "Automations",
      description: "Set up workflows",
      icon: Workflow,
      href: "/automations",
    },
  ];

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.title}
                onClick={() => navigate(action.href)}
                className="group relative flex flex-col items-start p-3.5 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-primary/40 hover:shadow-sm transition-all text-left overflow-hidden"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="font-medium text-sm text-foreground">{action.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {action.description}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
