import {
  LayoutDashboard, Users, UserCircle, BarChart3, Settings, CheckSquare,
  FileText, Bot, Shield, Workflow, Lightbulb, Inbox, Mail, Send, Calendar,
  Palette, Columns3, UserCheck, Megaphone, RefreshCw, PhoneCall,
} from "lucide-react";
import type { ComponentType } from "react";
import type { ModuleId } from "@/hooks/useEnabledModules";
import { CAPABILITIES } from "./registry";

/**
 * SaaS shell navigation — the *lens* over the registry.
 * Source of truth for label + route is registry.ts (capability.label / saasPath).
 * This file only decides: grouping, icon, module gate, ordering.
 *
 * Items can either:
 *   - reference a capability key (preferred — auto-syncs label/path/tier)
 *   - declare a standalone route (for SaaS-only chrome like Tasks/Calendar/Inbox
 *     that aren't yet modeled as capabilities)
 */

export type SaasNavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  module?: ModuleId;
  /** Capability key when this item maps to one. */
  capabilityKey?: string;
  /** Hidden unless viewer is platform admin. */
  adminOnly?: boolean;
};

export type SaasNavGroup = {
  label: string;
  items: SaasNavItem[];
  defaultCollapsed?: boolean;
};

/** Resolve display label + href from registry when capabilityKey is set. */
export function resolveNavItem(item: SaasNavItem): SaasNavItem {
  if (!item.capabilityKey) return item;
  const cap = CAPABILITIES[item.capabilityKey];
  if (!cap) return item;
  return {
    ...item,
    name: item.name || cap.label,
    href: cap.saasPath ?? item.href,
  };
}

export const SAAS_NAV: SaasNavGroup[] = [
  {
    label: "Core",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, capabilityKey: "insights.kpi" },
      { name: "Inbox", href: "/inbox", icon: Inbox, module: "intelligence" },
      { name: "Tasks", href: "/tasks", icon: CheckSquare, module: "crm" },
      { name: "Calendar", href: "/calendar", icon: Calendar, module: "crm" },
    ],
  },
  {
    label: "Growth",
    defaultCollapsed: true,
    items: [
      { name: "Leads", href: "/leads", icon: Users, module: "crm", capabilityKey: "crm.pipeline" },
      { name: "Campaigns", href: "/email-campaigns", icon: Mail, module: "outreach", capabilityKey: "email.campaigns" },
      { name: "Bulk Outreach", href: "/outreach", icon: Send, module: "outreach", capabilityKey: "crm.bulk_outreach" },
      { name: "Voice Campaigns", href: "/voice-campaigns", icon: PhoneCall, module: "outreach", capabilityKey: "comms.broadcast" },
      { name: "Social Media", href: "/social-media", icon: Palette, module: "content", capabilityKey: "content.social" },
      { name: "Forms", href: "/forms", icon: FileText, module: "content", capabilityKey: "forms.builder" },
    ],
  },
  {
    label: "Relationships",
    defaultCollapsed: true,
    items: [
      { name: "Customers", href: "/customers", icon: UserCheck, module: "crm", capabilityKey: "crm.promotion" },
      { name: "Contacts", href: "/contacts", icon: UserCircle, module: "crm", capabilityKey: "crm.contacts" },
      { name: "Renewals", href: "/renewals", icon: RefreshCw, module: "crm", capabilityKey: "booking.renewals" },
      { name: "Booking Sheet", href: "/booking-sheet", icon: Columns3, module: "crm", capabilityKey: "booking.sheet" },
    ],
  },
  {
    label: "Operations",
    defaultCollapsed: true,
    items: [
      { name: "AI Agents", href: "/ai-agents", icon: Bot, module: "outreach", capabilityKey: "agent.chat" },
      { name: "Automations", href: "/automations", icon: Workflow, module: "intelligence", capabilityKey: "auto.workflows" },
      { name: "Content Hub", href: "/content", icon: Megaphone, module: "content", capabilityKey: "content.hub" },
    ],
  },
  {
    label: "Reporting",
    defaultCollapsed: true,
    items: [
      { name: "Insights", href: "/insights", icon: Lightbulb, module: "intelligence", capabilityKey: "insights.ai" },
      { name: "Analytics", href: "/analytics", icon: BarChart3, module: "intelligence" },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Admin", href: "/admin", icon: Shield, adminOnly: true, capabilityKey: "admin.config" },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
