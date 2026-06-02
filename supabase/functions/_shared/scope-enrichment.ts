// ============================================
// FIX #10: SCOPE ENRICHMENT PIPELINE
// ============================================

import { WorkflowScope } from './scope-validation.ts';
import { getCachedLead, getCachedUser } from './caching.ts';

export type EnrichmentLevel = 'base' | 'enhanced' | 'full';

export interface EnrichmentConfig {
  level: EnrichmentLevel;
  includeUser?: boolean;
  includeWorkspace?: boolean;
  includeRelated?: boolean;
  includeAI?: boolean;
}

const DEFAULT_ENRICHMENT: EnrichmentConfig = {
  level: 'base',
  includeUser: false,
  includeWorkspace: false,
  includeRelated: false,
  includeAI: false,
};

// Progressive enrichment pipeline
export async function enrichScope(
  scope: WorkflowScope,
  config: Partial<EnrichmentConfig> = {},
  supabase: any
): Promise<WorkflowScope> {
  const enrichmentConfig = { ...DEFAULT_ENRICHMENT, ...config };
  const enriched = { ...scope };
  
  console.log(`[Enrichment] Starting ${enrichmentConfig.level} enrichment`);
  
  // Base enrichment (always included)
  enriched._enrichment_level = 'base';
  enriched._timestamp = new Date().toISOString();
  
  if (enrichmentConfig.level === 'base') {
    return enriched;
  }
  
  // Enhanced enrichment
  if (enrichmentConfig.level === 'enhanced' || enrichmentConfig.level === 'full') {
    // Enrich user data
    if (enrichmentConfig.includeUser && scope.user?.id) {
      const userData = await getCachedUser(scope.user.id, supabase);
      if (userData) {
        enriched.user = {
          id: scope.user.id,
          name: userData.first_name + ' ' + userData.last_name,
          email: userData.email,
          timezone: userData.timezone,
        };
      }
    }
    
    // Enrich lead data with related info
    if (enrichmentConfig.includeRelated && scope.lead?.id) {
      const leadData = await getCachedLead(scope.lead.id, scope.workspace_id, supabase);
      if (leadData) {
        enriched.lead = { ...enriched.lead, ...leadData };
        
        // Get lead's pipeline stage
        if (leadData.stage_id) {
          const { data: stage } = await supabase
            .from('pipeline_stages')
            .select('name, color')
            .eq('id', leadData.stage_id)
            .single();
          
          if (stage && enriched.lead) {
            (enriched.lead as any).stage_name = stage.name;
            (enriched.lead as any).stage_color = stage.color;
          }
        }
      }
    }
    
    // Enrich workspace data
    if (enrichmentConfig.includeWorkspace && scope.workspace_id) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name, owner_id')
        .eq('id', scope.workspace_id)
        .single();
      
      if (workspace) {
        enriched.workspace = {
          id: scope.workspace_id,
          name: workspace.name,
          owner_id: workspace.owner_id,
        };
      }
    }
    
    enriched._enrichment_level = 'enhanced';
  }
  
  // Full enrichment (includes AI insights)
  if (enrichmentConfig.level === 'full') {
    // AI-powered enrichment
    if (enrichmentConfig.includeAI && scope.lead?.id) {
      try {
        // Get AI insights if available
        const { data: insights } = await supabase
          .from('agent_insights')
          .select('*')
          .eq('context_type', 'lead')
          .eq('context_id', scope.lead.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (insights && insights.length > 0) {
          enriched.ai_insights = insights.map((i: any) => ({
            type: i.insight_type,
            content: i.content,
            model: i.model_used,
            created_at: i.created_at,
          }));
        }
      } catch (error) {
        console.warn('[Enrichment] Failed to fetch AI insights:', error);
      }
    }
    
    enriched._enrichment_level = 'full';
  }
  
  console.log(`[Enrichment] Completed: ${enriched._enrichment_level}`);
  return enriched;
}

// Lazy enrichment - only enrich when needed
export async function lazyEnrichField(
  scope: WorkflowScope,
  fieldPath: string,
  supabase: any
): Promise<any> {
  const parts = fieldPath.split('.');
  
  // Handle nested field access
  if (parts.length === 2) {
    const [entity, field] = parts;
    
    // If field already exists, return it
    const current = scope[entity as keyof WorkflowScope];
    if (current && typeof current === 'object' && field in current) {
      return (current as any)[field];
    }
    
    // Fetch and enrich on demand
    if (entity === 'lead' && scope.lead?.id) {
      const leadData = await getCachedLead(scope.lead.id, scope.workspace_id, supabase);
      if (leadData && field in leadData) {
        // Update scope
        scope.lead = { ...scope.lead, [field]: leadData[field] };
        return leadData[field];
      }
    }
    
    if (entity === 'user' && scope.user?.id) {
      const userData = await getCachedUser(scope.user.id, supabase);
      if (userData && field in userData) {
        scope.user = { ...scope.user, [field]: userData[field] };
        return userData[field];
      }
    }
  }
  
  return undefined;
}

// Batch enrichment for multiple scopes
export async function enrichScopeBatch(
  scopes: WorkflowScope[],
  config: Partial<EnrichmentConfig> = {},
  supabase: any
): Promise<WorkflowScope[]> {
  return await Promise.all(
    scopes.map(scope => enrichScope(scope, config, supabase))
  );
}
