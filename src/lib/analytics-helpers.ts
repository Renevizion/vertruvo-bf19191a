/**
 * Analytics Helper Functions
 * Future-proof utilities for analytics calculations
 */

// Flexible types to work with partial data from queries
type Lead = { stage_id?: string | null; source?: string | null; [key: string]: any };
type Stage = { id: string; name?: string | null; position: number; pipeline_id?: string | null; [key: string]: any };

/**
 * Get the last (won) stage for each pipeline
 * Future-proof: Works regardless of stage names
 */
export const getWonStages = (stages: Stage[]): Stage[] => {
  const pipelineLastStages = stages.reduce((acc, stage) => {
    const pipelineId = stage.pipeline_id || 'default';
    if (!acc[pipelineId] || (stage.position > (acc[pipelineId]?.position || 0))) {
      acc[pipelineId] = stage;
    }
    return acc;
  }, {} as Record<string, Stage>);

  return Object.values(pipelineLastStages);
};

/**
 * Get won stage IDs for filtering
 */
export const getWonStageIds = (stages: Stage[]): string[] => {
  return getWonStages(stages).map(s => s.id);
};

/**
 * Group stages by position across pipelines
 * Returns map of position -> stages at that position
 */
export const groupStagesByPosition = (stages: Stage[]): Record<number, Stage[]> => {
  return stages
    .sort((a, b) => a.position - b.position)
    .reduce((acc, stage) => {
      if (!acc[stage.position]) {
        acc[stage.position] = [];
      }
      acc[stage.position].push(stage);
      return acc;
    }, {} as Record<number, Stage[]>);
};

/**
 * Get representative stage name for a position
 * Uses first stage name found at that position
 */
export const getStageNameForPosition = (
  position: number,
  stagesByPosition: Record<number, Stage[]>
): string => {
  const stagesAtPosition = stagesByPosition[position];
  return stagesAtPosition?.[0]?.name || `Stage ${position}`;
};

/**
 * Calculate conversion rate
 * Returns percentage of leads in won stages
 */
export const calculateConversionRate = (
  leads: Lead[],
  wonStageIds: string[]
): number => {
  if (leads.length === 0) return 0;
  
  const wonLeads = leads.filter(lead => 
    lead.stage_id && wonStageIds.includes(lead.stage_id)
  );
  
  return (wonLeads.length / leads.length) * 100;
};

/**
 * Group leads by source
 * Returns map of source -> count
 */
export const groupLeadsBySource = (leads: Lead[]): Record<string, number> => {
  return leads.reduce((acc, lead) => {
    const source = lead.source || 'Unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Calculate source percentages
 */
export const calculateSourcePercentages = (
  sourceCounts: Record<string, number>,
  totalLeads: number
): Array<{ source: string; count: number; percentage: string }> => {
  return Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Get leads in specific stage positions
 * Future-proof: Works with any pipeline structure
 */
export const getLeadsAtPosition = (
  leads: Lead[],
  position: number,
  stages: Stage[]
): Lead[] => {
  const stageIds = stages
    .filter(s => s.position === position)
    .map(s => s.id);
  
  return leads.filter(lead => 
    lead.stage_id && stageIds.includes(lead.stage_id)
  );
};

/**
 * Build conversion funnel data
 * Returns array of {position, name, count} for each stage position
 */
export const buildConversionFunnel = (
  leads: Lead[],
  stages: Stage[]
): Array<{ position: number; name: string; count: number }> => {
  const stagesByPosition = groupStagesByPosition(stages);
  const positions = Object.keys(stagesByPosition)
    .map(Number)
    .sort((a, b) => a - b);

  return positions.map(position => {
    const stagesAtPosition = stagesByPosition[position];
    const stageIds = stagesAtPosition.map(s => s.id);
    const count = leads.filter(l => 
      l.stage_id && stageIds.includes(l.stage_id)
    ).length;

    return {
      position,
      name: getStageNameForPosition(position, stagesByPosition),
      count,
    };
  });
};
