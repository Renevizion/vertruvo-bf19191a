import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Key, Globe, Zap, Lock, FileText } from "lucide-react";

const API_BASE = "https://dpbbylcycltexyknejcb.supabase.co/functions/v1";

interface EndpointDoc {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth: "Bearer token" | "API key" | "None";
  body?: Record<string, string>;
  response?: string;
}

const endpoints: Record<string, EndpointDoc[]> = {
  "Forms": [
    {
      method: "POST",
      path: "/form-submit",
      description: "Submit a form entry. Triggers workflow automations and auto-response emails.",
      auth: "None",
      body: { form_id: "uuid", fields: "Record<string, any>" },
      response: '{ "success": true, "submission_id": "uuid" }',
    },
    {
      method: "POST",
      path: "/trigger-form-view",
      description: "Track a form view for analytics.",
      auth: "None",
      body: { form_id: "uuid", variant_id: "string?" },
    },
  ],
  "Webhooks": [
    {
      method: "POST",
      path: "/execute-webhook",
      description: "Execute a configured webhook. Sends payload to registered URL with signature verification.",
      auth: "Bearer token",
      body: { webhook_id: "uuid", payload: "any" },
    },
    {
      method: "POST",
      path: "/workflow-trigger",
      description: "Trigger a workflow execution externally.",
      auth: "Bearer token",
      body: { workflow_id: "uuid", trigger_data: "Record<string, any>" },
    },
  ],
  "AI Agents": [
    {
      method: "POST",
      path: "/agent-runtime",
      description: "Execute an AI agent with a message. Returns the agent's response.",
      auth: "Bearer token",
      body: { agent_id: "uuid", message: "string", context: "object?" },
      response: '{ "response": "string", "insights": [] }',
    },
    {
      method: "POST",
      path: "/kiruvo-ai-agent",
      description: "Execute a Thermi AI-powered agent query with CRM context.",
      auth: "Bearer token",
      body: { message: "string", context: "object?" },
    },
  ],
  "Contacts & Leads": [
    {
      method: "POST",
      path: "/google-sheets-sync",
      description: "Sync leads from Google Sheets to Thermi CRM.",
      auth: "Bearer token",
      body: { sheet_id: "string", tab: "string?" },
    },
  ],
  "Voice": [
    {
      method: "POST",
      path: "/twilio-make-call",
      description: "Initiate an outbound call via Twilio with AI assistant.",
      auth: "Bearer token",
      body: { phone_number: "string", agent_id: "uuid?", template_id: "uuid?" },
    },
    {
      method: "POST",
      path: "/voice-broadcast",
      description: "Send a voice broadcast to multiple numbers.",
      auth: "Bearer token",
      body: { numbers: "string[]", message: "string", agent_id: "uuid?" },
    },
  ],
  "Email": [
    {
      method: "POST",
      path: "/send-transactional-email",
      description: "Send a transactional email using a registered template.",
      auth: "Bearer token",
      body: { templateName: "string", recipientEmail: "string", templateData: "object?", idempotencyKey: "string" },
    },
  ],
};

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  POST: "bg-blue-500/10 text-blue-700 border-blue-300",
  PUT: "bg-amber-500/10 text-amber-700 border-amber-300",
  DELETE: "bg-red-500/10 text-red-700 border-red-300",
};

const APIDocs = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Integrate Thermi into your applications with our REST API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Most endpoints require a Bearer token in the Authorization header. Get your token from
            your authenticated session.
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <code>
              Authorization: Bearer {'<your-session-token>'}
            </code>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Base URL:</span>
            <code className="bg-muted px-2 py-1 rounded text-xs">{API_BASE}</code>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={Object.keys(endpoints)[0]}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {Object.keys(endpoints).map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(endpoints).map(([category, docs]) => (
          <TabsContent key={category} value={category} className="space-y-4 mt-4">
            {docs.map((endpoint, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Badge className={`${methodColors[endpoint.method]} border font-mono text-xs`}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-semibold">{endpoint.path}</code>
                  </div>
                  <CardDescription>{endpoint.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Auth:</span>
                    <Badge variant="outline" className="text-xs">{endpoint.auth}</Badge>
                  </div>
                  {endpoint.body && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Request Body</p>
                      <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto">
                        <pre>{JSON.stringify(endpoint.body, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                  {endpoint.response && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
                      <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto">
                        <pre>{endpoint.response}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            API requests are rate-limited per workspace. Default limits are 100 requests per minute
            for authenticated endpoints. Contact support for higher limits on Enterprise plans.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default APIDocs;
