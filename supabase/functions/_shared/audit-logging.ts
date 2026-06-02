// ============================================
// FIX #11: AUDIT LOGS FOR SCOPE CHANGES
// ============================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  workflowId: string;
  workflowRunId?: string;
  nodeId?: string;
  action: string;
  entity: string;
  entityId: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  userId?: string;
  workspaceId: string;
  metadata?: Record<string, any>;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000;
  
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    
    this.logs.push(logEntry);
    
    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    console.log(`[Audit] ${logEntry.action} on ${logEntry.entity}:${logEntry.entityId}`);
    
    // In production, persist to database
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Store in activities table for now (could create dedicated audit_logs table)
        await supabase.from('activities').insert({
          type: 'workflow_audit',
          title: logEntry.action,
          description: JSON.stringify({
            entity: logEntry.entity,
            entityId: logEntry.entityId,
            changes: logEntry.changes,
          }),
          workspace_id: logEntry.workspaceId,
          created_by: logEntry.userId,
        });
      }
    } catch (error) {
      console.warn('[Audit] Failed to persist log:', error);
    }
  }
  
  getLogs(filters?: {
    workflowId?: string;
    entity?: string;
    entityId?: string;
    userId?: string;
    workspaceId?: string;
    from?: Date;
    to?: Date;
  }): AuditLogEntry[] {
    let filtered = this.logs;
    
    if (filters?.workflowId) {
      filtered = filtered.filter(log => log.workflowId === filters.workflowId);
    }
    
    if (filters?.entity) {
      filtered = filtered.filter(log => log.entity === filters.entity);
    }
    
    if (filters?.entityId) {
      filtered = filtered.filter(log => log.entityId === filters.entityId);
    }
    
    if (filters?.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }
    
    if (filters?.workspaceId) {
      filtered = filtered.filter(log => log.workspaceId === filters.workspaceId);
    }
    
    if (filters?.from) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= filters.from!);
    }
    
    if (filters?.to) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= filters.to!);
    }
    
    return filtered;
  }
  
  getEntityHistory(entity: string, entityId: string): AuditLogEntry[] {
    return this.getLogs({ entity, entityId });
  }
}

// Global audit logger
export const auditLogger = new AuditLogger();

// Audit log helpers
export async function logScopeChange(
  workflowId: string,
  workflowRunId: string,
  nodeId: string,
  entity: string,
  entityId: string,
  changes: { field: string; oldValue: any; newValue: any }[],
  workspaceId: string,
  userId?: string
): Promise<void> {
  await auditLogger.log({
    workflowId,
    workflowRunId,
    nodeId,
    action: 'scope_modified',
    entity,
    entityId,
    changes,
    userId,
    workspaceId,
  });
}

export async function logWorkflowExecution(
  workflowId: string,
  workflowRunId: string,
  action: string,
  workspaceId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await auditLogger.log({
    workflowId,
    workflowRunId,
    action,
    entity: 'workflow',
    entityId: workflowId,
    changes: [],
    workspaceId,
    metadata,
  });
}

// Track changes between two objects
export function detectChanges(
  oldObj: any,
  newObj: any
): { field: string; oldValue: any; newValue: any }[] {
  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  
  // Check all keys in new object
  for (const key in newObj) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes.push({
        field: key,
        oldValue: oldObj[key],
        newValue: newObj[key],
      });
    }
  }
  
  // Check for deleted keys
  for (const key in oldObj) {
    if (!(key in newObj)) {
      changes.push({
        field: key,
        oldValue: oldObj[key],
        newValue: undefined,
      });
    }
  }
  
  return changes;
}
