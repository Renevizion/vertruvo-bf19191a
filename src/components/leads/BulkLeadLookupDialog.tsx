import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, UserPlus, Loader2, CheckCircle2, XCircle, Users, Upload } from "lucide-react";

interface LookupResult {
  query: string;
  found: boolean;
  matchType?: "email" | "phone" | "name";
  lead?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    source?: string;
    stage_name?: string;
  };
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  isCustomer?: boolean;
}

interface BulkLeadLookupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadsAdded?: () => void;
}

export function BulkLeadLookupDialog({ open, onOpenChange, onLeadsAdded }: BulkLeadLookupDialogProps) {
  const [rawInput, setRawInput] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"input" | "results">("input");

  const parseInput = (input: string): string[] => {
    // Split by newlines, commas, or tabs — trim each entry
    return input
      .split(/[\n,\t]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const detectType = (query: string): "email" | "phone" | "name" => {
    if (query.includes("@")) return "email";
    // Phone: mostly digits, possibly with +, -, (, ), spaces
    const digitsOnly = query.replace(/[\s\-\(\)\+\.]/g, "");
    if (digitsOnly.length >= 7 && /^\d+$/.test(digitsOnly)) return "phone";
    return "name";
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/[\s\-\(\)\+\.]/g, "");
  };

  const handleSearch = async () => {
    const queries = parseInput(rawInput);
    if (queries.length === 0) {
      toast.error("Please paste at least one name, email, or phone number");
      return;
    }
    if (queries.length > 500) {
      toast.error("Please limit to 500 entries at a time");
      return;
    }

    setSearching(true);
    try {
      // Get user's workspace
      const { data: profile } = await supabase.from("profiles").select("id").single();
      if (!profile) throw new Error("Not authenticated");

      const { data: wsMember } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", profile.id)
        .single();
      if (!wsMember) throw new Error("No workspace found");

      const workspaceId = wsMember.workspace_id;

      // Fetch leads and contacts for this workspace
      const [leadsRes, contactsRes, stagesRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, name, email, phone, source, stage_id, stripe_customer_id")
          .eq("workspace_id", workspaceId),
        supabase
          .from("contacts")
          .select("id, name, email, phone")
          .eq("workspace_id", workspaceId),
        supabase
          .from("pipeline_stages")
          .select("id, name"),
      ]);

      const leads = leadsRes.data || [];
      const contacts = contactsRes.data || [];
      const stages = stagesRes.data || [];

      const stageMap = new Map(stages.map(s => [s.id, s.name]));

      // Build lookup indexes for fast matching
      const leadsByEmail = new Map<string, typeof leads[0]>();
      const leadsByPhone = new Map<string, typeof leads[0]>();
      const leadsByNameLower = new Map<string, typeof leads[0]>();
      
      for (const lead of leads) {
        if (lead.email) leadsByEmail.set(lead.email.toLowerCase(), lead);
        if (lead.phone) leadsByPhone.set(normalizePhone(lead.phone), lead);
        leadsByNameLower.set(lead.name.toLowerCase(), lead);
      }

      const contactsByEmail = new Map<string, typeof contacts[0]>();
      const contactsByPhone = new Map<string, typeof contacts[0]>();
      const contactsByNameLower = new Map<string, typeof contacts[0]>();

      for (const c of contacts) {
        if (c.email) contactsByEmail.set(c.email.toLowerCase(), c);
        if (c.phone) contactsByPhone.set(normalizePhone(c.phone), c);
        contactsByNameLower.set(c.name.toLowerCase(), c);
      }

      // Match each query
      const lookupResults: LookupResult[] = queries.map(query => {
        const type = detectType(query);
        let matchedLead: typeof leads[0] | undefined;
        let matchedContact: typeof contacts[0] | undefined;

        if (type === "email") {
          const normalized = query.toLowerCase();
          matchedLead = leadsByEmail.get(normalized);
          matchedContact = contactsByEmail.get(normalized);
        } else if (type === "phone") {
          const normalized = normalizePhone(query);
          matchedLead = leadsByPhone.get(normalized);
          matchedContact = contactsByPhone.get(normalized);
        } else {
          const normalized = query.toLowerCase();
          matchedLead = leadsByNameLower.get(normalized);
          matchedContact = contactsByNameLower.get(normalized);
        }

        const found = !!matchedLead || !!matchedContact;

        return {
          query,
          found,
          matchType: type,
          lead: matchedLead ? {
            id: matchedLead.id,
            name: matchedLead.name,
            email: matchedLead.email || undefined,
            phone: matchedLead.phone || undefined,
            source: matchedLead.source || undefined,
            stage_name: matchedLead.stage_id ? stageMap.get(matchedLead.stage_id) || undefined : undefined,
          } : undefined,
          contact: matchedContact ? {
            id: matchedContact.id,
            name: matchedContact.name,
            email: matchedContact.email || undefined,
            phone: matchedContact.phone || undefined,
          } : undefined,
          isCustomer: matchedLead ? !!matchedLead.stripe_customer_id : false,
        };
      });

      setResults(lookupResults);
      setStep("results");

      // Auto-select all not-found for potential adding
      const notFound = new Set(lookupResults.filter(r => !r.found).map(r => r.query));
      setSelectedToAdd(notFound);

    } catch (error) {
      console.error("Lookup error:", error);
      toast.error("Failed to search database");
    } finally {
      setSearching(false);
    }
  };

  const handleAddSelected = async () => {
    if (selectedToAdd.size === 0) return;
    
    setAdding(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("id").single();
      if (!profile) throw new Error("Not authenticated");

      const { data: wsMember } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", profile.id)
        .single();
      if (!wsMember) throw new Error("No workspace found");

      // Get default pipeline and first stage
      const { data: pipeline } = await supabase
        .from("pipelines")
        .select("id")
        .eq("workspace_id", wsMember.workspace_id)
        .order("created_at")
        .limit(1)
        .single();

      let stageId: string | null = null;
      if (pipeline) {
        const { data: stage } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("pipeline_id", pipeline.id)
          .order("position")
          .limit(1)
          .single();
        stageId = stage?.id || null;
      }

      const notFoundResults = results.filter(r => !r.found && selectedToAdd.has(r.query));
      
      const leadsToInsert = notFoundResults.map(r => {
        const type = detectType(r.query);
        return {
          name: type === "name" ? r.query : r.query,
          email: type === "email" ? r.query : null,
          phone: type === "phone" ? r.query : null,
          source: "Bulk Import",
          value: 0,
          workspace_id: wsMember.workspace_id,
          pipeline_id: pipeline?.id || null,
          stage_id: stageId,
        };
      });

      const { error } = await supabase.from("leads").insert(leadsToInsert);
      if (error) throw error;

      toast.success(`${leadsToInsert.length} lead(s) added to your database`);
      onLeadsAdded?.();
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error("Error adding leads:", error);
      toast.error("Failed to add leads");
    } finally {
      setAdding(false);
    }
  };

  const resetState = () => {
    setRawInput("");
    setResults([]);
    setStep("input");
    setSelectedToAdd(new Set());
  };

  const foundCount = results.filter(r => r.found).length;
  const notFoundCount = results.filter(r => !r.found).length;
  const customerCount = results.filter(r => r.isCustomer).length;

  const toggleSelection = (query: string) => {
    setSelectedToAdd(prev => {
      const next = new Set(prev);
      if (next.has(query)) next.delete(query);
      else next.add(query);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Bulk Lead Lookup
          </DialogTitle>
          <DialogDescription>
            Paste a list of names, emails, or phone numbers to check if they exist in your database.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <Textarea
              placeholder={"Paste names, emails, or phone numbers here...\n\nExamples:\njohn@example.com\n(555) 123-4567\nJane Doe\n\nSeparate entries with new lines, commas, or tabs."}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {parseInput(rawInput).length} entries detected • Max 500
              </p>
              <Button onClick={handleSearch} disabled={searching || !rawInput.trim()}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search Database
              </Button>
            </div>
          </div>
        )}

        {step === "results" && (
          <div className="flex flex-col gap-4 min-h-0 flex-1">
            {/* Summary */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {foundCount} found
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                {notFoundCount} not found
              </Badge>
              {customerCount > 0 && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Users className="h-3 w-3 mr-1" />
                  {customerCount} customers
                </Badge>
              )}
            </div>

            {/* Results list */}
            <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
              <div className="space-y-1.5 pr-3">
                {results.map((result, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${
                      result.found
                        ? "bg-green-500/5 border-green-200/50"
                        : "bg-red-500/5 border-red-200/50"
                    }`}
                  >
                    {!result.found && (
                      <Checkbox
                        checked={selectedToAdd.has(result.query)}
                        onCheckedChange={() => toggleSelection(result.query)}
                        className="flex-shrink-0"
                      />
                    )}
                    
                    <div className="flex-shrink-0">
                      {result.found ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.query}</p>
                      {result.found && result.lead && (
                        <p className="text-xs text-muted-foreground truncate">
                          Lead: {result.lead.name}
                          {result.lead.stage_name && ` • ${result.lead.stage_name}`}
                          {result.lead.source && ` • Source: ${result.lead.source}`}
                        </p>
                      )}
                      {result.found && !result.lead && result.contact && (
                        <p className="text-xs text-muted-foreground truncate">
                          Contact: {result.contact.name}
                        </p>
                      )}
                    </div>

                    {result.isCustomer && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">Customer</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => { setStep("input"); setResults([]); }}>
                ← Back
              </Button>
              <div className="flex items-center gap-2">
                {notFoundCount > 0 && (
                  <Button
                    onClick={handleAddSelected}
                    disabled={adding || selectedToAdd.size === 0}
                    size="sm"
                  >
                    {adding ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-1" />
                    )}
                    Add {selectedToAdd.size} as Leads
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
