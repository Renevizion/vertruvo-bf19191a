import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface NodeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeType: string;
  nodeLabel: string;
  config: any;
  onSave: (config: any) => void;
}

export function NodeConfigDialog({ 
  open, 
  onOpenChange, 
  nodeType, 
  nodeLabel,
  config = {},
  onSave 
}: NodeConfigDialogProps) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    if (open) setLocalConfig(config || {});
  }, [config, open]);

  // ── Staff list for assignee dropdown ──────────────────────────────────────
  const { data: staffList } = useQuery({
    queryKey: ["workspace-staff-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("user_id, profiles:user_id(first_name, last_name, email)")
        .order("created_at");
      if (error) return [];
      return (data || []).map((m: any) => ({
        id: m.user_id,
        name: m.profiles ? `${m.profiles.first_name || ""} ${m.profiles.last_name || ""}`.trim() || m.profiles.email : m.user_id,
      }));
    },
    enabled: open && (nodeLabel === "Create Task" || nodeLabel === "Create Follow-up Task"),
  });

  const handleSave = () => {
    onSave(localConfig);
    onOpenChange(false);
  };

  const renderConfigFields = () => {
    switch (nodeLabel) {
      case "Send Email":
      case "Send Welcome Email":
        return (
          <>
            <div>
              <Label>To Email</Label>
              <Input
                placeholder="email@example.com or {lead.email}"
                value={localConfig.toEmail || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, toEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                placeholder="Email subject"
                value={localConfig.subject || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, subject: e.target.value })}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="Email message (use {lead.name} for dynamic values)"
                value={localConfig.message || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, message: e.target.value })}
                rows={4}
              />
            </div>
          </>
        );

      case "Send SMS":
        return (
          <>
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="+1234567890 or {lead.phone}"
                value={localConfig.phoneNumber || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, phoneNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="SMS message (use {lead.name} for dynamic values)"
                value={localConfig.message || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, message: e.target.value })}
                rows={3}
              />
            </div>
          </>
        );

      case "Add to Google Sheets":
      case "Google Sheets Row":
      case "Sync to Google Sheets":
        return (
          <>
            <div>
              <Label>Spreadsheet Name</Label>
              <Input
                placeholder="e.g. Customer Leads 2026"
                value={localConfig.sheetName || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, sheetName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">The name of your Google Sheet (not the tab).</p>
            </div>
            <div>
              <Label>Tab Name</Label>
              <Input
                placeholder="Sheet1"
                value={localConfig.tabName || "Sheet1"}
                onChange={(e) => setLocalConfig({ ...localConfig, tabName: e.target.value })}
              />
            </div>
            <div>
              <Label>Column Mapping (JSON)</Label>
              <Textarea
                placeholder='{"Name": "{lead.name}", "Email": "{lead.email}"}'
                value={localConfig.columnMapping || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, columnMapping: e.target.value })}
                rows={4}
              />
            </div>
          </>
        );

      case "Create Lead":
        return (
          <>
            <div>
              <Label>Lead Name</Label>
              <Input
                placeholder="Lead name or {form.name}"
                value={localConfig.leadName || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, leadName: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                placeholder="email@example.com or {form.email}"
                value={localConfig.email || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="+1234567890 or {form.phone}"
                value={localConfig.phone || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Pipeline Stage</Label>
              <Select
                value={localConfig.stageId || ""}
                onValueChange={(value) => setLocalConfig({ ...localConfig, stageId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "Update Lead Status":
        return (
          <>
            <div>
              <Label>New Status</Label>
              <Select
                value={localConfig.status || ""}
                onValueChange={(value) => setLocalConfig({ ...localConfig, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "Create Task":
      case "Create Follow-up Task":
        return (
          <>
            <div>
              <Label>Task Title</Label>
              <Input
                placeholder="Task title"
                value={localConfig.title || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Task description"
                value={localConfig.description || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={localConfig.dueDate || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, dueDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Assign To (Optional)</Label>
              {staffList && staffList.length > 0 ? (
                <Select
                  value={localConfig.assigneeId || "__none__"}
                  onValueChange={(v) => setLocalConfig({ ...localConfig, assigneeId: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Leave blank to leave unassigned"
                  value={localConfig.assigneeId || ""}
                  onChange={(e) => setLocalConfig({ ...localConfig, assigneeId: e.target.value })}
                />
              )}
            </div>
          </>
        );
      
      case "Assign to New Lead Pipeline":
      case "Assign to Pipeline":
        return (
          <>
            <div>
              <Label>Pipeline</Label>
              <Select
                value={localConfig.pipelineId || ""}
                onValueChange={(value) => setLocalConfig({ ...localConfig, pipelineId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Pipeline</SelectItem>
                  <SelectItem value="sales">Sales Pipeline</SelectItem>
                  <SelectItem value="support">Support Pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage (Optional)</Label>
              <Select
                value={localConfig.stageId || "none"}
                onValueChange={(value) => setLocalConfig({ ...localConfig, stageId: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default Stage</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "Make AI Call":
        return (
          <>
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="+1234567890 or {lead.phone}"
                value={localConfig.phoneNumber || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, phoneNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>AI Agent</Label>
              <Select
                value={localConfig.agentId || ""}
                onValueChange={(value) => setLocalConfig({ ...localConfig, agentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "Webhook (HTTP)":
      case "Webhook (GET)":
        return (
          <>
            <div>
              <Label>Method</Label>
              <Select value={localConfig.method || (nodeLabel.includes("GET") ? "GET" : "POST")} onValueChange={(method) => setLocalConfig({ ...localConfig, method })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Endpoint URL</Label>
              <Input placeholder="https://api.example.com/endpoint" value={localConfig.url || ""} onChange={(e) => setLocalConfig({ ...localConfig, url: e.target.value })} />
            </div>
            <div>
              <Label>Headers</Label>
              <Textarea placeholder={'{\n  "Authorization": "Bearer ..."\n}'} value={localConfig.headers || "{}"} onChange={(e) => setLocalConfig({ ...localConfig, headers: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea placeholder={'{\n  "email": "{lead.email}"\n}'} value={localConfig.body || ""} onChange={(e) => setLocalConfig({ ...localConfig, body: e.target.value })} rows={5} />
            </div>
          </>
        );

      case "Post to Slack":
        return (
          <>
            <div>
              <Label>Channel</Label>
              <Input placeholder="#sales" value={localConfig.channel || ""} onChange={(e) => setLocalConfig({ ...localConfig, channel: e.target.value })} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea placeholder="New lead: {lead.name}" value={localConfig.message || ""} onChange={(e) => setLocalConfig({ ...localConfig, message: e.target.value })} rows={4} />
            </div>
          </>
        );

      case "Create Calendar Event":
        return (
          <>
            <div>
              <Label>Event Title</Label>
              <Input placeholder="Consultation with {contact.name}" value={localConfig.title || ""} onChange={(e) => setLocalConfig({ ...localConfig, title: e.target.value })} />
            </div>
            <div>
              <Label>Date / Time</Label>
              <Input placeholder="{booking.starts_at} or 2026-05-24T14:00" value={localConfig.date || ""} onChange={(e) => setLocalConfig({ ...localConfig, date: e.target.value })} />
            </div>
            <div>
              <Label>Duration minutes</Label>
              <Input placeholder="30" value={localConfig.duration || "30"} onChange={(e) => setLocalConfig({ ...localConfig, duration: e.target.value })} />
            </div>
          </>
        );

      case "Lead Value > Amount":
      case "Lead Source Is":
      case "Lead Stage Is":
        return (
          <>
            <div>
              <Label>Condition Value</Label>
              <Input
                placeholder="Enter value to compare"
                value={localConfig.value || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, value: e.target.value })}
              />
            </div>
          </>
        );

      default:
        return (
          <div>
            <Label>Custom Configuration (JSON)</Label>
            <Textarea
              placeholder='{"key": "value"}'
              value={JSON.stringify(localConfig, null, 2)}
              onChange={(e) => {
                try {
                  setLocalConfig(JSON.parse(e.target.value));
                } catch (err) {
                  // Invalid JSON, keep as string
                }
              }}
              rows={6}
            />
          </div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configure {nodeLabel}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {renderConfigFields()}
        </div>
        <SheetFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
