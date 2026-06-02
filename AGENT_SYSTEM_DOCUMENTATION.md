# Kiruvo AI Agent System Documentation

## Overview

The Kiruvo AI Agent system enables platform admins to create, configure, and publish AI agent templates that workspace users can implement for their specific business needs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN PANEL                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AI Agent Creator (AI-assisted)                          │   │
│  │  - Describe agent in natural language                    │   │
│  │  - AI generates comprehensive config                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Agent Template Library                                   │   │
│  │  - Review/edit all configuration tabs                    │   │
│  │  - Details, Data Access, Behavior, Tools, Integrations   │   │
│  │  - Publish to platform_config                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ Published Templates
┌─────────────────────────────────────────────────────────────────┐
│                    WORKSPACE USERS                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Template Browser                                         │   │
│  │  - Browse published templates                            │   │
│  │  - See required integrations                             │   │
│  │  - Implement template → creates ai_agents record         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Integration Configuration                                │   │
│  │  - Configure required API keys/credentials               │   │
│  │  - Stored in agent.integration_configs                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ Agent Execution
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT RUNTIME                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Edge Function: agent-runtime                            │   │
│  │  1. Load agent config from ai_agents table               │   │
│  │  2. Build system prompt from behavior/data_access/tools  │   │
│  │  3. Load memory if enabled                               │   │
│  │  4. Execute LLM (Lovable AI → User Keys → Platform Keys) │   │
│  │  5. Execute tool integrations if requested               │   │
│  │  6. Store memory, log usage                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Tabs Explained

### 1. Details Tab
Basic agent information that identifies and categorizes the agent.

| Field | Purpose | Example |
|-------|---------|---------|
| **Name** | Display name | "Lead Qualifier Bot" |
| **Type** | Agent modality | `workflow`, `conversation`, `voice` |
| **Category** | Classification | `sales`, `support`, `lead_management`, `automation`, `general` |
| **Description** | What the agent does | "Qualifies leads by asking budget, timeline, needs questions" |
| **Greeting** | Initial message | "Hi! I'm here to help understand your needs..." |
| **Instructions** | Core behavioral instructions | "Ask about budget first, then timeline..." |
| **Voice** | (Voice agents only) | `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |

### 2. Data Access Tab
Controls what CRM data the agent can read/write.

| Field | Purpose | How It Works |
|-------|---------|--------------|
| **Scopes** | Data types accessible | Array: `leads`, `contacts`, `tasks`, `activities`, `forms`, `pipelines`, `opportunities`, `messages`, `emails`, `workflows` |
| **Read Only** | Can agent modify data? | `true` = read only, `false` = read/write |
| **Max Records** | Query limit | Prevents runaway queries (e.g., 100) |
| **Input Schema** | Expected input format | `text`, `json`, `form_data` |
| **Output Schema** | Response format | `text`, `json`, `structured`, `action` |

**Runtime Effect:** The system prompt includes data access context:
```
Data Access: You have access to leads, contacts, tasks. 
You can only READ this data. Maximum records: 100.
```

### 3. Behavior Tab
Controls HOW the agent responds.

| Field | Purpose | Options |
|-------|---------|---------|
| **Mode** | Agent personality type | `assistant` (helpful), `executor` (action-focused), `analyzer` (data insights), `validator` (quality checks), `custom` |
| **Personality** | Personality description | "Professional, empathetic, solution-oriented" |
| **Response Style** | Communication style | `concise`, `detailed`, `technical`, `friendly` |
| **Temperature** | Creativity level | 0.1 (focused) → 1.0 (creative) |
| **Max Tokens** | Response length limit | 200-2000 |
| **Custom Rules** | Specific behaviors | Array of rules like "Never discuss pricing" |

**Runtime Effect:** Temperature and max_tokens are passed to the LLM. Mode and style are injected into system prompt:
```
Personality: Professional and empathetic

Response Style: Keep responses brief and to the point.

You are a data analyst. Focus on insights, patterns, and data-driven recommendations.

