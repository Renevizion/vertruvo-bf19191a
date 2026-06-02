# Workflow Automation Architecture Guide

## Overview: What We Built

This document explains the complete workflow automation system we built into an existing CRM application. This system allows users to create visual, no-code automation workflows that respond to events (triggers), make decisions (conditions), and execute actions automatically.

**The Power**: This architecture can be built standalone OR integrated into any existing application. It's a complete automation engine that speaks a unified language across your entire system.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [The Unified Language](#the-unified-language)
3. [Architecture Components](#architecture-components)
4. [Data Model & Schema](#data-model--schema)
5. [The Workflow Engine](#the-workflow-engine)
6. [AI Assistant Integration](#ai-assistant-integration)
7. [Integration Points](#integration-points)
8. [Future-Proofing & Extensibility](#future-proofing--extensibility)
9. [Building This into Any App](#building-this-into-any-app)

---

## Core Concepts

### What is a Workflow?

A workflow is a visual automation recipe with three core elements:

1. **Trigger** - The event that starts the workflow (Lead Created, Form Submitted, Time Schedule, etc.)
2. **Conditions** - Decision points that route the flow based on data (Lead Value > $1000, Has Email, etc.)
3. **Actions** - Things the system does automatically (Send Email, Create Task, Update Lead, etc.)

### The Mental Model

Think of it like a flowchart that executes itself:
```
[TRIGGER: New Lead] 
    ↓
[CONDITION: Value > $1000?]
    ↓ YES                    ↓ NO
[Send to Sales]         [Send to Nurture]
```

---

## The Unified Language

### The Scope System

The entire workflow system operates on a **scope-based data model**. Every trigger, condition, and action speaks the same language using scopes:

```typescript
{
  lead: { id, name, email, phone, value, stage, source, ... },
  contact: { id, name, email, phone, company, ... },
  form: { id, name, fields, submission_data, ... },
  task: { id, title, assignee, due_date, status, ... },
  user: { id, name, email, role, ... },
  timestamp: "2025-01-15T10:30:00Z"
}
```

**Why This Matters**: Every part of your system that interacts with workflows must provide and consume data in this format. This creates a universal contract.

### The Three Pillars of the Unified Language

#### 1. Trigger Contract
Every trigger MUST provide:
```typescript
{
  trigger_type: string,        // What happened
  trigger_data: object,         // The complete scope/context
  workspace_id: string,         // Who owns this
  timestamp: string            // When it happened
}
```

#### 2. Condition Evaluation
Every condition MUST:
- Accept a scope object
- Return a boolean (true/false)
- Be stateless (same input = same output)

#### 3. Action Execution
Every action MUST:
- Accept a scope object
- Perform one clear operation
- Return success/failure status
- Log what it did

---

## Architecture Components

### Frontend Components

```
src/components/automations/
├── WorkflowCanvas.tsx           # Visual flow editor (React Flow)
├── WorkflowList.tsx             # Workflow management UI
├── WorkflowTemplates.tsx        # Pre-built workflow library
├── WorkflowRunHistory.tsx       # Execution logs & debugging
├── WorkflowAIAssistant.tsx      # AI helper (contextual help & generation)
├── ImprovedNodeConfigDialog.tsx # Node configuration (smart forms)
├── NodeToolbar.tsx              # Canvas node actions
└── nodes/
    ├── TriggerNode.tsx          # Visual trigger representation
    ├── ConditionNode.tsx        # Visual condition representation
    └── ActionNode.tsx           # Visual action representation
```

### Backend (Edge Functions)

```
supabase/functions/
├── workflow-trigger/            # Receives events, starts workflows
├── workflow-executor/           # The execution engine
└── workflow-ai-assistant/       # AI-powered workflow help
```

### Database Tables

```sql
workflows
├── id (uuid)
├── name (text)
├── description (text)
├── trigger_type (text)         -- 'lead_created', 'form_submitted', etc.
├── nodes (jsonb)               -- Visual flow definition
├── edges (jsonb)               -- Connections between nodes
├── is_active (boolean)         -- Enabled/disabled
├── workspace_id (uuid)
├── created_at, updated_at

workflow_runs
├── id (uuid)
├── workflow_id (uuid)
├── status (text)               -- 'running', 'completed', 'failed'
├── trigger_data (jsonb)        -- The scope that started this run
├── execution_log (jsonb)       -- Step-by-step what happened
├── error_message (text)
├── started_at, completed_at
```

---

## The Workflow Engine

### How Execution Works

Located in `supabase/functions/workflow-executor/index.ts`:

```typescript
// Simplified execution flow:

1. Receive trigger event with scope data
2. Find all ACTIVE workflows matching trigger_type
3. For each workflow:
   a. Create workflow_run record (status: 'running')
   b. Start at trigger node
   c. Follow edges to next node
   d. Evaluate conditions (pass scope)
   e. Execute actions (pass scope)
   f. Log each step
   g. Update workflow_run (status: 'completed' or 'failed')
```

### Node Execution Logic

**Trigger Nodes**:
- Entry point only
- Provides the initial scope
- No actual execution

**Condition Nodes**:
```typescript
function evaluateCondition(conditionConfig, scope) {
  const { condition_type, field, value, operator } = conditionConfig;
  
  // Extract value from scope using field path
  const actualValue = scope[field]; // e.g., scope.lead.value
  
  // Compare based on condition_type
  switch(condition_type) {
    case 'Lead Value Greater Than':
      return actualValue > value;
    case 'Lead Stage Equals':
      return actualValue === value;
    case 'Has Email':
      return !!scope.lead?.email;
    // ... more conditions
  }
}
```

**Action Nodes**:
```typescript
async function executeAction(actionConfig, scope) {
  const { action_type, config } = actionConfig;
  
  switch(action_type) {
    case 'Send Email':
      // Template interpolation: "Hi {{lead.name}}" becomes "Hi John"
      const body = interpolate(config.body, scope);
      await sendEmail(config.to, config.subject, body);
      break;
      
    case 'Create Task':
      await supabase.from('tasks').insert({
        title: interpolate(config.title, scope),
        lead_id: scope.lead?.id,
        assignee_id: config.assigned_to,
        due_date: config.due_date
      });
      break;
      
    case 'Update Lead':
      await supabase.from('leads')
        .update(config.updates)
        .eq('id', scope.lead.id);
      break;
    // ... more actions
  }
}
```

### Template Interpolation

The system supports variable substitution using `{{scope.path}}` syntax:

```typescript
// Input template

"Hi {{lead.name}}, your quote for {{lead.company}} is ready!"

// Scope
{ lead: { name: "John", company: "Acme Corp" } }

// Output
"Hi John, your quote for Acme Corp is ready!"
```

**Implementation**:
```typescript
function interpolate(template: string, scope: object): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getValueByPath(scope, path.trim());
    return value ?? match;
  });
}

function getValueByPath(obj: object, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}
```

---

## AI Assistant Integration

### The Workflow AI Assistant

Located in `src/components/automations/WorkflowAIAssistant.tsx` and `supabase/functions/workflow-ai-assistant/index.ts`.

#### Three Modes of Operation

**1. General Workflow Help**
```typescript
// User asks: "How do I automate follow-ups for high-value leads?"
// AI responds with explanation + generates workflow JSON
```

**2. Contextual Help (Double-Click on Node)**
```typescript
// User double-clicks "Send Email" action node
// AI receives: { nodeType: 'action', nodeLabel: 'Send Email', nodeId: '...' }
// AI explains: what it does, how to configure, best practices
```

**3. Workflow Validation**
```typescript
// User clicks "Validate" button
// AI receives: current workflow structure
// AI analyzes: missing configs, logic errors, best practices
// Returns: actionable feedback
```

### How the AI Understands Your App

The AI assistant is given a **system context** that describes:
- All available triggers
- All available conditions
- All available actions
- Your CRM structure (leads, contacts, forms, tasks, etc.)
- Integration requirements
- Best practices

**Example System Context** (from edge function):
```typescript
const SYSTEM_CONTEXT = `
You are a workflow automation assistant for a CRM system.

TRIGGERS:
- Lead Created: Fires when new lead added
- Form Submitted: Fires when form submitted
- Time Schedule: Fires on schedule

ACTIONS:
- Send Email: Send automated emails
- Create Task: Create follow-up tasks
- Update Lead: Modify lead information

CONDITIONS:
- Lead Value Greater Than: Check if lead value exceeds amount
- Has Email: Verify contact has email
...
`;
```

### Workflow Generation Format

When the AI suggests a workflow, it returns structured JSON:

```typescript
{
  name: "Follow-up Automation",
  description: "Sends follow-up emails to high-value leads",
  trigger_type: "lead_created",
  nodes: [
    {
      id: "trigger-1",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: { label: "New Lead Created" }
    },
    {
      id: "condition-1",
      type: "condition",
      position: { x: 100, y: 250 },
      data: {
        label: "Value > $1000",
        config: {
          condition_type: "Lead Value Greater Than",
          field: "lead.value",
          value: 1000
        }
      }
    },
    {
      id: "action-1",
      type: "action",
      position: { x: 100, y: 400 },
      data: {
        label: "Send Welcome Email",
        config: {
          action_type: "Send Email",
          to: "{{lead.email}}",
          subject: "Welcome to {{business.name}}!",
          body: "Hi {{lead.name}}..."
        }
      }
    }
  ],
  edges: [
    { id: "e1", source: "trigger-1", target: "condition-1" },
    { id: "e2", source: "condition-1", target: "action-1" }
  ]
}
```

The frontend receives this and can directly apply it to the canvas with the "Apply to Canvas" button.

---

## Integration Points

### How to Trigger Workflows from Your App

Anytime an event happens in your CRM, call the workflow trigger:

```typescript
// Example: When a new lead is created
async function createLead(leadData) {
  // 1. Create the lead in database
  const { data: lead, error } = await supabase
    .from('leads')
    .insert(leadData)
    .select()
    .single();
  
  if (error) throw error;
  
  // 2. Trigger workflows
  await supabase.functions.invoke('workflow-trigger', {
    body: {
      trigger_type: 'lead_created',
      trigger_data: {
        lead: lead,              // The complete lead object
        user: currentUser,       // Who created it
        timestamp: new Date().toISOString()
      }
    }
  });
  
  return lead;
}
```

### Adding New Triggers

To add a new trigger type to the system:

1. **Define the trigger type** (convention: `noun_verb` format):
```typescript
// Example: 'deal_won', 'payment_received', 'call_completed'
```

2. **Update the AI system context** in `workflow-ai-assistant/index.ts`:
```typescript
TRIGGERS:
- Deal Won: Fires when a deal closes successfully
  Scope: { deal: {...}, lead: {...}, user: {...} }
```

3. **Add trigger option** to UI (WorkflowCanvas.tsx):
```typescript
const TRIGGER_TYPES = [
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'deal_won', label: 'Deal Won' }, // NEW
  // ...
];
```

4. **Call the trigger** from your app code:
```typescript
await supabase.functions.invoke('workflow-trigger', {
  body: {
    trigger_type: 'deal_won',
    trigger_data: {
      deal: dealObject,
      lead: leadObject,
      user: currentUser,
      amount: dealObject.value,
      timestamp: new Date().toISOString()
    }
  }
});
```

### Adding New Conditions

To add a new condition:

1. **Define the condition logic** in `workflow-executor/index.ts`:
```typescript
function evaluateCondition(config, scope) {
  switch(config.condition_type) {
    case 'Deal Amount Greater Than':
      return scope.deal?.amount > config.value;
    // ... existing conditions
  }
}
```

2. **Add to AI context**:
```typescript
CONDITIONS:
- Deal Amount Greater Than: Check if deal value exceeds amount
```

3. **Add UI configuration** in `ImprovedNodeConfigDialog.tsx`:
```typescript
{
  value: 'Deal Amount Greater Than',
  label: 'Deal Amount Greater Than',
  fields: [
    { name: 'value', label: 'Amount ($)', type: 'number' }
  ]
}
```

### Adding New Actions

To add a new action:

1. **Implement the action** in `workflow-executor/index.ts`:
```typescript
async function executeAction(config, scope) {
  switch(config.action_type) {
    case 'Create Deal':
      await supabase.from('deals').insert({
        title: interpolate(config.title, scope),
        lead_id: scope.lead?.id,
        amount: config.amount,
        stage: 'proposal'
      });
      break;
    // ... existing actions
  }
}
```

2. **Add to AI context**:
```typescript
ACTIONS:
- Create Deal: Generate new deal from lead
  Config: { title, amount, stage }
```

3. **Add UI configuration**:
```typescript
{
  value: 'Create Deal',
  label: 'Create Deal',
  fields: [
    { name: 'title', label: 'Deal Title', type: 'text' },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'stage', label: 'Initial Stage', type: 'select', options: [...] }
  ]
}
```

---

## Future-Proofing & Extensibility

### Design Principles

1. **Scope-First**: Always think in terms of what data (scope) flows through the workflow
2. **Stateless Operations**: Conditions and actions should be pure functions
3. **Explicit Over Implicit**: Better to have more specific triggers than one generic trigger
4. **Fail Gracefully**: Log errors, don't crash the entire workflow

### Key Patterns to Maintain

#### Pattern 1: Scope Expansion
As your app grows, expand the scope object:
```typescript
// Before
{ lead: {...} }

// After (adding deals)
{ lead: {...}, deal: {...}, opportunity: {...} }
```

#### Pattern 2: Conditional Branching
Use condition nodes to create multiple paths:
```
[Trigger]
    ↓
[Condition: Type?]
    ↓ A              ↓ B              ↓ C
[Action A]      [Action B]      [Action C]
```

#### Pattern 3: Template-Driven Configuration
Always use templates with interpolation for user-facing text:
```typescript
// Good
{ subject: "Hi {{lead.name}}" }

// Bad (hardcoded)
{ subject: "Hi there" }
```

### Important Considerations for Future Updates

#### 1. Backwards Compatibility
When adding new features:
- Don't change existing trigger types
- Don't rename scope fields
- Add new fields, don't replace

```typescript
// Good: Adding new field
scope.lead.created_by_name = "John"; // NEW

// Bad: Renaming field
// scope.lead.creator = "John"; // Don't rename 'created_by'
```

#### 2. Workflow Versioning
Consider adding version field to workflows:
```sql
ALTER TABLE workflows ADD COLUMN version INTEGER DEFAULT 1;
```

When you make breaking changes to execution logic, increment version and handle old versions.

#### 3. Error Handling & Observability
Always log what's happening:
```typescript
const executionLog = [];

executionLog.push({
  timestamp: new Date(),
  nodeId: 'action-1',
  action: 'Send Email',
  status: 'success',
  details: { to: 'user@example.com', subject: '...' }
});

await supabase.from('workflow_runs').update({
  execution_log: executionLog
}).eq('id', runId);
```

#### 4. Performance at Scale
As workflows grow:
- Index `workflows.trigger_type` for fast lookup
- Index `workflow_runs.workflow_id` for history queries
- Consider queuing for high-volume triggers
- Add rate limiting per workspace

#### 5. Security Considerations
- Always validate scope data before execution
- Sanitize user input in templates (XSS prevention)
- Implement workspace isolation (RLS policies)
- Audit log for workflow modifications

---

## Building This into Any App

### Starting from Scratch (Building Workflows First)

**Step 1: Define Your Domain Model**
```typescript
// What are the key entities in your app?
type Scope = {
  customer?: Customer,
  order?: Order,
  product?: Product,
  user?: User,
  timestamp: string
}
```

**Step 2: Identify Events (Triggers)**
```typescript
// What happens in your app that might start automation?
const TRIGGERS = [
  'customer_registered',
  'order_placed',
  'order_shipped',
  'payment_received',
  'support_ticket_created'
];
```

**Step 3: Define Decision Points (Conditions)**
```typescript
// What questions might you ask about the data?
const CONDITIONS = [
  'Order Value Greater Than',
  'Customer Is VIP',
  'Product Category Equals',
  'Shipping Address In Region'
];
```

**Step 4: Define Automations (Actions)**
```typescript
// What should happen automatically?
const ACTIONS = [
  'Send Email',
  'Send SMS',
  'Create Notification',
  'Update Customer Status',
  'Create Task',
  'Call Webhook'
];
```

**Step 5: Build the Engine**
- Implement workflow executor (node traversal + execution)
- Create workflow storage (database tables)
- Build visual editor (React Flow)
- Add AI assistant (optional but powerful)

### Integrating into Existing App

**Step 1: Audit Your Events**
```typescript
// Find all places where important things happen
// Example: Lead creation
async function createLead() {
  // ... existing code ...
  
  // ADD THIS: Trigger workflows
  await triggerWorkflows('lead_created', { lead });
}
```

**Step 2: Define Scope Mapping**
```typescript
// Map your existing data models to workflow scope
function mapLeadToScope(lead, user) {
  return {
    lead: {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      value: lead.value,
      stage: lead.stage_id,
      source: lead.source,
      company: lead.company
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    timestamp: new Date().toISOString()
  };
}
```

**Step 3: Implement Trigger Points**
```typescript
// In your business logic, add workflow triggers
await supabase.functions.invoke('workflow-trigger', {
  body: {
    trigger_type: 'lead_created',
    trigger_data: mapLeadToScope(lead, currentUser)
  }
});
```

**Step 4: Wire Up Actions**
```typescript
// Actions should interact with your existing services
case 'Update Lead':
  await yourLeadService.update(scope.lead.id, config.updates);
  break;
```

### Checklist: Is Your Workflow System Ready?

- [ ] Database tables created (workflows, workflow_runs)
- [ ] Workflow executor edge function deployed
- [ ] Workflow trigger edge function deployed
- [ ] Visual canvas UI working
- [ ] At least 3 triggers defined and implemented
- [ ] At least 5 conditions defined and working
- [ ] At least 5 actions defined and working
- [ ] Template interpolation working ({{scope.field}})
- [ ] Execution logging implemented
- [ ] Error handling in place
- [ ] AI assistant integrated (optional)
- [ ] UI for managing workflows
- [ ] UI for viewing execution history

---

## Common Patterns & Recipes

### Pattern: Lead Nurture Sequence
```
[TRIGGER: Lead Created]
    ↓
[CONDITION: Has Email?]
    ↓ YES
[ACTION: Send Welcome Email]
    ↓
[ACTION: Create Follow-up Task]
    ↓
[ACTION: Add to Nurture List]
```

### Pattern: High-Value Lead Alert
```
[TRIGGER: Lead Created]
    ↓
[CONDITION: Value > $5000?]
    ↓ YES
[ACTION: Send Notification to Sales Manager]
    ↓
[ACTION: Create High Priority Task]
    ↓
[ACTION: Update Lead Status to "VIP"]
```

### Pattern: Form to Pipeline
```
[TRIGGER: Form Submitted]
    ↓
[ACTION: Create Lead from Form Data]
    ↓
[CONDITION: Form Field "Interest" = "Enterprise"?]
    ↓ YES                           ↓ NO
[Assign to Enterprise Stage]   [Assign to Standard Stage]
```

### Pattern: Scheduled Cleanup
```
[TRIGGER: Time Schedule (Daily)]
    ↓
[CONDITION: Lead Stage = "Proposal" AND Stage Duration > 30 days?]
    ↓ YES
[ACTION: Send "Are You Still Interested?" Email]
    ↓
[ACTION: Create Task for Sales Rep]
```

### Pattern: Multi-Channel Outreach
```
[TRIGGER: Lead Created]
    ↓
[CONDITION: Has Phone?]
    ↓ YES                    ↓ NO
[ACTION: Send SMS]      [ACTION: Send Email]
    ↓                         ↓
[ACTION: Create Call Task]   [ACTION: Create Email Follow-up Task]
```

---

## Understanding the "Engine" We Created

### What Makes This Powerful

1. **Visual Programming**: Non-technical users can create complex automation logic
2. **Event-Driven**: The system reacts to what happens in your app
3. **Declarative**: You define WHAT should happen, the engine handles HOW
4. **Composable**: Combine simple building blocks into sophisticated workflows
5. **Observable**: Every execution is logged for debugging
6. **AI-Enhanced**: The AI understands the entire system and can help create workflows

### The Hidden Complexity We Abstracted

Behind the simple visual interface, the system:
- Parses JSON workflow definitions into executable code
- Traverses node graphs following edges
- Evaluates boolean expressions
- Performs template string interpolation
- Handles async operations (emails, database updates)
- Manages state transitions
- Logs execution for debugging
- Handles errors gracefully
- Maintains workspace isolation

### Why This Architecture Works

1. **Separation of Concerns**
   - Visual layer (React Flow) separate from execution logic
   - Configuration separate from implementation
   - UI separate from backend

2. **Data Flow is Explicit**
   - Scope object flows through the entire workflow
   - Each node transforms or uses the scope
   - No hidden state or side effects

3. **Extensibility by Design**
   - Adding triggers/conditions/actions doesn't require changing core engine
   - Workflow definitions are data, not code
   - AI can understand and generate workflows because they're declarative

4. **Developer-Friendly Integration**
   - Simple API: `triggerWorkflows(type, data)`
   - Clear contracts: scope format
   - Observable: execution logs
   - Testable: pure functions

---

## Troubleshooting Guide

### Workflow Not Triggering

**Check**:
1. Is the workflow active? (`is_active = true`)
2. Does the `trigger_type` match exactly?
3. Is the trigger being called from your code?
4. Check `workflow_runs` table for errors

**Debug**:
```typescript
// Add logging to your trigger calls
console.log('Triggering workflows:', {
  trigger_type: 'lead_created',
  trigger_data: scope
});

await supabase.functions.invoke('workflow-trigger', {
  body: { trigger_type: 'lead_created', trigger_data: scope }
});
```

### Condition Not Working as Expected

**Check**:
1. Is the field path correct? (`lead.value` not `value`)
2. Is the data type correct? (number vs string)
3. Is the scope data complete?

**Debug**:
```typescript
// In workflow-executor, log scope and condition
console.log('Evaluating condition:', {
  condition: config,
  scope: scope,
  result: evaluateCondition(config, scope)
});
```

### Action Failing Silently

**Check**:
1. Check `workflow_runs.execution_log` for errors
2. Verify action configuration is complete
3. Check action has required scope data

**Debug**:
```typescript
// Wrap action execution in try-catch
try {
  await executeAction(actionConfig, scope);
  log.push({ status: 'success', action: actionConfig.action_type });
} catch (error) {
  log.push({ status: 'error', action: actionConfig.action_type, error: error.message });
}
```

### Template Variables Not Interpolating

**Check**:
1. Syntax: `{{lead.name}}` not `{lead.name}` or `${lead.name}`
2. Field exists in scope
3. Path is correct

**Debug**:
```typescript
function interpolate(template, scope) {
  console.log('Interpolating:', { template, scope });
  const result = template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getValueByPath(scope, path.trim());
    console.log(`  ${path} => ${value}`);
    return value ?? match;
  });
  console.log('Result:', result);
  return result;
}
```

---

## Next Steps & Advanced Topics

### Advanced Features to Consider

1. **Workflow Branching (Parallel Paths)**
   - Execute multiple actions simultaneously
   - Join paths back together

2. **Looping / Iteration**
   - Process arrays of items
   - "For each contact in segment, send email"

3. **Sub-Workflows**
   - Call one workflow from another
   - Reusable workflow components

4. **Scheduled Delays**
   - "Wait 3 days, then send follow-up"
   - Requires background job system

5. **External Webhook Triggers**
   - Accept webhooks from external systems
   - Parse and normalize into scope format

6. **A/B Testing**
   - Random split conditions
   - Track conversion metrics per path

7. **Workflow Marketplace**
   - Share workflows between workspaces
   - Template library

8. **Visual Workflow Diff**
   - Compare versions
   - See what changed

### Performance Optimizations

1. **Caching**
   - Cache workflow definitions in memory
   - Reduce database reads

2. **Batch Processing**
   - Group similar workflows
   - Execute in batches

3. **Async Actions**
   - Queue actions that don't need to be synchronous
   - Return immediately, process in background

4. **Conditional Indexing**
   - Index fields commonly used in conditions
   - Speed up condition evaluation

---

## Summary: The Power You Now Have

You've built a complete workflow automation engine that:

✅ **Works in ANY application** - The patterns are universal
✅ **Scales from simple to complex** - Start with basic automations, grow to sophisticated flows
✅ **Is AI-enhanced** - The assistant understands your entire system
✅ **Is maintainable** - Clear architecture, explicit data flow
✅ **Is extensible** - Add triggers/conditions/actions without touching core engine
✅ **Is observable** - Every execution is logged
✅ **Is user-friendly** - Visual, no-code interface

### The Core Insight

The real power isn't in the visual editor or even the execution engine. It's in the **unified scope language** that lets every part of your system speak to every other part.

When a lead is created, a form is submitted, or a payment is received, your app creates a **scope object** that describes what happened. That scope flows through your workflow, driving decisions and actions automatically.

This same pattern works for:
- E-commerce (order placed → scope flows → fulfillment workflow)
- Support systems (ticket created → scope flows → assignment workflow)
- Marketing (campaign trigger → scope flows → multi-step nurture)
- DevOps (deploy failed → scope flows → alert workflow)

**You now understand how to build automation into anything.**

---

## Appendix: Key Files Reference

### Frontend Files
- `src/pages/Automations.tsx` - Main automations page
- `src/components/automations/WorkflowCanvas.tsx` - Visual editor
- `src/components/automations/WorkflowAIAssistant.tsx` - AI helper
- `src/components/automations/ImprovedNodeConfigDialog.tsx` - Node configuration

### Backend Files
- `supabase/functions/workflow-trigger/index.ts` - Receives events
- `supabase/functions/workflow-executor/index.ts` - Executes workflows
- `supabase/functions/workflow-ai-assistant/index.ts` - AI assistance

### Database
- `workflows` table - Workflow definitions
- `workflow_runs` table - Execution history

### Integration Points
- Anywhere you call `supabase.functions.invoke('workflow-trigger', ...)`
- Scope creation/mapping functions

---

**Document Version**: 1.0
**Last Updated**: 2025-01-15
**Maintainer**: Your Development Team

*Keep this document updated as you add new triggers, conditions, and actions. It's your system's source of truth.*
