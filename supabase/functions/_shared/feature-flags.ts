// ============================================
// FIX #9: FEATURE FLAGS IN SCOPE
// ============================================

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number; // 0-100
  workspaces?: string[]; // specific workspaces
  users?: string[]; // specific users
}

class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  
  constructor() {
    // Initialize default flags
    this.registerFlag({
      name: 'workflow_ai_assistant',
      enabled: true,
      description: 'Enable AI assistant for workflow creation',
      rolloutPercentage: 100,
    });
    
    this.registerFlag({
      name: 'advanced_conditions',
      enabled: true,
      description: 'Enable advanced condition types',
      rolloutPercentage: 100,
    });
    
    this.registerFlag({
      name: 'workflow_templates',
      enabled: true,
      description: 'Enable workflow templates',
      rolloutPercentage: 100,
    });
    
    this.registerFlag({
      name: 'scope_enrichment',
      enabled: true,
      description: 'Enable progressive scope enrichment',
      rolloutPercentage: 100,
    });
    
    this.registerFlag({
      name: 'rate_limiting',
      enabled: true,
      description: 'Enable rate limiting',
      rolloutPercentage: 100,
    });
    
    this.registerFlag({
      name: 'async_execution',
      enabled: true,
      description: 'Enable async workflow execution',
      rolloutPercentage: 100,
    });
  }
  
  registerFlag(flag: FeatureFlag): void {
    this.flags.set(flag.name, flag);
  }
  
  isEnabled(
    flagName: string,
    context?: { workspaceId?: string; userId?: string }
  ): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    
    // Check if globally disabled
    if (!flag.enabled) return false;
    
    // Check workspace whitelist
    if (flag.workspaces && context?.workspaceId) {
      if (!flag.workspaces.includes(context.workspaceId)) {
        return false;
      }
    }
    
    // Check user whitelist
    if (flag.users && context?.userId) {
      if (!flag.users.includes(context.userId)) {
        return false;
      }
    }
    
    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      // Use deterministic hash for consistent rollout
      const hash = this.hashCode(flagName + (context?.workspaceId || context?.userId || ''));
      const bucket = Math.abs(hash % 100);
      return bucket < flag.rolloutPercentage;
    }
    
    return true;
  }
  
  getFlags(context?: { workspaceId?: string; userId?: string }): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    
    for (const [name, flag] of this.flags.entries()) {
      result[name] = this.isEnabled(name, context);
    }
    
    return result;
  }
  
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }
  
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

// Global feature flag manager
export const featureFlags = new FeatureFlagManager();

// Feature flag helpers
export function isFeatureEnabled(
  flagName: string,
  context?: { workspaceId?: string; userId?: string }
): boolean {
  return featureFlags.isEnabled(flagName, context);
}

export function getFeatureFlags(
  context?: { workspaceId?: string; userId?: string }
): Record<string, boolean> {
  return featureFlags.getFlags(context);
}

// Conditional execution based on feature flag
export async function executeIfEnabled<T>(
  flagName: string,
  fn: () => Promise<T>,
  fallback: () => Promise<T>,
  context?: { workspaceId?: string; userId?: string }
): Promise<T> {
  if (isFeatureEnabled(flagName, context)) {
    return await fn();
  }
  return await fallback();
}
