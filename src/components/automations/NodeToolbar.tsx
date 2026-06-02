import { Zap, Play, GitBranch, Webhook, Mail, MessageSquare, Calendar, Slack, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const triggerTypes = [
  { id: 'lead_created', label: 'New Lead', description: 'When a new lead is created' },
  { id: 'lead_updated', label: 'Lead Updated', description: 'When a lead is updated' },
  { id: 'lead_stage_changed', label: 'Lead Stage Changed', description: 'When lead moves to new stage' },
  { id: 'form_submitted', label: 'Form Submitted', description: 'When a form is submitted' },
  { id: 'call_completed', label: 'Call Completed', description: 'When a call ends' },
  { id: 'task_created', label: 'Task Created', description: 'When a new task is created' },
  { id: 'task_overdue', label: 'Task Overdue', description: 'When a task becomes overdue' },
  { id: 'contact_created', label: 'Contact Created', description: 'When a new contact is added' },
];

const actionTypes = [
  { id: 'create_lead', label: 'Create Lead', description: 'Create a new lead' },
  { id: 'update_lead', label: 'Update Lead', description: 'Update lead information' },
  { id: 'move_lead_stage', label: 'Move Lead Stage', description: 'Move lead to different stage' },
  { id: 'create_task', label: 'Create Task', description: 'Create a new task' },
  { id: 'create_contact', label: 'Create Contact', description: 'Create a new contact' },
  { id: 'sync_to_sheets', label: 'Sync to Google Sheets', description: 'Sync data to Google Sheets' },
  { id: 'make_call', label: 'Make Call', description: 'Initiate an AI call' },
  { id: 'send_notification', label: 'Send Notification', description: 'Create notification task' },
  { id: 'wait', label: 'Wait/Delay', description: 'Wait before next action' },
];

const conditionTypes = [
  { id: 'lead_value_check', label: 'Check Lead Value', description: 'Check if lead value meets criteria' },
  { id: 'lead_source_check', label: 'Check Lead Source', description: 'Check lead source' },
  { id: 'lead_stage_check', label: 'Check Lead Stage', description: 'Check current lead stage' },
  { id: 'call_status_check', label: 'Check Call Status', description: 'Check if call was successful' },
  { id: 'task_status_check', label: 'Check Task Status', description: 'Check task status' },
  { id: 'time_check', label: 'Check Time/Date', description: 'Check if within time range' },
  { id: 'field_contains', label: 'Field Contains', description: 'Check if field contains text' },
  { id: 'field_empty', label: 'Field Empty/Filled', description: 'Check if field is empty' },
];

const integrationTypes = [
  { id: 'webhook', label: 'Webhook (HTTP)', description: 'Send an HTTP request to any URL', icon: Webhook, method: 'POST', config: { method: 'POST', url: '', headers: '{\n  "Content-Type": "application/json"\n}', body: '{\n  "name": "{lead.name}",\n  "email": "{lead.email}"\n}' } },
  { id: 'webhook_get', label: 'Webhook (GET)', description: 'Fetch data from a URL', icon: Webhook, method: 'GET', config: { method: 'GET', url: '', headers: '{}', body: '' } },
  { id: 'send_email', label: 'Send Email', description: 'Send a transactional email', icon: Mail, config: { toEmail: '{contact.email}', subject: '', message: '' } },
  { id: 'send_sms', label: 'Send SMS', description: 'Send a text message via Twilio', icon: MessageSquare, config: { phoneNumber: '{contact.phone}', message: '' } },
  { id: 'create_event', label: 'Create Calendar Event', description: 'Add an event to a calendar', icon: Calendar, config: { title: '', date: '', duration: '30', notes: '' } },
  { id: 'post_slack', label: 'Post to Slack', description: 'Send a message to a Slack channel', icon: Slack, config: { channel: '#general', message: '' } },
  { id: 'sync_to_sheets', label: 'Google Sheets Row', description: 'Append a row to a sheet', icon: FileSpreadsheet, config: { sheetName: '', tabName: 'Sheet1', columnMapping: '{\n  "Name": "{lead.name}",\n  "Email": "{lead.email}"\n}' } },
];

interface NodeToolbarProps {
  onAddNode: (type: 'trigger' | 'action' | 'condition' | 'webhook', data: any) => void;
}

export function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 border-b bg-background">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Add Trigger
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <ScrollArea className="h-64">
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-3">Select Trigger</h4>
              {triggerTypes.map((trigger) => (
                <button
                  key={trigger.id}
                  onClick={() =>
                    onAddNode('trigger', {
                      label: trigger.label,
                      triggerType: trigger.id,
                    })
                  }
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border"
                >
                  <div className="font-medium text-sm">{trigger.label}</div>
                  <div className="text-xs text-muted-foreground">{trigger.description}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Add Action
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <ScrollArea className="h-64">
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-3">Select Action</h4>
              {actionTypes.map((action) => (
                <button
                  key={action.id}
                  onClick={() =>
                    onAddNode('action', {
                      label: action.label,
                      actionType: action.id,
                    })
                  }
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border"
                >
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <GitBranch className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-medium text-sm mb-3">Select Condition</h4>
            {conditionTypes.map((condition) => (
              <button
                key={condition.id}
                onClick={() =>
                  onAddNode('condition', {
                    label: condition.label,
                    conditionType: condition.id,
                  })
                }
                className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border"
              >
                <div className="font-medium text-sm">{condition.label}</div>
                <div className="text-xs text-muted-foreground">{condition.description}</div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Webhook className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <ScrollArea className="h-64">
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-3">Connect an external system</h4>
              {integrationTypes.map((int) => {
                const Icon = int.icon;
                const isWebhook = int.id.startsWith('webhook');
                return (
                  <button
                    key={int.id}
                    onClick={() =>
                      onAddNode(isWebhook ? 'webhook' : 'action', {
                        label: int.label,
                        actionType: int.id,
                        autoConfigure: true,
                        config: int.config,
                        ...(isWebhook ? { method: int.method, url: '' } : {}),
                      })
                    }
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border flex items-start gap-3"
                  >
                    <Icon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{int.label}</div>
                      <div className="text-xs text-muted-foreground">{int.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
