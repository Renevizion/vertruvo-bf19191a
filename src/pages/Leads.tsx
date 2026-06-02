import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, List, LayoutGrid, MousePointerClick, X, Sparkles, Upload, Inbox, Users, TrendingUp, Download } from "lucide-react";
import Papa from "papaparse";
import { LiveEmpty } from "@/components/ops";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { KanbanBoard } from "@/components/leads/KanbanBoard";
import { MobileKanbanBoard } from "@/components/leads/MobileKanbanBoard";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import { PipelineManager } from "@/components/pipelines/PipelineManager";
import { LeadDetailsSheet } from "@/components/leads/LeadDetailsSheet";
import { BulkOutreachDialog } from "@/components/leads/BulkOutreachDialog";
import { BulkLeadLookupDialog } from "@/components/leads/BulkLeadLookupDialog";
import { DuplicateReviewDialog } from "@/components/duplicates/DuplicateReviewDialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LeadScoringConfig } from "@/components/leads/LeadScoringConfig";
import { LeadCardSettings } from "@/components/leads/LeadCardSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/layout/PageHeader";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  value: number;
  notes?: string;
  company?: string;
  stage_id: string | null;
  pipeline_id: string | null;
  created_at: string;
  updated_at: string;
  score?: number;
  score_factors?: any;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
}

