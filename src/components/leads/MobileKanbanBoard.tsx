import { useState } from "react";
import { LeadCard } from "./LeadCard";
import type { LeadCardDisplaySettings } from "./LeadCardSettings";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  value: number;
  notes?: string;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
}

interface MobileKanbanBoardProps {
  stages: Stage[];
  leads: Lead[];
  onViewDetails: (id: string) => void;
  onMoveToStage: (leadId: string, stageId: string) => void;
  cardSettings?: LeadCardDisplaySettings;
}

export const MobileKanbanBoard = ({ 
  stages, 
  leads, 
  onViewDetails, 
  onMoveToStage,
  cardSettings 
}: MobileKanbanBoardProps) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || "");

  const selectedStage = stages.find(s => s.id === selectedStageId) || stages[0];
  
  const getLeadsForStage = (stageId: string) => {
    const firstStage = stages[0];
    let stageLeads = leads.filter(lead => lead.stage_id === stageId);
    
    // For first stage, also include leads without a stage_id
    if (stageId === firstStage?.id) {
      const leadsWithoutStage = leads.filter(lead => !lead.stage_id);
      stageLeads = [...stageLeads, ...leadsWithoutStage];
    }
    
    return stageLeads.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  };

  const currentLeads = getLeadsForStage(selectedStageId);
  const totalValue = currentLeads.reduce((sum, lead) => sum + lead.value, 0);

  return (
    <div className="space-y-4">
      {/* Stage Selector */}
      <Card className="p-3">
        <div className="flex items-center justify-between gap-3">
          <Select value={selectedStageId} onValueChange={setSelectedStageId}>
            <SelectTrigger className="flex-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: selectedStage?.color }}
                />
                <SelectValue placeholder="Select stage" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => {
                const stageLeadCount = getLeadsForStage(stage.id).length;
                return (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: stage.color }}
                      />
                      <span>{stage.name}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {stageLeadCount}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <Badge variant="secondary" className="flex-shrink-0">
            {currentLeads.length} leads
          </Badge>
        </div>
        
        {totalValue > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Total value: ${totalValue.toLocaleString()}
          </p>
        )}
      </Card>

      {/* Stage Pills for Quick Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {stages.map((stage) => {
          const count = getLeadsForStage(stage.id).length;
          const isSelected = stage.id === selectedStageId;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStageId(stage.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: isSelected ? 'currentColor' : stage.color }}
              />
              {stage.name}
              <span className={`ml-1 ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {currentLeads.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No opportunities in this stage</p>
          </Card>
        ) : (
          currentLeads.map((lead) => (
            <div key={lead.id} className="relative">
              <LeadCard
                lead={lead}
                onViewDetails={onViewDetails}
                displaySettings={cardSettings}
              />
              
              {/* Quick Move Dropdown */}
              <div className="absolute top-2 right-2 z-10">
                <Select 
                  value={lead.stage_id || stages[0]?.id}
                  onValueChange={(newStageId) => onMoveToStage(lead.id, newStageId)}
                >
                  <SelectTrigger className="h-7 w-7 p-0 border-0 bg-background/80 backdrop-blur-sm">
                    <ChevronDown className="h-3 w-3" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
