import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseActivityDescription } from "@/lib/activity-format";

export const AuditLogsViewer = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", searchTerm, entityFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(200);

      if (entityFilter !== "all") {
        query = query.eq("entity", entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = logs?.filter((log) =>
    Object.values(log).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getActionColor = (action: string) => {
    if (action.includes("create")) return "default";
    if (action.includes("update")) return "secondary";
    if (action.includes("delete") || action.includes("error")) return "destructive";
    return "outline";
  };

  const formatDetail = (obj: any): string => {
    if (!obj) return "—";
    if (typeof obj === "string") return obj;
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  /** Render an audit value as a friendly summary instead of raw JSON. */
  const renderFriendly = (label: string, value: any) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      const parsed = parseActivityDescription(value);
      const hasRich = parsed && (parsed.summary !== value || parsed.details);
      return (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          {hasRich ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
              <p className="font-medium">{parsed.summary}</p>
              {parsed.details && Object.keys(parsed.details).length > 0 && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {Object.entries(parsed.details).map(([k, v]) => (
                    <div key={k} className="contents">
                      <span className="text-muted-foreground capitalize">{k}</span>
                      <span className="font-medium break-all">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm break-words">{value}</p>
          )}
        </div>
      );
    }
    // Object/array → friendly key-value list, with raw JSON behind a disclosure
    const obj = value as Record<string, any>;
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) {
      return (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-sm text-muted-foreground italic">No changes</p>
        </div>
      );
    }
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[120px_1fr] gap-2 text-xs">
              <span className="text-muted-foreground capitalize truncate">{k.replace(/_/g, " ")}</span>
              <span className="font-medium break-all">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
        <details className="mt-1.5">
          <summary className="text-[10px] text-muted-foreground hover:underline cursor-pointer">
            Show raw JSON
          </summary>
          <pre className="bg-muted p-2 mt-1 rounded text-[10px] overflow-auto whitespace-pre-wrap break-all max-h-48">
            {JSON.stringify(obj, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  const getSummary = (log: any): string => {
    const meta = log.metadata;
    const changes = log.changes;

    if (typeof changes === "string") {
      const parsed = parseActivityDescription(changes);
      if (parsed?.summary) return parsed.summary.slice(0, 80);
    }
    if (meta && typeof meta === "object") {
      if (meta.error) return String(meta.error).slice(0, 80);
      if (meta.message) return String(meta.message).slice(0, 80);
      if (meta.reason) return String(meta.reason).slice(0, 80);
    }
    if (changes && typeof changes === "object") {
      if (changes.error) return String(changes.error).slice(0, 80);
      if (changes.message) return String(changes.message).slice(0, 80);
      // Build a short readable summary from object keys
      const keys = Object.keys(changes).slice(0, 3);
      if (keys.length > 0) {
        return keys.map(k => `${k.replace(/_/g, " ")}`).join(", ");
      }
    }
    return "—";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="system_error">System Errors</SelectItem>
              <SelectItem value="workflow">Workflows</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
              <SelectItem value="contact">Contacts</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="webhook">Webhooks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                    <TableCell className="font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                      {getSummary(log)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant={getActionColor(selectedLog?.action || "")}>
                {selectedLog?.action}
              </Badge>
              <span className="text-sm font-normal text-muted-foreground">
                {selectedLog?.entity}
              </span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Timestamp</p>
                <p className="font-mono text-xs">{selectedLog && new Date(selectedLog.timestamp).toLocaleString()}</p>
              </div>
              {selectedLog?.entity_id && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Entity ID</p>
                  <p className="font-mono text-xs break-all">{selectedLog.entity_id}</p>
                </div>
              )}
              {selectedLog?.user_id && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">User ID</p>
                  <p className="font-mono text-xs break-all">{selectedLog.user_id}</p>
                </div>
              )}
              {selectedLog?.ip_address && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">IP Address</p>
                  <p className="font-mono text-xs">{selectedLog.ip_address}</p>
                </div>
              )}
              {selectedLog?.changes && renderFriendly("Changes / Event", selectedLog.changes)}
              {selectedLog?.metadata && renderFriendly("Metadata", selectedLog.metadata)}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
};