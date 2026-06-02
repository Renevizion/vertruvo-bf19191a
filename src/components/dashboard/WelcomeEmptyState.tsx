import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Phone, CalendarDays, BookOpen, Zap, ArrowRight, CheckCircle2, X } from "lucide-react";
import { useState } from "react";

interface WelcomeEmptyStateProps {
  businessName?: string;
  hasLeads: boolean;
  hasWorkflows: boolean;
  hasForms: boolean;
  hasAgents: boolean;
  hasTwilio?: boolean;
  hasKnowledgeBase?: boolean;
  hasBookingConfig?: boolean;
}

export function WelcomeEmptyState({
  businessName,
  hasWorkflows,
  hasAgents,
  hasTwilio,
  hasKnowledgeBase,
  hasBookingConfig,
}: WelcomeEmptyStateProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const steps = [
    {
      id: "voice",
      title: "Set up your AI phone line",
      description: "Connect your number so Thermi can answer calls, book jobs, and follow up — automatically.",
      icon: Phone,
      completed: !!hasTwilio || !!hasAgents,
      action: () => navigate("/settings?tab=phone-numbers"),
      cta: "Connect phone",
    },
    {
      id: "booking",
      title: "Configure your Booking Sheet",
      description: "Set your service types, hours, and buffer time. Customers book themselves — you just show up.",
      icon: CalendarDays,
      completed: !!hasBookingConfig,
      action: () => navigate("/settings?tab=items"),
      cta: "Set up booking",
    },
    {
      id: "knowledge",
      title: "Build your Knowledge Base",
      description: "Tell the AI your hours, pricing, service area, and FAQs. The more it knows, the better it books.",
      icon: BookOpen,
      completed: !!hasKnowledgeBase,
      action: () => navigate("/settings?tab=knowledge-base"),
      cta: "Add your info",
    },
    {
      id: "automation",
      title: "Turn on your first automation",
      description: "\"If someone calls and doesn't book, text them 2 hours later.\" One click. Done.",
      icon: Zap,
      completed: !!hasWorkflows,
      action: () => navigate("/automations?showQuickAutomation=true"),
      cta: "Enable follow-up",
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (dismissed || completedCount === steps.length) return null;

  return (
    <Card className="relative overflow-hidden p-5 sm:p-6 border-border/70 bg-gradient-to-br from-primary/5 via-card to-card">
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Setup checklist
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            {businessName ? `Let's get ${businessName} running` : "Get Thermi running in 10 minutes"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete these 4 steps and your AI will be answering calls and booking jobs on its own.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{completedCount}/{steps.length} done</span>
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid sm:grid-cols-2 gap-2.5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={step.completed ? undefined : step.action}
              disabled={step.completed}
              className={`group flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                step.completed
                  ? "bg-muted/30 border-border/40 cursor-default opacity-60"
                  : "bg-card border-border/70 hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer"
              }`}
            >
              <div className={`p-2 rounded-lg ring-1 shrink-0 transition-colors ${
                step.completed
                  ? "bg-primary/10 text-primary ring-primary/20"
                  : "bg-muted text-muted-foreground ring-border group-hover:bg-primary/10 group-hover:text-primary group-hover:ring-primary/20"
              }`}>
                {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${step.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {step.description}
                </div>
                {!step.completed && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 group-hover:gap-1.5 transition-all">
                    {step.cta} <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
