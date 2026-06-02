# Admin & Monitoring System Documentation

## Overview

This document outlines the comprehensive admin and monitoring system built for platform-wide management and control.

## Platform Architecture

### Admin Access Model

The system uses a multi-tier access control model:

1. **Platform Admins** (`owner` or `admin` role)
   - Full system access across all workspaces
   - Can view all audit logs, metrics, and configurations
   - Manage platform-wide settings
   - Access admin dashboard at `/admin`

2. **Workspace Owners**
   - Manage their own workspace
   - View workspace-specific audit logs
   - Configure workspace webhooks

3. **Regular Users**
   - Access limited to assigned workspaces
   - No admin privileges

### Database Schema

#### Audit Logs (`audit_logs`)
```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid REFERENCES workspaces(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,  -- e.g., "created", "updated", "deleted"
  entity text NOT NULL,  -- e.g., "workflow", "lead", "user"
  entity_id text,
  changes jsonb,  -- Before/after values
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `idx_audit_logs_workspace` - Workspace filtering
- `idx_audit_logs_user` - User activity tracking
- `idx_audit_logs_entity` - Entity-based queries
- `idx_audit_logs_timestamp` - Time-based queries

#### Webhook Configurations (`webhook_configs`)
```sql
CREATE TABLE webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  url text NOT NULL,
  secret text,  -- For HMAC signature verification
  events text[] NOT NULL DEFAULT '{}',  -- Array of event types
  is_active boolean DEFAULT true,
  retry_config jsonb DEFAULT '{"max_retries": 3, "backoff": "exponential"}'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb,  -- Custom HTTP headers
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Supported Events:**
- `workflow.started`
- `workflow.completed`
- `workflow.failed`
- `lead.created`
- `lead.updated`
- `subscription.created`
- `subscription.canceled`

#### Webhook Logs (`webhook_logs`)
```sql
CREATE TABLE webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES webhook_configs(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  error text,
  attempt_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
```

#### System Metrics (`system_metrics`)
```sql
CREATE TABLE system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,  -- e.g., "workflow_runs", "api_calls"
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now()
);
```

**Common Metric Types:**
- `workflow_runs_per_hour`
- `error_rate`
- `api_response_time`
- `active_users`
- `storage_usage`

#### Platform Configuration (`platform_config`)
```sql
CREATE TABLE platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);
```

**Configuration Keys:**
- `max_workflows_per_workspace` - Rate limits
- `max_workflow_runs_per_day` - Daily execution limits
- `enable_ai_features` - Feature flags
- `webhook_timeout_seconds` - Webhook timeouts
- `audit_log_retention_days` - Data retention policy

## Admin UI Components

### 1. Monitoring Dashboard (`/admin?tab=monitoring`)

**Features:**
- Real-time system metrics
- Workspace count
- Total workflows
- Execution rates
- Error rates
- Recent activity feed

**Metrics Displayed:**
```typescript
interface SystemMetrics {
  totalWorkspaces: number;
  totalWorkflows: number;
  runsLastHour: number;
  errorRate: number;
}
```

**Refresh Rate:** 30 seconds

### 2. Audit Logs Viewer (`/admin?tab=audit`)

**Features:**
- Search across all fields
- Filter by entity type
- Time-based sorting
- Pagination (100 logs per page)
- Export capabilities

**Search & Filter:**
```typescript
// Entity filters
type EntityFilter = 
  | "all"
  | "workflow"
  | "lead"
  | "contact"
  | "user"
  | "webhook";

// Action color coding
const getActionColor = (action: string) => {
  if (action.includes("create")) return "default";
  if (action.includes("update")) return "secondary";
  if (action.includes("delete")) return "destructive";
  return "outline";
};
```

### 3. Webhook Manager (`/admin?tab=webhooks`)

**Features:**
- Create/edit/delete webhooks
- Toggle active status
- Event subscription management
- Secret key management
- Delivery logs

**Webhook Creation:**
```typescript
interface WebhookConfig {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  headers?: Record<string, string>;
  retry_config?: {
    max_retries: number;
    backoff: "linear" | "exponential";
  };
}
```

### 4. Platform Configuration (`/admin?tab=config`)

**Configurable Settings:**

1. **Rate Limits**
   - Max workflows per workspace
   - Max workflow runs per day

2. **Feature Flags**
   - Enable/disable AI features
   - Beta feature access

