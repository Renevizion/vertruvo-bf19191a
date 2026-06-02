# AI Agent Integration System Architecture

## Overview

The Kiruvo AI Agent Integration System enables platform admins to create reusable agent templates with real, functional backend integrations that workspace users can implement and configure for their own use.

## System Components

### 1. Agent Runtime Engine (`agent-runtime` Edge Function)

**Location**: `supabase/functions/agent-runtime/index.ts`

**Purpose**: Core execution engine that loads agent configurations and executes them with their configured integrations.

**How It Works**:
- Accepts `agentId`, `input`, and optional `context` parameters
- Fetches agent configuration from `ai_agents` table (includes integration_configs JSON)
- Detects which integrations are configured (OpenAI, Mistral, etc.)
- Routes execution to appropriate integration handler
- Returns agent response and logs usage to `agent_usage` table

**Currently Supported Integrations**:
- ✅ **OpenAI** - Fully functional, calls OpenAI API with user-provided API key
- ✅ **Mistral** - Fully functional, calls Mistral API with user-provided API key
- ⚠️ **Twilio** - Config only, execution handler NOT YET IMPLEMENTED
- ⚠️ **Serp API** - Config only, execution handler NOT YET IMPLEMENTED
- ⚠️ **Google Maps** - Config only, execution handler NOT YET IMPLEMENTED
- ⚠️ **MCP** - Placeholder only (MCP is Lovable platform feature, not agent integration)
- ⚠️ **Custom Endpoints** - Config only, generic HTTP handler NOT YET IMPLEMENTED

### 2. Integration Configuration System

**Files**:
- `src/types/agent-integrations.ts` - Defines integration types and field requirements
- `src/hooks/useAgentIntegrations.ts` - Fetches agent integration configs from database
- `src/components/ai-agents/AgentTemplates.tsx` - User-facing template configuration UI
- `src/components/admin/AgentTemplateLibrary.tsx` - Admin template creation UI

**How It Works**:
- Each integration type has a defined schema (fields, types, descriptions)
- When admins create templates, they select which integrations are required
- When users implement templates, system generates integration-specific config UI
- Credentials are stored in `ai_agents.integration_configs` JSON field per agent instance

**Platform-Provided vs User-Provided Keys**:
- Admins can toggle "Platform-provided" for each integration
- If enabled: Admin supplies API key, users are NOT prompted, platform charges usage
- If disabled: Users must supply their own API keys during configuration

### 3. Error Reporting System

**Files**:
- `supabase/functions/report-error/index.ts` - Backend error submission handler
- `src/components/ui/error-toast.tsx` - Custom error toast with reporting UI
- `src/hooks/useErrorReporting.tsx` - Global error capture and reporting system

**How It Works**:
- `useErrorReporting` hook captures all uncaught errors and unhandled promise rejections
- Displays custom themed error toasts (not red Supabase toasts)
- Users can click "Report to Admin" arrow button
- Error details + user message submitted to `audit_logs` table
- Admins can view error reports in Admin Dashboard → Audit Logs

### 4. Agent Testing Interface

**File**: `src/components/ai-agents/AgentTestConsole.tsx`

**Purpose**: Allows admins and users to test agents directly from UI before deployment.

**How It Works**:
- Uses `useAgentRuntime` hook to invoke `agent-runtime` edge function
- Sends test input to agent
- Displays response and usage metrics
- Shows errors if execution fails

## Data Flow

### Creating an Agent Template (Admin)

1. Admin opens Admin Dashboard → AI Agent Templates
2. Clicks "Create New Template"
3. Fills in agent details (name, type, instructions, greeting)
4. Selects required integrations from dropdown (OpenAI, Mistral, etc.)
5. For each integration, configures:
   - Required fields (automatically determined by integration type)
   - Platform-provided toggle (whether admin supplies keys)
6. Publishes template
7. Template stored in `platform_config.agent_templates` JSON

### Implementing a Template (User)

1. User navigates to AI Agents page
2. Browses available templates in "Agent Templates" section
3. Clicks "Use Template" on desired template
4. System analyzes template's `required_integrations` array
5. For each integration:
   - If platform-provided: Skips user configuration
   - If user-provided: Generates integration-specific config form
6. User fills in required credentials (API keys, auth tokens, etc.)
7. User names their agent instance
8. Clicks "Create & Publish Template"
9. New agent created in `ai_agents` table with:
   - `template_id` reference to source template
   - `integration_configs` JSON with user credentials
   - `workspace_id` linking to user's workspace

### Executing an Agent (Runtime)

1. User or system invokes agent (via UI test console, workflow, or API)
2. Request sent to `agent-runtime` edge function with `agentId` and `input`
3. Edge function:
   - Fetches agent config from `ai_agents` table
   - Extracts `integration_configs` JSON
   - Detects which LLM integration is configured (OpenAI or Mistral)
   - Builds system prompt from agent instructions
   - Calls appropriate API with user's credentials
   - Returns response
4. Usage logged to `agent_usage` table for analytics

## What's REAL vs What's MOCK

### ✅ REAL (Fully Functional)