const Leads = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dupReviewOpen, setDupReviewOpen] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [pipelines, setPipelines] = useState<Array<{id: string, name: string}>>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterContactType, setFilterContactType] = useState<string>("all");
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [leadTab, setLeadTab] = useState("leads");
  const [cardSettings, setCardSettings] = useState({
    showEmail: true,
    showPhone: true,
    showValue: true,
    showScore: true,
    showSource: true,
    showDateReceived: false,
    showCompany: true,
    showActivities: true,
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const selectedLeads = leads.filter(l => selectedLeadIds.has(l.id));

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedLeadIds(new Set());
  };

  // Handle showAddLead URL parameter
  useEffect(() => {
    if (searchParams.get('showAddLead') === 'true') {
      setAddLeadOpen(true);
      // Clean up URL
      searchParams.delete('showAddLead');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchPipelines = async () => {
    const { data, error } = await supabase
      .from("pipelines")
      .select("id, name")
      .order("created_at");

    if (error) {
      console.error("Error fetching pipelines:", error);
      return;
    }

    setPipelines(data || []);
    if (data && data.length > 0 && !selectedPipeline) {
      setSelectedPipeline(data[0].id);
    }
  };

  const fetchStages = async () => {
    if (!selectedPipeline) return;

    const { data, error } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("pipeline_id", selectedPipeline)
      .order("position");

    if (error) {
      console.error("Error fetching stages:", error);
      toast({
        title: "Error",
        description: "Failed to load pipeline stages",
        variant: "destructive"
      });
      return;
    }

    setStages(data || []);
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchLeads();
      fetchStages();
    }
  }, [selectedPipeline]);

  useEffect(() => {
    if (!selectedPipeline) return;

    // Set up real-time subscription for leads filtered by pipeline
    const channel = supabase
      .channel(`leads-pipeline-${selectedPipeline}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `pipeline_id=eq.${selectedPipeline}`
        },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads(prev => {
            const exists = prev.some(lead => lead.id === newLead.id);
            if (exists) return prev;
            return [newLead, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          const newLead = payload.new as Lead;
          
          // Only update if lead belongs to current pipeline
          if (newLead.pipeline_id === selectedPipeline) {
            setLeads(prev => {
              const existingIndex = prev.findIndex(lead => lead.id === newLead.id);
              if (existingIndex >= 0) {
                // Update existing lead in place without re-rendering entire list
                const updated = [...prev];
                updated[existingIndex] = newLead;
                return updated;
              } else {
                // Lead was moved to this pipeline
                return [newLead, ...prev];
              }
            });
          } else {
            // Lead moved to different pipeline, remove it
            setLeads(prev => {
              const filtered = prev.filter(lead => lead.id !== newLead.id);
              return filtered.length === prev.length ? prev : filtered;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          setLeads(prev => {
            const filtered = prev.filter(lead => lead.id !== payload.old.id);
            return filtered.length === prev.length ? prev : filtered;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPipeline]);

  const fetchLeads = async () => {
    if (!selectedPipeline) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("pipeline_id", selectedPipeline)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive"
      });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };


  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const leadId = draggableId;
    const newStageId = destination.droppableId;

    const now = new Date().toISOString();

    // Optimistic update
    setLeads(prev =>
      prev.map(lead =>
        lead.id === leadId ? { ...lead, stage_id: newStageId, updated_at: now } : lead
      )
    );

    // Update in database with updated_at timestamp
    const { error } = await supabase
      .from("leads")
      .update({ 
        stage_id: newStageId,
        updated_at: now
      })
      .eq("id", leadId);

    if (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Error",
        description: "Failed to move lead",
        variant: "destructive"
      });
      fetchLeads(); // Revert on error
    } else {
      // Sync to Google Sheets in background
      supabase.functions.invoke('sync-to-sheets', {
        body: { leadId }
      }).catch(err => {
        console.warn('Failed to sync to sheets:', err);
      });

      // Check if lead moved to a "won" stage — send lead-won email
      const targetStage = stages.find(s => s.id === newStageId);
      if (targetStage && targetStage.name.toLowerCase().includes('won')) {
        const movedLead = leads.find(l => l.id === leadId);
        if (movedLead) {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = user ? await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', user.id)
            .maybeSingle() : { data: null };

          // Notify the workspace owner
          if (profile?.email) {
            supabase.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'lead-won',
                recipientEmail: profile.email,
                idempotencyKey: `lead-won-${leadId}-${now}`,
                templateData: {
                  leadName: movedLead.name,
                  dealValue: movedLead.value?.toLocaleString(),
                  closedBy: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
                },
              },
            }).catch(() => {});
          }
        }
      }
    }
  };

  const handleViewDetails = (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      setSelectedLead(lead);
      setSheetOpen(true);
    }
  };

  const handleExportCsv = () => {
    if (!filteredLeads.length) return;

    const csv = Papa.unparse(
      filteredLeads.map((lead) => ({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        source: lead.source || "",
        value: lead.value,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
      }))
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLeads = leads
    .filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           lead.phone?.includes(searchQuery);
      const matchesStage = filterStage === "all" || lead.stage_id === filterStage;
      const matchesType = filterContactType === "all" || (lead as any).contact_type === filterContactType;
      return matchesSearch && matchesStage && matchesType;
    })
    // Deduplicate by email (keep most recent)
    .reduce((acc, lead) => {
      if (!lead.email) {
        acc.push(lead);
        return acc;
      }
      const normalizedEmail = lead.email.toLowerCase().trim();
      const existing = acc.find(l => l.email?.toLowerCase().trim() === normalizedEmail);
      if (!existing) {
        acc.push(lead);
      } else if (new Date(lead.created_at) > new Date(existing.created_at)) {
        // Replace with more recent version
        const index = acc.indexOf(existing);
        acc[index] = lead;
      }
      return acc;
    }, [] as Lead[])
    .sort((a, b) => {
      if (sortBy === "created_at") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortBy === "value") {
        return b.value - a.value;
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  return (
    <>
      <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        <PageHeader
          eyebrow="CRM"
          title="Leads"
          description="Manage your sales pipeline and turn inquiries into customers."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!filteredLeads.length} className="hidden sm:flex">
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLookupOpen(true)} className="hidden sm:flex">
                <Upload className="h-4 w-4 mr-1" />
                Bulk Lookup
              </Button>
              <AddLeadDialog
                onSuccess={fetchLeads}
                externalOpen={addLeadOpen}
                onExternalOpenChange={setAddLeadOpen}
              />
            </>
          }
        />

      <Tabs value={leadTab} onValueChange={setLeadTab} className="w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          {isMobile ? (
            <Select value={leadTab} onValueChange={setLeadTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="pipelines">Pipelines</SelectItem>
                <SelectItem value="bulk-actions">Bulk Actions</SelectItem>
                <SelectItem value="scoring">Lead Scoring</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="w-max">
              <TabsTrigger value="leads" className="text-xs sm:text-sm">Leads</TabsTrigger>
              <TabsTrigger value="pipelines" className="text-xs sm:text-sm">Pipelines</TabsTrigger>
              <TabsTrigger value="bulk-actions" className="text-xs sm:text-sm">Bulk Actions</TabsTrigger>
              <TabsTrigger value="scoring" className="text-xs sm:text-sm">Lead Scoring</TabsTrigger>
            </TabsList>
          )}
          <LeadCardSettings 
            settings={cardSettings} 
            onSettingsChange={setCardSettings} 
          />
        </div>

        <TabsContent value="leads" className="space-y-3 sm:space-y-4">
          {/* Selection Toolbar */}
          {selectionMode && (
            <div className="flex items-center justify-between gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {selectedLeadIds.size} selected
                </Badge>
                <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              </div>
              <Button
                size="sm"
                disabled={selectedLeadIds.size === 0}
                onClick={() => setOutreachOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI Outreach
              </Button>
            </div>
          )}

          {/* Pipeline + View Toggle Row */}
          <div className="flex items-center gap-2">
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[180px]">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map(pipeline => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>{pipeline.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-1">
              {!selectionMode && viewMode === "kanban" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setSelectionMode(true)}
                >
                  <MousePointerClick className="h-4 w-4 mr-1.5" />
                  Select
                </Button>
              )}
              <Button
                variant={viewMode === "kanban" ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={() => { setViewMode("kanban"); }}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Row - Full Width */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          {/* Filters Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterContactType} onValueChange={setFilterContactType}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="prospect">Prospects</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[130px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[130px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Last Updated</SelectItem>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap ml-auto">
              {filteredLeads.length} {isMobile ? '' : 'opportunit' + (filteredLeads.length !== 1 ? 'ies' : 'y')}
            </span>
          </div>

          {loading && leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading...
            </div>
          ) : stages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pipeline stages configured. Go to Pipelines tab to create stages.
            </div>
          ) : leads.length === 0 ? (
            <LiveEmpty
              eyebrow="Pipeline ready"
              title="Your pipeline is set up and listening."
              description="Stages, intake forms, and a public booking link are already wired. The first inquiry will land here automatically — or add one yourself."
              artifacts={[
                { icon: Inbox, label: `${stages.length} pipeline stages`, hint: "Configured and live" },
                { icon: Users, label: "Public booking link", hint: "Share to capture inquiries" },
                { icon: TrendingUp, label: "Conversion tracking", hint: "Activates with first lead" },
              ]}
              primaryAction={{ label: "Add an opportunity", onClick: () => setAddLeadOpen(true) }}
              secondaryAction={{ label: "Bulk import", onClick: () => setLookupOpen(true) }}
            />
          ) : viewMode === "kanban" ? (
            isMobile ? (
              <MobileKanbanBoard
                stages={stages}
                leads={filteredLeads}
                onViewDetails={handleViewDetails}
                onMoveToStage={async (leadId, stageId) => {
                  const now = new Date().toISOString();
                  setLeads(prev =>
                    prev.map(lead =>
                      lead.id === leadId ? { ...lead, stage_id: stageId, updated_at: now } : lead
                    )
                  );
                  const { error } = await supabase
                    .from("leads")
                    .update({ stage_id: stageId, updated_at: now })
                    .eq("id", leadId);
                  if (error) {
                    toast({ title: "Error", description: "Failed to move lead", variant: "destructive" });
                    fetchLeads();
                  }
                }}
                cardSettings={cardSettings}
              />
            ) : (
              <KanbanBoard
                stages={stages}
                leads={filteredLeads}
                onDragEnd={handleDragEnd}
                onViewDetails={handleViewDetails}
                cardSettings={cardSettings}
                selectedLeadIds={selectionMode ? selectedLeadIds : undefined}
                onSelectionChange={selectionMode ? setSelectedLeadIds : undefined}
              />
            )
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No opportunities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => {
                      const stage = stages.find(s => s.id === lead.stage_id);
                      return (
                        <TableRow 
                          key={lead.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewDetails(lead.id)}
                        >
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.company || "-"}</TableCell>
                          <TableCell>{lead.email || "-"}</TableCell>
                          <TableCell>{lead.phone || "-"}</TableCell>
                          <TableCell>
                            {lead.score !== null && lead.score !== undefined ? (
                              <Badge variant={lead.score >= 50 ? "default" : lead.score >= 25 ? "secondary" : "outline"}>
                                {lead.score}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {stage && (
                              <Badge style={{ backgroundColor: stage.color }}>
                                {stage.name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>${lead.value.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(lead.created_at), "MMM dd, yyyy")}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pipelines" className="space-y-4">
          <Card className="surface-glass sheen-top p-4 md:p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">Pipeline management</h3>
              <p className="text-sm text-muted-foreground">Edit stages and routing without leaving the lead workspace.</p>
            </div>
            <PipelineManager stages={stages} pipelineId={selectedPipeline} onUpdate={() => { fetchStages(); fetchLeads(); }} />
          </Card>
        </TabsContent>

        <TabsContent value="bulk-actions">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Bulk Actions</h3>
                <p className="text-sm text-muted-foreground">Perform actions on multiple opportunities at once</p>
              </div>
            </div>
            
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Review Duplicate Leads</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    See exactly which leads we think are duplicates, choose which one to keep, merge them, or mark a group as "keep separate" so it never gets flagged again. All deletions are archived for 45 days.
                  </p>
                  <Button variant="outline" onClick={() => setDupReviewOpen(true)}>
                    Review Duplicates
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Note: A daily automated check runs at 2 AM to detect and recommend duplicate removal.
                  </p>
                </div>
              </div>
            </Card>
            <DuplicateReviewDialog
              open={dupReviewOpen}
              onOpenChange={(o) => { setDupReviewOpen(o); if (!o) fetchLeads(); }}
              table="leads"
            />
          </div>
        </TabsContent>

        <TabsContent value="scoring">
          <LeadScoringConfig />
        </TabsContent>
      </Tabs>
    </div>
      
      <LeadDetailsSheet 
        lead={selectedLead} 
        open={sheetOpen} 
        onOpenChange={setSheetOpen}
        onLeadDeleted={fetchLeads}
        onLeadUpdated={fetchLeads}
      />
      <BulkOutreachDialog
        open={outreachOpen}
        onOpenChange={setOutreachOpen}
        selectedLeads={selectedLeads}
        stageName={stages.find(s => {
          const stageIds = new Set(selectedLeads.map(l => l.stage_id));
          return stageIds.size === 1 && stageIds.has(s.id);
        })?.name}
        onComplete={() => { exitSelectionMode(); fetchLeads(); }}
      />
      <BulkLeadLookupDialog
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        onLeadsAdded={fetchLeads}
      />
    </>
  );
};

export default Leads;
