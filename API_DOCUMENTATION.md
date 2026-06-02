# CRM Platform API & Integration Documentation

## Quick Links

- **[Admin & Monitoring System](./API_DOCUMENTATION_ADMIN.md)** - Platform administration, audit logs, webhooks
- **[Enterprise Workflow Features](./API_DOCUMENTATION_ENTERPRISE.md)** - Monetization, growth, lifecycle, analytics
- **[Workflow System Architecture](./WORKFLOW_AUTOMATION_ARCHITECTURE.md)** - Core workflow concepts
- **[System Improvements](./WORKFLOW_SYSTEM_IMPROVEMENTS.md)** - 12 enterprise enhancements

## Platform Administration

### Admin Access & Control

As the platform owner, you maintain full control through the **Admin Dashboard** at `/admin`:

**Your Admin Capabilities:**
- **System Monitoring** - Real-time metrics across all workspaces
- **Audit Logs** - Track all user actions and data changes globally
- **Webhook Management** - Configure system-wide integrations
- **Platform Configuration** - Set rate limits, feature flags, system behavior

**Security Model:**
- Your account has `owner` or `admin` role in `user_roles` table
- Platform admins bypass workspace RLS restrictions
- Regular users limited to their workspace only
- All admin actions logged in audit trail

For complete admin documentation, see [API_DOCUMENTATION_ADMIN.md](./API_DOCUMENTATION_ADMIN.md).

---