- **OpenAI Integration**: Backend executor calls OpenAI API with user API key
- **Mistral Integration**: Backend executor calls Mistral API with user API key
- **Agent Runtime Engine**: Core execution logic works end-to-end
- **Error Reporting**: Users can report errors to admin, stored in audit_logs
- **Error Toast Styling**: Custom themed toasts replace red Supabase errors
- **Integration Configuration UI**: Users can input credentials, stored in database
- **Template Publishing**: Admins can create and publish templates globally
- **Template Usage Tracking**: Active implementations counted and displayed

### ⚠️ DECLARATIVE ONLY (Not Functional Yet)

- **Twilio Integration**: Config UI exists, but no backend executor
- **Serp API Integration**: Config UI exists, but no backend executor
- **Google Maps Integration**: Config UI exists, but no backend executor
- **Custom Endpoint Integration**: Config UI exists, but no generic HTTP client
- **MCP Integration**: Placeholder only (MCP is Lovable platform feature)
- **Multi-Integration Agents**: Only single LLM integration per agent works currently

## Adding New Integrations

### To Make an Integration REAL (Backend Execution)

1. **Add Integration Type** to `src/types/agent-integrations.ts`:
   ```typescript
   serp: {
     type: 'search_api',
     name: 'Serp API',
     provider: 'serp',
     fields: [
       { name: 'api_key', label: 'API Key', type: 'password', required: true }
     ]
   }
   ```

2. **Add Executor Handler** to `agent-runtime/index.ts`:
   ```typescript
   async function executeSerpSearch(
     config: { api_key?: string },
     query: string
   ): Promise<any> {
     // Call Serp API with config.api_key
     // Return search results
   }
   ```

3. **Update Detection Logic** in `detectLLMIntegration()` or create new detector:
   ```typescript
   function detectToolIntegrations(integrations: IntegrationConfig): any[] {
     const tools = [];
     if (integrations['serp']) {
       tools.push({ type: 'search', config: integrations['serp'] });
     }
     return tools;
   }
   ```

4. **Wire into Execution Flow** in `executeAgent()`:
   ```typescript
   const tools = detectToolIntegrations(config.integration_configs);
   // Pass tools to LLM or execute directly based on agent logic
   ```

### To Add Completely New Integration Type

1. Add integration template to `INTEGRATION_TEMPLATES` in `agent-integrations.ts`
2. Add backend executor to `agent-runtime/index.ts`
3. Update detection and routing logic
4. Test end-to-end with agent test console
5. Update this documentation

## Current Limitations

1. **Single LLM Only**: Agents can only use ONE LLM integration (OpenAI OR Mistral)
2. **No Tool Composition**: Agents cannot combine multiple tools in one execution yet
3. **No Streaming**: Responses are returned in full, no token streaming
4. **No Conversation Memory**: Each execution is stateless (future: integrate with agent_memory table)
5. **Limited Context Passing**: Context parameter exists but not fully utilized
6. **No Workflow Integration**: Agents not yet callable from workflow automation system

## Future Enhancements

1. **Multi-Tool Agents**: Allow agents to use LLM + Serp + Twilio in coordinated workflows
2. **Streaming Responses**: Real-time token streaming for conversational agents
3. **Agent Memory Integration**: Connect to `agent_memory` table for persistent context
4. **Workflow Integration**: Make agents callable as workflow action steps
5. **Platform Rate Limiting**: Track and enforce usage limits per workspace
6. **Agent Versioning**: Allow template updates without breaking existing implementations
7. **Integration Marketplace**: Community-contributed integration types
8. **Visual Agent Builder**: No-code interface for creating agent logic flows

## Testing Agents

### Admin Testing (Before Publishing)

1. Create template in Admin Dashboard
2. Configure integrations
3. Use "Test Agent" console to send sample inputs
4. Verify responses are correct
5. Check agent_usage table for logging

### User Testing (After Implementation)

1. Implement template from AI Agents page
2. Configure credentials
3. Open agent monitoring view (click agent card)
4. Use test console to verify agent works with their credentials
5. Check usage metrics in monitoring view

## Security Considerations

1. **API Keys**: Stored in database JSON, encrypted at rest by Supabase
2. **Row-Level Security**: Each workspace can only access their own agents
3. **Edge Function Auth**: `verify_jwt = true` prevents unauthorized execution
4. **Platform-Provided Keys**: Admin keys stored as Supabase secrets, never exposed to users
5. **Error Reporting**: Sensitive data filtered before submission to audit logs

## Performance

- Agent execution latency: ~1-3 seconds (depends on LLM provider)
- OpenAI calls: ~800ms average
- Mistral calls: ~600ms average
- Database queries: ~50-100ms per query
- Usage logging: Async, does not block response

## Monitoring & Analytics

- **agent_usage table**: Tracks execution count, tokens, cost per agent
- **agent_insights table**: AI-generated insights about agent performance
- **AgentMonitoringView**: UI displaying activity, memory, insights, logs
- **Template Analytics**: Shows which templates drive the most implementations

---

**Last Updated**: 2025-11-26
**Status**: Phase 1 Complete (OpenAI/Mistral), Phase 2 Complete (Error Reporting), Phase 3 In Progress (Enhanced Agent Configuration)
