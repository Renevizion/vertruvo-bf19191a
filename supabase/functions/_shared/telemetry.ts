// ============================================
// FIX #8: SCOPE ANALYTICS/OBSERVABILITY
// ============================================

interface ScopeAccessEvent {
  timestamp: number;
  workflowId: string;
  nodeId: string;
  field: string;
  accessType: 'read' | 'write';
}

interface FieldUsageStats {
  field: string;
  readCount: number;
  writeCount: number;
  lastAccessed: number;
  workflows: Set<string>;
}

class TelemetryCollector {
  private events: ScopeAccessEvent[] = [];
  private fieldStats: Map<string, FieldUsageStats> = new Map();
  private maxEvents = 10000;
  
  trackFieldAccess(
    workflowId: string,
    nodeId: string,
    field: string,
    accessType: 'read' | 'write' = 'read'
  ): void {
    // Record event
    const event: ScopeAccessEvent = {
      timestamp: Date.now(),
      workflowId,
      nodeId,
      field,
      accessType,
    };
    
    this.events.push(event);
    
    // Trim old events if exceeding limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Update field statistics
    const stats = this.fieldStats.get(field) || {
      field,
      readCount: 0,
      writeCount: 0,
      lastAccessed: 0,
      workflows: new Set<string>(),
    };
    
    if (accessType === 'read') {
      stats.readCount++;
    } else {
      stats.writeCount++;
    }
    
    stats.lastAccessed = Date.now();
    stats.workflows.add(workflowId);
    
    this.fieldStats.set(field, stats);
  }
  
  getFieldUsage(field?: string): any {
    if (field) {
      const stats = this.fieldStats.get(field);
      return stats ? {
        ...stats,
        workflows: Array.from(stats.workflows),
      } : null;
    }
    
    // Return all stats
    return Array.from(this.fieldStats.entries()).map(([field, stats]) => ({
      ...stats,
      workflows: Array.from(stats.workflows),
    })).sort((a, b) => (b.readCount + b.writeCount) - (a.readCount + a.writeCount));
  }
  
  getUnusedFields(knownFields: string[]): string[] {
    return knownFields.filter(field => !this.fieldStats.has(field));
  }
  
  getMostAccessedFields(limit: number = 10): any[] {
    return this.getFieldUsage().slice(0, limit);
  }
  
  getWorkflowFieldUsage(workflowId: string): string[] {
    return Array.from(this.fieldStats.entries())
      .filter(([_, stats]) => stats.workflows.has(workflowId))
      .map(([field]) => field);
  }
  
  clear(): void {
    this.events = [];
    this.fieldStats.clear();
  }
  
  getStats() {
    return {
      totalEvents: this.events.length,
      uniqueFields: this.fieldStats.size,
      totalReads: Array.from(this.fieldStats.values()).reduce((sum, s) => sum + s.readCount, 0),
      totalWrites: Array.from(this.fieldStats.values()).reduce((sum, s) => sum + s.writeCount, 0),
    };
  }
}

// Global telemetry instance
export const telemetry = new TelemetryCollector();

// Telemetry helpers
export function trackScopeFieldRead(workflowId: string, nodeId: string, field: string): void {
  telemetry.trackFieldAccess(workflowId, nodeId, field, 'read');
}

export function trackScopeFieldWrite(workflowId: string, nodeId: string, field: string): void {
  telemetry.trackFieldAccess(workflowId, nodeId, field, 'write');
}

// Instrumented scope proxy
export function createInstrumentedScope<T extends object>(
  scope: T,
  workflowId: string,
  nodeId: string
): T {
  return new Proxy(scope, {
    get(target, prop: string) {
      const value = target[prop as keyof T];
      
      // Track field access
      if (typeof prop === 'string' && prop !== 'constructor') {
        trackScopeFieldRead(workflowId, nodeId, prop);
      }
      
      // If value is an object, instrument it recursively
      if (typeof value === 'object' && value !== null) {
        return createInstrumentedScope(value, workflowId, `${nodeId}.${prop}`);
      }
      
      return value;
    },
    set(target, prop: string, value) {
      // Track field write
      if (typeof prop === 'string') {
        trackScopeFieldWrite(workflowId, nodeId, prop);
      }
      
      target[prop as keyof T] = value;
      return true;
    },
  });
}