## Table of Contents
1. [Database Schema](#database-schema)
2. [Authentication & Authorization](#authentication--authorization)
3. [Edge Functions (API Endpoints)](#edge-functions-api-endpoints)
4. [Real-time Subscriptions](#real-time-subscriptions)
5. [Integration Points](#integration-points)
6. [Data Models](#data-models)
7. [Webhooks](#webhooks)
8. [Security & Permissions](#security--permissions)

---

## Database Schema

### Core Tables

#### `profiles`
User profile information
```typescript
{
  id: uuid (PK, references auth.users)
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  business_name?: string
  website?: string
  avatar_url?: string
  timezone?: string (default: 'America/New_York')
  onboarding_completed: boolean (default: false)
  onboarding_step?: number (default: 1)
  onboarding_data?: jsonb (default: {})
  created_at: timestamp
  updated_at: timestamp
}
```

#### `leads`
Lead/opportunity management
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid (user owner)
  pipeline_id?: uuid (references pipelines)
  stage_id?: uuid (references pipeline_stages)
  name: string (required)
  email?: string
  phone?: string
  company?: string
  source?: string
  value?: numeric (default: 0)
  notes?: text
  created_at: timestamp
  updated_at: timestamp
}
```

#### `contacts`
Contact database
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid (user owner)
  name: string (required)
  email?: string
  phone?: string
  company?: string
  created_at: timestamp
  updated_at: timestamp
}
```

#### `pipelines`
Sales pipeline definitions
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid (user owner)
  name: string (required)
  description?: text
  is_default: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}
```

#### `pipeline_stages`
Stages within pipelines
```typescript
{
  id: uuid (PK)
  pipeline_id?: uuid (references pipelines)
  name: string (required)
  position: number (required)
  color?: string (default: '#6366f1')
  created_at: timestamp
}
```

#### `tasks`
Task management
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid (user owner)
  lead_id?: uuid (references leads)
  contact_id?: uuid (references contacts)
  assignee_id?: uuid (references profiles)
  title: string (required)
  description?: text
  status: string (default: 'pending') // 'pending' | 'in_progress' | 'completed'
  due_date?: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

#### `activities`
Activity timeline/history
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid (user owner)
  lead_id?: uuid (references leads)
  contact_id?: uuid (references contacts)
  created_by?: uuid (references auth.users)
  type: string (required) // 'note' | 'call' | 'email' | 'meeting' | 'status_change'
  title?: text
  description?: text
  created_at: timestamp
}
```

#### `ai_agents`
AI agent configurations
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid (user owner)
  name: string (required)
  type: string (required) // 'inbound' | 'outbound'
  status: string (default: 'draft') // 'draft' | 'active' | 'paused'
  phone_number?: string
  greeting?: text
  instructions?: text
  voice?: string (default: 'alloy')
  created_at: timestamp
  updated_at: timestamp
}
```

#### `knowledge_bases`
Knowledge base storage
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid (user owner)
  name: string (required)
  description?: text
  created_at: timestamp
  updated_at: timestamp
}
```

#### `knowledge_sources`
Knowledge base content sources
```typescript
{
  id: uuid (PK)
  knowledge_base_id?: uuid (references knowledge_bases)
  type: string (required) // 'url' | 'text' | 'file'
  title?: text
  content?: text
  url?: string
  metadata?: jsonb
  created_at: timestamp
  updated_at: timestamp
}
```

#### `user_roles`
User role assignments (RBAC)
```typescript
{
  id: uuid (PK)
  user_id: uuid (required, references auth.users)
  role: app_role (required, default: 'user') // enum: 'owner' | 'admin' | 'manager' | 'agent' | 'user'
  created_at: timestamp
}
UNIQUE CONSTRAINT: (user_id, role)
```

#### `permissions`
Role-based permissions matrix
```typescript
{
  id: uuid (PK)
  role: app_role (required)
  resource: string (required) // 'leads' | 'contacts' | 'agents' | 'pipelines' | 'settings' | etc.
  action: string (required) // 'create' | 'read' | 'update' | 'delete'
  granted: boolean (default: false)
  created_at: timestamp
}
```

#### `google_sheet_integrations`
Google Sheets sync configuration
```typescript
{
  id: uuid (PK)
  user_id?: uuid (references auth.users)
  sheet_id?: string
  sheet_tab?: string (default: 'Sheet1')
  google_access_token?: text
  google_refresh_token?: text
  token_expires_at?: timestamp
  column_mappings?: jsonb (default: {})
  sync_frequency?: string (default: 'manual') // 'manual' | 'hourly' | 'daily'
  is_active: boolean (default: true)
  last_synced_at?: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

#### `business_settings`
Business profile settings
```typescript
{
  id: uuid (PK)
  business_name?: string
  legal_business_name?: string
  business_email?: string
  business_phone?: string
  website?: string
  business_category?: string
  logo_url?: string
  street_address?: string
  city?: string
  state_province?: string
  postal_code?: string
  country?: string
  timezone?: string
  created_at: timestamp
  updated_at: timestamp
}
```

#### `opportunity_settings`
Opportunity/lead behavior settings
```typescript
{
  id: uuid (PK)
  allow_different_contact_opportunity_names: boolean (default: false)
  auto_create_contact_follower: boolean (default: false)
  auto_create_opportunity_follower: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}
```

#### `agent_settings`
AI agent feature settings
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid
  agent_features_enabled: boolean (default: true)
  agent_tier?: string (default: 'basic') // 'basic' | 'premium'
  ai_provider?: string (default: 'mistral') // 'mistral' | 'gemini'
  created_at: timestamp
  updated_at: timestamp
}
```

#### `deleted_leads`
Soft-deleted leads (45-day retention)
```typescript
{
  id: uuid (PK)
  original_lead_id: uuid (required)
  name: string (required)
  email?: string
  phone?: string
  company?: string
  source?: string
  value?: numeric (default: 0)
  stage_id?: uuid
  notes?: text
  created_at: timestamp (original creation)
  deleted_at: timestamp (deletion timestamp)
  deleted_by?: uuid
  expires_at: timestamp (45 days from deleted_at)
}
```

#### `workflows`
Workflow automation definitions
```typescript
{
  id: uuid (PK)
  workspace_id?: uuid (user owner)
  name: string (required)
  description?: text
  trigger_type: string (required) // 'lead_created' | 'form_submitted' | 'contact_created' | 'task_created' | 'time_schedule' | 'manual'
  nodes: jsonb (required) // Visual flow definition (triggers, conditions, actions)
  edges: jsonb (required) // Connections between nodes
  is_active: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}
```

#### `workflow_runs`
Workflow execution history and logs
```typescript
{
  id: uuid (PK)
  workflow_id?: uuid (references workflows)
  status: string (default: 'running') // 'running' | 'completed' | 'failed'
  trigger_data: jsonb // The scope/context that started this run
  execution_log: jsonb // Step-by-step execution details
  error_message?: text
  started_at: timestamp
  completed_at?: timestamp
}
```

#### `forms`
Form builder definitions
```typescript
{
  id: uuid (PK)
  workspace_id: uuid (required)
  name: string (required)
  description?: text
  fields: jsonb (default: []) // Form field definitions
  is_active: boolean (default: true)
  pipeline_id?: uuid (references pipelines)
  stage_id?: uuid (references pipeline_stages)
  created_at: timestamp
  updated_at: timestamp
}
```

#### `form_submissions`
Form submission data
```typescript
{
  id: uuid (PK)
  form_id: uuid (required, references forms)
  lead_id?: uuid (references leads) // Created lead from submission
  data: jsonb (required) // Submitted form data
  created_at: timestamp
}
```

#### `form_metrics`
Form analytics and tracking
```typescript
{
  id: uuid (PK)
  form_id: uuid (required, references forms)
  submitted_at: timestamp (default: now())
  converted: boolean (default: false)
  ip_address?: string
  user_agent?: string
  referrer?: string
}
```

---

## Authentication & Authorization

### Authentication Flow
1. **Sign Up**: Email + password (auto-confirm enabled)
2. **Sign In**: Email + password
3. **Session Management**: Automatic token refresh via Supabase client
4. **Profile Creation**: Automatic via `handle_new_user()` trigger

### Role-Based Access Control (RBAC)

#### Available Roles (Enum: `app_role`)
- `owner` - Full system access
- `admin` - Administrative privileges
- `manager` - Team management
- `agent` - Standard agent access
- `user` - Basic user access

#### Permission Model
Permissions are stored in the `permissions` table with granular control:
```typescript
{
  role: 'admin',
  resource: 'leads',
  action: 'delete',
  granted: true
}
```

#### Security Functions
```sql
-- Check if user has specific role
has_role(user_id uuid, role app_role) → boolean

-- Check if user is admin or owner
is_admin_or_owner(user_id uuid) → boolean
```

### Row-Level Security (RLS)
All tables have RLS enabled with workspace isolation:
- Users can only access data where `workspace_id = auth.uid()`
- Admins/Owners can manage settings and permissions
- Public access only for business settings (read-only)

---

## Edge Functions (API Endpoints)

Base URL: `https://dpbbylcycltexyknejcb.supabase.co/functions/v1/`

### Google Sheets Integration

#### `POST /google-sheets-oauth`
Initialize Google OAuth flow
```typescript
Request: {
  userId?: string
  type?: string
}
Response: {
  authUrl: string
  redirectUri: string
}
```

#### `GET /google-sheets-callback`
OAuth callback handler (automatic redirect)

#### `POST /google-sheets-list`
List available spreadsheets
```typescript
Request: {
  integrationId: string
}
Response: {
  files: Array<{
    id: string
    name: string
    webViewLink: string
  }>
}
```

#### `POST /google-sheets-tabs`
Get tabs/sheets from a spreadsheet
```typescript
Request: {
  integrationId: string
  sheetId: string
}
Response: {
  tabs: Array<{
    id: number
    title: string
  }>
}
```

#### `POST /google-sheets-headers`
Get column headers from a sheet
```typescript
Request: {
  integrationId: string
  sheetId: string
  sheetTab?: string
}
Response: {
  headers: string[]
}
```

#### `POST /google-sheets-sync`
Sync leads from Google Sheets
```typescript
Request: {
  integrationId: string
}
Response: {
  success: boolean
  leadsProcessed?: number
  message?: string
}
```

#### `POST /sync-to-sheets`
Sync leads back to Google Sheets
```typescript
Request: {
  integrationId: string
}
Response: {
  success: boolean
  message: string
}
```

#### `POST /register-drive-watch`
Register Google Drive push notifications
```typescript
Request: {
  integrationId: string
}
Response: {
  channelId: string
  resourceId: string
  expiration: string
}
```

#### `POST /google-drive-push`
Webhook endpoint for Google Drive notifications (internal)

### Duplicate Detection

#### `POST /duplicate-detection`
Detect duplicate leads
```typescript
Request: {
  lead: {
    email?: string
    phone?: string
    name: string
  }
}
Response: {
  isDuplicate: boolean
  duplicates?: Array<{
    id: string
    name: string
    email?: string
    phone?: string
    similarity: number
  }>
}
```

#### `POST /cleanup-duplicates`
Merge or remove duplicate leads
```typescript
Request: {
  duplicateIds: string[]
  keepId: string
  action: 'merge' | 'delete'
}
Response: {
  success: boolean
  message: string
}
```

### AI Agent

#### `POST /mistral-agent`
AI agent endpoint (Mistral-powered)
```typescript
Request: {
  message: string
  context?: {
    leadId?: string
    contactId?: string
    agentId?: string
  }
}
Response: {
  response: string
  suggestions?: string[]
}
```

### Workflow Automation

#### `POST /workflow-trigger`
Trigger workflows based on events
```typescript
Request: {
  trigger_type: string // 'lead_created' | 'form_submitted' | 'contact_created' | 'task_created' | 'time_schedule' | 'manual'
  trigger_data: {
    workspace_id: string
    lead?: Lead
    contact?: Contact
    form?: Form
    task?: Task
    user?: User
    timestamp: string
    [key: string]: any // Additional context data
  }
}
Response: {
  success: boolean
  message: string
  executedWorkflows?: number
}
```

#### `POST /workflow-executor`
Execute a specific workflow (manual execution or testing)
```typescript
Request: {
  workflowId: string
  triggerData: {
    workspace_id: string
    test?: boolean
    [key: string]: any // Scope data for execution
  }
}
Response: {
  success: boolean
  runId: string
  status: 'running' | 'completed' | 'failed'
  executionLog?: Array<{
    timestamp: string
    nodeId: string
    nodeType: string
    status: string
    details?: any
  }>
  error?: string
}
```

#### `POST /workflow-ai-assistant`
AI-powered workflow assistance
```typescript
Request: {
  message: string
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  currentWorkflow?: {
    id: string
    name: string
    nodes: any[]
    edges: any[]
    is_active: boolean
  }
  contextualHelp?: {
    nodeType: string
    nodeLabel: string
    nodeId: string
  }
  validateMode?: boolean
}
Response: {
  response: string
  workflowSuggestion?: {
    name: string
    description: string
    trigger_type: string
    nodes: any[]
    edges: any[]
  }
}
```

#### Workflow AI Capabilities
The AI assistant understands:
- All available triggers, conditions, and actions
- CRM structure and data models
- Integration requirements
- Best practices for workflow design
- Can generate complete workflows from natural language
- Can validate existing workflows
- Can provide contextual help on specific nodes

---

## Real-time Subscriptions

### Available Channels

#### Leads Channel
```typescript
const channel = supabase
  .channel('leads')
  .on('postgres_changes', {
    event: '*', // INSERT | UPDATE | DELETE
    schema: 'public',
    table: 'leads',
    filter: `workspace_id=eq.${userId}`
  }, (payload) => {
    // Handle real-time updates
  })
  .subscribe();
```

#### Tasks Channel
```typescript
const channel = supabase
  .channel('tasks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `workspace_id=eq.${userId}`
  }, (payload) => {
    // Handle real-time updates
  })
  .subscribe();
```

#### Activities Channel
```typescript
const channel = supabase
  .channel('activities')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activities',
    filter: `workspace_id=eq.${userId}`
  }, (payload) => {
    // Handle new activities
  })
  .subscribe();
```

---

## Integration Points

### Google Sheets Integration

#### Setup Flow
1. Call `/google-sheets-oauth` → Get auth URL
2. User authorizes → Redirect to `/google-sheets-callback`
3. Tokens stored in `google_sheet_integrations`
4. Call `/google-sheets-list` → Select spreadsheet
5. Call `/google-sheets-tabs` → Select sheet/tab
6. Call `/google-sheets-headers` → Map columns
7. Save mapping to `column_mappings` in integration
8. Call `/register-drive-watch` → Enable auto-sync

#### Column Mapping Schema
```typescript
{
  name: "Name", // Google Sheet column → leads.name
  email: "Email", // Google Sheet column → leads.email
  phone: "Phone Number", // Google Sheet column → leads.phone
  company: "Company", // Google Sheet column → leads.company
  value: "Deal Value", // Google Sheet column → leads.value
  source: "Source", // Google Sheet column → leads.source
  status: "Status" // Google Sheet column → determines stage_id
}
```

#### Status to Stage Mapping
The system automatically maps status values to pipeline stages by:
1. Finding the default pipeline for the workspace
2. Matching status text to stage names (case-insensitive, normalized)
3. Falling back to first stage if no match found

Common mappings:
- "New" / "Lead" → First stage
- "Contacted" / "Qualified" → Middle stages
- "Won" / "Closed" → Last stage

### Webhook Endpoints

#### Google Drive Push Notifications
- **URL**: `https://dpbbylcycltexyknejcb.supabase.co/functions/v1/google-drive-push`
- **Method**: POST
- **Headers**: 
  - `X-Goog-Channel-ID`: Channel identifier
  - `X-Goog-Resource-State`: update | sync
  - `X-Goog-Resource-ID`: Resource identifier
- **Trigger**: Automatic sync when Google Sheet changes

---

## Data Models

### TypeScript Interfaces

#### Lead
```typescript
interface Lead {
  id: string;
  workspace_id?: string;
  pipeline_id?: string;
  stage_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  value?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

#### Pipeline
```typescript
interface Pipeline {
  id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Stage
```typescript
interface Stage {
  id: string;
  pipeline_id?: string;
  name: string;
  position: number;
  color?: string;
  created_at: string;
}
```

#### Task
```typescript
interface Task {
  id: string;
  workspace_id?: string;
  lead_id?: string;
  contact_id?: string;
  assignee_id?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  created_at: string;
  updated_at: string;
}
```

#### Workflow
```typescript
interface Workflow {
  id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  trigger_type: 'lead_created' | 'form_submitted' | 'contact_created' | 'task_created' | 'time_schedule' | 'manual';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  position: { x: number; y: number };
  data: {
    label: string;
    config?: {
      condition_type?: string;
      action_type?: string;
      field?: string;
      value?: any;
      operator?: string;
      [key: string]: any;
    };
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}
```

#### WorkflowRun
```typescript
interface WorkflowRun {
  id: string;
  workflow_id?: string;
  status: 'running' | 'completed' | 'failed';
  trigger_data: {
    workspace_id: string;
    lead?: Lead;
    contact?: Contact;
    form?: Form;
    task?: Task;
    user?: User;
    timestamp: string;
    [key: string]: any;
  };
  execution_log: Array<{
    timestamp: string;
    nodeId: string;
    nodeType: 'trigger' | 'condition' | 'action';
    status: 'success' | 'failed' | 'skipped';
    details?: any;
    error?: string;
  }>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}
```

#### Form
```typescript
interface Form {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  fields: FormField[];
  is_active: boolean;
  pipeline_id?: string;
  stage_id?: string;
  created_at: string;
  updated_at: string;
}

interface FormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, checkbox, radio
}
```

---

## Security & Permissions

### Environment Variables
```env
VITE_SUPABASE_URL=https://dpbbylcycltexyknejcb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=dpbbylcycltexyknejcb
```

### Edge Function Secrets
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `MISTRAL_API_KEY` - Mistral AI API key
- `LOVABLE_API_KEY` - Lovable AI Gateway key (auto-provisioned)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)
- `OPENAI_API_KEY` - OpenAI API key (optional, for specific integrations)
- `TWILIO_ACCOUNT_SID` - Twilio account SID (for SMS/calls)
- `TWILIO_AUTH_TOKEN` - Twilio auth token (for SMS/calls)

### CORS Configuration
All edge functions support CORS with:
```javascript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
```

### Best Practices

#### Data Access
- Always filter by `workspace_id = auth.uid()` for user isolation
- Use RLS policies for automatic security enforcement
- Never expose service role key to frontend

#### Performance
- Use position-based logic instead of hardcoded stage names
- Leverage real-time subscriptions for live updates
- Implement proper indexing on frequently queried columns

#### Future-Proofing
- Stage determination by position (first/last) not by name
- Pipeline-relative queries instead of hardcoded pipeline IDs
- Flexible column mapping for external integrations
- Dynamic role/permission evaluation

---

## Query Examples

### Get User's Leads with Pipeline Info
```typescript
const { data } = await supabase
  .from('leads')
  .select(`
    *,
    pipeline:pipelines(id, name),
    stage:pipeline_stages(id, name, position, color)
  `)
  .eq('workspace_id', userId)
  .order('created_at', { ascending: false });
```

### Get Conversion Metrics
```typescript
const { data: stages } = await supabase
  .from('pipeline_stages')
  .select('id, name, position, pipeline_id')
  .order('position');

// Last stage in each pipeline = "won" stage
const wonStages = Object.values(
  stages.reduce((acc, stage) => {
    if (!acc[stage.pipeline_id] || stage.position > acc[stage.pipeline_id].position) {
      acc[stage.pipeline_id] = stage;
    }
    return acc;
  }, {})
);
```

### Real-time Lead Updates
```typescript
supabase
  .channel('leads-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'leads',
    filter: `workspace_id=eq.${userId}`
  }, (payload) => {
    // Update UI optimistically
    setLeads(leads => leads.map(lead => 
      lead.id === payload.new.id ? payload.new : lead
    ));
  })
  .subscribe();
```

---

## Rate Limits & Quotas

- **Database**: 500 requests/second per workspace
- **Edge Functions**: 100 requests/minute per function
- **Google Sheets Sync**: 1 sync/minute per integration
- **Real-time Connections**: 200 concurrent connections per workspace

---

## Error Handling

### Standard Error Response
```typescript
{
  error: string, // Error message
  code?: string, // Error code
  details?: any  // Additional context
}
```

### Common Error Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate record)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## Migration & Versioning

### Database Functions
```sql
-- Auto-update timestamps
update_updated_at_column() - Trigger function for updated_at columns

-- User onboarding
handle_new_user() - Creates profile on auth.users insert

-- Soft delete cleanup
cleanup_expired_deleted_leads() - Removes leads after 45 days
```

### Future-Proof Patterns

#### ✅ DO: Position-Based Logic
```typescript
// Determine won stage by last position
const wonStages = stages.filter(s => 
  s.position === Math.max(...stages.filter(st => st.pipeline_id === s.pipeline_id).map(st => st.position))
);
```

#### ❌ DON'T: Hardcoded Stage Names
```typescript
// Brittle - breaks if stage renamed
const wonLeads = leads.filter(l => l.stage_id === 'won-stage-id');
```

#### ✅ DO: Dynamic Role Checking
```typescript
const { data: hasRole } = await supabase.rpc('has_role', { 
  _user_id: userId, 
  _role: 'admin' 
});
```

#### ❌ DON'T: Client-Side Role Storage
```typescript
// Insecure - can be manipulated
const isAdmin = localStorage.getItem('role') === 'admin';
```

---

## Support & Resources

- **Documentation**: This file
- **Supabase Dashboard**: Managed through Lovable Cloud
- **Edge Function Logs**: Available in Lovable Cloud console
- **Database Migrations**: Automated through Lovable

---

## Workflow System Architecture

### Trigger Types
Available workflow triggers:
- `lead_created` - Fires when a new lead is added
- `form_submitted` - Fires when a form is submitted
- `contact_created` - Fires when a new contact is added
- `task_created` - Fires when a new task is created
- `time_schedule` - Fires on a schedule (hourly, daily, weekly)
- `manual` - Manually triggered by user

### Condition Types
Available workflow conditions:
- `Lead Value Greater Than` - Check if lead value exceeds amount
- `Lead Stage Equals` - Check current pipeline stage
- `Form Field Contains` - Check form submission values
- `Form Field Equals` - Exact form field matching
- `Has Email` - Verify contact has email
- `Has Phone` - Verify contact has phone
- `Time of Day` - Time-based conditions

### Action Types
Available workflow actions:
- `Send Email` - Send automated emails (requires email configuration)
- `Send SMS` - Send text messages (requires Twilio)
- `Update Lead` - Modify lead information
- `Create Task` - Create follow-up tasks automatically
- `Add to Google Sheets` - Sync data to Google Sheets
- `Create Lead` - Generate new leads from data
- `Create Contact` - Create new contacts
- `Assign to Pipeline` - Move leads through pipeline stages
- `Send Notification` - Send in-app notifications

### Workflow Scope/Context
Every workflow execution receives a scope object containing:
```typescript
{
  workspace_id: string,
  lead?: {
    id: string,
    name: string,
    email?: string,
    phone?: string,
    value?: number,
    stage?: string,
    company?: string,
    source?: string
  },
  contact?: {
    id: string,
    name: string,
    email?: string,
    phone?: string,
    company?: string
  },
  form?: {
    id: string,
    name: string,
    fields: any[],
    submission_data: Record<string, any>
  },
  task?: {
    id: string,
    title: string,
    assignee_id?: string,
    due_date?: string,
    status: string
  },
  user?: {
    id: string,
    name: string,
    email: string,
    role: string
  },
  timestamp: string
}
```

### Template Interpolation
Workflow actions support variable substitution using `{{scope.path}}` syntax:
```typescript
// Example: Email body
"Hi {{lead.name}}, your quote for {{lead.company}} is ready!"

// With scope:
{ lead: { name: "John", company: "Acme Corp" } }

// Results in:
"Hi John, your quote for Acme Corp is ready!"
```

### Integration Points
To trigger workflows from your application:
```typescript
await supabase.functions.invoke('workflow-trigger', {
  body: {
    trigger_type: 'lead_created',
    trigger_data: {
      workspace_id: userId,
      lead: leadObject,
      user: currentUser,
      timestamp: new Date().toISOString()
    }
  }
});
```

### AI Assistant Features
The workflow AI assistant (`workflow-ai-assistant` edge function) provides:
1. **General Help** - Explains triggers, conditions, actions
2. **Contextual Help** - Double-click any node for specific guidance
3. **Workflow Generation** - Create complete workflows from natural language
4. **Workflow Validation** - Analyze and suggest improvements
5. **Best Practices** - Recommendations for workflow design

The AI knows:
- All available triggers, conditions, and actions
- Your CRM structure and data models
- Integration requirements
- Best practices for automation

### Workflow Execution Flow
1. Event occurs (lead created, form submitted, etc.)
2. `workflow-trigger` receives event with scope data
3. Finds all active workflows matching trigger type
4. For each workflow:
   - Creates `workflow_run` record
   - Starts at trigger node
   - Follows edges to next nodes
   - Evaluates conditions (boolean logic)
   - Executes actions (with scope interpolation)
   - Logs each step
   - Updates run status (completed/failed)

### Extensibility
To add new capabilities:

**New Trigger**:
1. Define trigger type (e.g., `deal_won`)
2. Update AI system context
3. Call `workflow-trigger` from your code

**New Condition**:
1. Implement evaluation logic
2. Update AI system context
3. Add UI configuration

**New Action**:
1. Implement action execution
2. Update AI system context
3. Add UI configuration

See `WORKFLOW_AUTOMATION_ARCHITECTURE.md` for complete implementation guide.

---

**Document Version**: 2.0  
**Last Updated**: 2025-01-15  
**Compatibility**: Lovable Cloud + Supabase

**Related Documentation**:
- `WORKFLOW_AUTOMATION_ARCHITECTURE.md` - Complete workflow system guide
- Supabase Dashboard - Database and edge function management
- Lovable Cloud Console - Edge function logs and monitoring