3. **System Behavior**
   - Webhook timeout duration
   - Audit log retention
   - Error notification thresholds

## Security & Access Control

### RLS Policies

#### Audit Logs
```sql
-- Platform admins see everything
CREATE POLICY "Platform admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

-- Users see their workspace only
CREATE POLICY "Users can view their workspace audit logs"
  ON audit_logs FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));
```

#### Webhooks
```sql
CREATE POLICY "Platform admins can manage all webhooks"
  ON webhook_configs FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can manage their workspace webhooks"
  ON webhook_configs FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));
```

### Admin Role Check

```typescript
// Client-side hook
export const useIsPlatformAdmin = () => {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin"
      });
      
      return data || false;
    },
  });
};
```

## Webhook System

### Webhook Node in Workflows

New workflow node type for sending HTTP requests:

```typescript
interface WebhookNodeData {
  label: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  body?: any;
  auth?: {
    type: "bearer" | "basic" | "api_key";
    credentials: string;
  };
}
```

### Webhook Delivery

**Retry Logic:**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max retries: 3 (configurable)
- Timeout: 30s (configurable)

**Signature Verification:**
```typescript
// HMAC-SHA256 signature in header
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

headers['X-Webhook-Signature'] = signature;
```

## Monitoring & Alerts

### Key Metrics Tracked

1. **Performance Metrics**
   - Workflow execution time
   - API response time
   - Database query performance

2. **Usage Metrics**
   - Active workspaces
   - Workflow runs per hour/day
   - Storage consumption

3. **Error Metrics**
   - Error rate by workspace
   - Failed workflow runs
   - Webhook delivery failures

### Alerting (Future Enhancement)

Planned alert triggers:
- Error rate > 5%
- Workflow run limit reached
- Storage quota exceeded
- Unusual activity patterns

## API Functions

### Audit Logging

```sql
-- Function to log events
CREATE FUNCTION log_audit_event(
  _workspace_id uuid,
  _action text,
  _entity text,
  _entity_id text,
  _changes jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid;
```

**Usage in Edge Functions:**
```typescript
import { logAuditEvent } from "../_shared/audit-logging";

await logAuditEvent(
  workflowId,
  workflowRunId,
  nodeId,
  "workflow",
  workflowId,
  [{ field: "status", oldValue: "pending", newValue: "running" }],
  workspaceId,
  userId
);
```

## Best Practices

### For Platform Admins

1. **Regular Monitoring**
   - Check dashboard daily
   - Review error rates weekly
   - Audit security logs monthly

2. **Configuration Management**
   - Test rate limit changes in staging
   - Document all config changes
   - Use gradual rollouts for features

3. **Security**
   - Rotate webhook secrets regularly
   - Review admin access quarterly
   - Monitor for suspicious activity

### For Developers

1. **Audit Logging**
   - Log all state changes
   - Include meaningful metadata
   - Sanitize sensitive data

2. **Webhook Integration**
   - Always verify signatures
   - Handle retries gracefully
   - Log delivery attempts

3. **Error Handling**
   - Provide actionable error messages
   - Track error patterns
   - Implement circuit breakers

## Future Enhancements

1. **Advanced Analytics**
   - Cohort analysis
   - User behavior tracking
   - Predictive alerts

2. **Enhanced Security**
   - 2FA for admin access
   - IP whitelisting
   - Audit log exports

3. **Automation**
   - Auto-scaling rules
   - Self-healing workflows
   - Intelligent rate limiting

4. **Integrations**
   - Slack notifications
   - PagerDuty alerts
   - Datadog metrics

## Troubleshooting

### Common Issues

**Q: Admin dashboard shows no data**
- Verify user has `admin` or `owner` role in `user_roles` table
- Check RLS policies are enabled
- Ensure proper authentication

**Q: Webhooks not firing**
- Verify webhook is active (`is_active = true`)
- Check event type matches trigger
- Review webhook logs for errors

**Q: Audit logs missing**
- Ensure `log_audit_event()` is called
- Check RLS policies
- Verify workspace_id is set

## Support & Documentation

- **Admin Guide**: `/admin` page has inline help
- **API Docs**: This document + `API_DOCUMENTATION_ENTERPRISE.md`
- **Security**: Review RLS policies regularly
- **Updates**: Check migration files for schema changes
