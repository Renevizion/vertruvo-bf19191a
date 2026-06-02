import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { LeadCard } from "./LeadCard";
import type { LeadCardDisplaySettings } from "./LeadCardSettings";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

interface KanbanBoardProps {
  stages: Stage[];
  leads: Lead[];
  onDragEnd: (result: any) => void;
  onViewDetails: (id: string) => void;
  cardSettings?: LeadCardDisplaySettings;
  selectedLeadIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export const KanbanBoard = ({ stages, leads, onDragEnd, onViewDetails, cardSettings, selectedLeadIds, onSelectionChange }: KanbanBoardProps) => {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const selectionMode = !!selectedLeadIds && !!onSelectionChange;

  const toggleCollapse = (stageId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const firstStage = stages[0];

  const getStageLeads = (stage: Stage) => {
    let stageLeads = leads.filter(lead => lead.stage_id === stage.id);
    if (stage.id === firstStage?.id) {
      const leadsWithoutStage = leads.filter(lead => !lead.stage_id);
      stageLeads = [...stageLeads, ...leadsWithoutStage];
    }
    return stageLeads.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  };

  const getTotalValue = (stageLeads: Lead[]) => {
    return stageLeads.reduce((sum, lead) => sum + lead.value, 0);
  };

  const toggleLead = (leadId: string) => {
    if (!onSelectionChange || !selectedLeadIds) return;
    const next = new Set(selectedLeadIds);
    if (next.has(leadId)) {
      next.delete(leadId);
    } else {
      next.add(leadId);
    }
    onSelectionChange(next);
  };

  const toggleColumn = (stageLeads: Lead[]) => {
    if (!onSelectionChange || !selectedLeadIds) return;
    const allSelected = stageLeads.every(l => selectedLeadIds.has(l.id));
    const next = new Set(selectedLeadIds);
    if (allSelected) {
      stageLeads.forEach(l => next.delete(l.id));
    } else {
      stageLeads.forEach(l => next.add(l.id));
    }
    onSelectionChange(next);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 pb-4 overflow-x-auto h-[calc(100vh-220px)]">
        {stages.map((stage) => {
          const stageLeads = getStageLeads(stage);
          const totalValue = getTotalValue(stageLeads);
          const isCollapsed = collapsedColumns.has(stage.id);
          const allSelected = selectionMode && stageLeads.length > 0 && stageLeads.every(l => selectedLeadIds!.has(l.id));
          const someSelected = selectionMode && stageLeads.some(l => selectedLeadIds!.has(l.id));

          if (isCollapsed) {
            return (
              <div key={stage.id} className="flex-shrink-0 w-10">
                <Card
                  className="h-full bg-muted/30 border-border flex flex-col items-center py-3 px-1 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCollapse(stage.id)}
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground mb-2 flex-shrink-0" />
                  <div
                    className="writing-mode-vertical text-xs font-semibold text-foreground whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {stage.name}
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] mt-2 px-1 flex-shrink-0"
                    style={{ backgroundColor: stage.color + '20', color: stage.color }}
                  >
                    {stageLeads.length}
                  </Badge>
                </Card>
              </div>
            );
          }

          return (
            <div key={stage.id} className="flex-shrink-0 w-[260px] flex flex-col min-h-0">
              {/* Sticky header */}
              <Card className="p-3 bg-muted/30 border-border rounded-b-none border-b-0 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  {selectionMode && stageLeads.length > 0 && (
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={() => toggleColumn(stageLeads)}
                      className="flex-shrink-0"
                      aria-label={`Select all in ${stage.name}`}
                    />
                  )}
                  <button
                    onClick={() => toggleCollapse(stage.id)}
                    className="p-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                    title="Collapse column"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <h3 className="font-semibold text-foreground text-sm truncate flex-1">
                    {stage.name}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="text-xs flex-shrink-0"
                    style={{ backgroundColor: stage.color + '20', color: stage.color }}
                  >
                    {stageLeads.length}
                  </Badge>
                </div>
                {totalValue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${totalValue.toLocaleString()}
                  </p>
                )}
              </Card>

              {/* Scrollable card area */}
              <Card className="flex-1 min-h-0 bg-muted/30 border-border rounded-t-none overflow-hidden">
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`h-full overflow-y-auto p-2 space-y-2 ${
                        snapshot.isDraggingOver ? 'bg-accent/50' : ''
                      }`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'opacity-50' : ''}
                            >
                              <LeadCard
                                lead={lead}
                                onViewDetails={onViewDetails}
                                displaySettings={cardSettings}
                                selected={selectionMode ? selectedLeadIds!.has(lead.id) : undefined}
                                onSelect={selectionMode ? () => toggleLead(lead.id) : undefined}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </Card>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
