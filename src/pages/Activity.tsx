import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from "@tanstack/react-virtual";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle2, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar,
  Search,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { parseActivityDescription } from "@/lib/activity-format";

interface Activity {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  created_at: string;
  lead_id: string | null;
  contact_id: string | null;
}

interface Lead {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  name: string;
}

const ActivityDescriptionBlock = ({ description }: { description: string }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const parsed = parseActivityDescription(description);
  if (!parsed) return null;

  const hasDetails = parsed.details && Object.keys(parsed.details).length > 0;
  const hasEmailBody = !!parsed.emailBody;

  return (
    <div className="mt-1 space-y-1">
      <p className="text-sm text-muted-foreground">{parsed.summary}</p>
      {hasEmailBody && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setShowEmail(!showEmail); }}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <Mail className="h-3 w-3" />
            {showEmail ? 'Hide message' : 'View sent message'}
          </button>
          {showEmail && (
            <div className="border rounded-lg p-3 mt-1 bg-muted/30 text-sm whitespace-pre-wrap">
              {parsed.emailBody}
            </div>
          )}
        </>
      )}
      {hasDetails && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Hide details' : 'View details'}
          </button>
          {expanded && parsed.details && (
            <div className="border rounded-lg divide-y mt-1 text-sm">
              {Object.entries(parsed.details).map(([key, value]) => (
                <div key={key} className="flex gap-4 p-2">
                  <span className="text-muted-foreground min-w-[100px] capitalize text-xs">{key}</span>
                  <span className="text-xs font-medium flex-1 break-all">{value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Activity = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showOrphaned, setShowOrphaned] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [activitiesResult, leadsResult, contactsResult] = await Promise.all([
      supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("leads")
        .select("id, name"),
      supabase
        .from("contacts")
        .select("id, name")
    ]);

    if (activitiesResult.data) setActivities(activitiesResult.data);
    if (leadsResult.data) setLeads(leadsResult.data);
    if (contactsResult.data) setContacts(contactsResult.data);
    
    setLoading(false);
  };

  const getEntityName = (activity: Activity) => {
    if (activity.lead_id) {
      const lead = leads.find(l => l.id === activity.lead_id);
      return lead?.name || "Unknown Lead";
    }
    if (activity.contact_id) {
      const contact = contacts.find(c => c.id === activity.contact_id);
      return contact?.name || "Unknown Contact";
    }
    return "System";
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return Phone;
      case "email": return Mail;
      case "meeting": return Calendar;
      case "note": return MessageSquare;
      case "deal_closed": return CheckCircle2;
      default: return FileText;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "deal_closed": return "bg-green-100 dark:bg-green-900/20";
      case "call": return "bg-blue-100 dark:bg-blue-900/20";
      case "email": return "bg-purple-100 dark:bg-purple-900/20";
      case "meeting": return "bg-indigo-100 dark:bg-indigo-900/20";
      case "note": return "bg-orange-100 dark:bg-orange-900/20";
      default: return "bg-muted";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "deal_closed": return "text-green-600";
      case "call": return "text-blue-600";
      case "email": return "text-purple-600";
      case "meeting": return "text-indigo-600";
      case "note": return "text-orange-600";
      default: return "text-muted-foreground";
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getEntityName(activity).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || activity.type === typeFilter;
    const isOrphaned = !activity.lead_id && !activity.contact_id;
    const matchesOrphanFilter = showOrphaned ? isOrphaned : true;
    return matchesSearch && matchesType && matchesOrphanFilter;
  });

  const rowVirtualizer = useVirtualizer({
    count: filteredActivities.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 88,
    overscan: 10,
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Reporting" title="Activity Timeline" description="Every recorded touch across your workspace — calls, emails, notes, form submissions." />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="call">Calls</SelectItem>
            <SelectItem value="email">Emails</SelectItem>
            <SelectItem value="meeting">Meetings</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
            <SelectItem value="deal_closed">Deals</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showOrphaned ? "default" : "outline"}
          size="sm"
          onClick={() => setShowOrphaned(!showOrphaned)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showOrphaned ? "Showing Orphaned" : "Show Orphaned"}
        </Button>
        <div className="text-sm text-muted-foreground">
          {filteredActivities.length} activit{filteredActivities.length !== 1 ? 'ies' : 'y'}
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted/50 animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-muted/50 animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activities found</p>
            </div>
          ) : (
            <div
              ref={listRef}
              className="overflow-auto"
              style={{ maxHeight: "calc(100vh - 320px)" }}
            >
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const activity = filteredActivities[virtualItem.index];
                  const Icon = getActivityIcon(activity.type);
                  const linkTo = activity.lead_id ? `/leads` : activity.contact_id ? `/contacts/${activity.contact_id}` : "/activity";
                  return (
                    <div
                      key={activity.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      onClick={() => navigate(linkTo)}
                      className="flex gap-4 items-start hover:bg-accent p-2 -mx-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                        <Icon className={`w-5 h-5 ${getIconColor(activity.type)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium">
                              {activity.title || activity.type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getEntityName(activity)}
                            </p>
                            {activity.description && (
                              <ActivityDescriptionBlock description={activity.description} />
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="outline" className="capitalize">
                              {activity.type.replace('_', ' ')}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(activity.created_at), "MMM dd, yyyy")}
                              <br />
                              {format(new Date(activity.created_at), "hh:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Activity;