Custom Rules:
- Never share competitor information
- Always suggest scheduling a call for complex questions
```

### 4. Tools & Memory Tab
Capabilities and context retention.

| Field | Purpose |
|-------|---------|
| **Enable Memory** | Remember past interactions? |
| **Memory Retention Days** | How long to keep memories (7-90 days) |
| **Tools** | Internal capabilities (search_knowledge, send_email, create_task, etc.) |

**Runtime Effect:** 
- Memory is loaded from `agent_memory` table (filtered by retention period)
- Enabled tools are listed in system prompt as available capabilities

### 5. Integrations Tab
External service connections.

| Integration | Required Credentials | Use Case |
|-------------|---------------------|----------|
| **OpenAI** | API Key | LLM fallback |
| **Mistral** | API Key | LLM fallback |
| **Twilio** | Account SID, Auth Token | SMS/Voice |
| **Serp API** | API Key | Web search |
| **Google Maps** | API Key | Location services |
| **MCP Server** | Server URL, Auth Token | Custom tool server |
| **Custom Endpoint** | URL, Auth method | Any HTTP API |

---

## Integration Configuration Flow

### Who Configures What?

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN (Platform Owner)                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Option A: Platform-Provided Keys                        │ │
│ │ - Admin adds API keys in Admin Panel → API Keys section │ │
│ │ - Users don't need to configure anything                │ │
│ │ - Platform charges users based on usage                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WORKSPACE USER                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Option B: User-Provided Keys (BYOK)                     │ │
│ │ - User implements template                              │ │
│ │ - Sees "Required: Twilio, MCP" prompt                   │ │
│ │ - Enters their own API credentials                      │ │
│ │ - Credentials stored in agent.integration_configs       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### LLM Priority Order

The agent-runtime checks for LLM providers in this order:

1. **Lovable AI Gateway** (RECOMMENDED) - Pre-configured, no setup needed
2. **User-provided keys** - If user added OpenAI/Mistral in agent config
3. **Platform-provided keys** - Admin's keys from platform_api_configs

### For "Required Integrations: Twilio, MCP"

When a user sees this on a template:

1. **Twilio** - User needs:
   - Twilio Account SID
   - Twilio Auth Token
   - A Twilio phone number (for SMS)
   
2. **MCP (Model Context Protocol)** - User needs:
   - MCP Server URL (self-hosted or third-party)
   - Auth Token (if required by server)

**Where to configure:** When implementing a template, the user sees an "Integration Configuration" UI that prompts for these credentials.

---

## Database Schema

### ai_agents table
```sql
- id: UUID
- name: string
- type: 'voice' | 'conversation' | 'workflow'
- description: string
- greeting: string
- instructions: string
- voice: string (for voice agents)
- template_id: UUID (if created from template)
- workspace_id: UUID
- integration_configs: JSONB {
    openai: { api_key: '...' },
    twilio: { account_sid: '...', auth_token: '...' },
    // etc.
  }
- data_access: JSONB { scopes: [...], read_only: boolean, ... }
- behavior: JSONB { mode: '...', temperature: 0.7, ... }
- tools: JSONB [{ name: '...', enabled: true }, ...]
- use_memory: boolean
- memory_retention_days: number
```

### agent_memory table
```sql
- id: UUID
- agent_id: UUID
- workspace_id: UUID
- memory_type: string
- content: string
- importance_score: number
- context: JSONB
- created_at: timestamp
- expires_at: timestamp (optional)
```

### agent_usage table
```sql
- id: UUID
- agent_id: UUID
- workspace_id: UUID
- integration_type: string
- tokens_used: number
- cost_usd: number
- usage_count: number
```

---

## Future Expansion Opportunities

### 1. Real-Time Tool Execution
Currently tools use USE_TOOL: syntax. Could implement:
- Native function calling with OpenAI/Anthropic
- Streaming tool results
- Multi-step tool chains

### 2. Knowledge Base Integration
- Connect agents to knowledge_bases table
- RAG (Retrieval Augmented Generation)
- Document Q&A

### 3. Workflow Triggers
- Trigger workflows from agent responses
- Agent-driven automation

### 4. Voice Integration (ElevenLabs)
- Real-time voice conversations
- Voice cloning for brand consistency

### 5. Advanced Memory
- Semantic search over memories
- Memory importance decay
- Cross-agent memory sharing

### 6. Multi-Agent Orchestration
- Agent-to-agent communication
- Supervisor agents
- Specialist agents (one for scheduling, one for support, etc.)

### 7. Analytics Dashboard
- Usage patterns per agent
- Success/failure rates
- Cost optimization insights

---

## Troubleshooting

### "No LLM integration configured"
- Check if LOVABLE_API_KEY is set in Supabase secrets
- Or configure API keys in Admin → Platform API Keys
- Or user needs to add their own keys when implementing template

### Agent not using memory
- Verify `use_memory: true` in agent config
- Check workspace_id is passed in context
- Check memory_retention_days hasn't expired old memories

### Tool execution failed
- Verify integration credentials are correct
- Check tool-specific error logs
- Ensure user has configured required integrations

### Agent responses don't match config
- Verify agent record has enhanced fields (behavior, data_access, tools)
- Check agent-runtime logs for "Agent config" output
- Ensure template was published with all config tabs filled

---

## Quick Reference: Config → Runtime Mapping

| Config Field | Runtime Effect |
|--------------|----------------|
| `behavior.temperature` | LLM temperature parameter |
| `behavior.max_response_tokens` | LLM max_tokens parameter |
| `behavior.mode` | System prompt personality injection |
| `behavior.response_style` | System prompt style instruction |
| `behavior.custom_rules` | System prompt rule list |
| `data_access.scopes` | System prompt data access context |
| `data_access.read_only` | System prompt read/write restriction |
| `tools[].enabled` | System prompt capability list |
| `use_memory` | Load/save agent_memory records |
| `integration_configs.*` | Tool execution credentials |
