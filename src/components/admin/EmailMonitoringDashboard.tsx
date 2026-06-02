import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type TimeRange = "24h" | "7d" | "30d";

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  pending: "bg-amber-500/10 text-amber-700 border-amber-300",
  dlq: "bg-red-500/10 text-red-700 border-red-300",
  failed: "bg-red-500/10 text-red-700 border-red-300",
  suppressed: "bg-orange-500/10 text-orange-700 border-orange-300",
  bounced: "bg-red-500/10 text-red-700 border-red-300",
  complained: "bg-red-500/10 text-red-700 border-red-300",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  sent: CheckCircle,
  pending: Clock,
  dlq: XCircle,
  failed: XCircle,
  suppressed: AlertTriangle,
};

export function EmailMonitoringDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");

  const getStartDate = (range: TimeRange) => {
    const now = new Date();
    switch (range) {
      case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['email-stats', timeRange],
    queryFn: async () => {
      const startDate = getStartDate(timeRange).toISOString();

      // Get all logs in range — we deduplicate client-side by message_id
      const { data: logs, error } = await supabase
        .from('email_send_log')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Deduplicate by message_id (keep latest)
      const latestByMessageId = new Map<string, any>();
      for (const log of (logs || [])) {
        const key = log.message_id || log.id;
        if (!latestByMessageId.has(key) || new Date(log.created_at) > new Date(latestByMessageId.get(key).created_at)) {
          latestByMessageId.set(key, log);
        }
      }

      const deduped = Array.from(latestByMessageId.values());
      const statusCounts: Record<string, number> = {};
      const templateNames = new Set<string>();

      for (const log of deduped) {
        statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
        templateNames.add(log.template_name);
      }

      return {
        total: deduped.length,
        sent: statusCounts['sent'] || 0,
        failed: (statusCounts['dlq'] || 0) + (statusCounts['failed'] || 0),
        suppressed: statusCounts['suppressed'] || 0,
        pending: statusCounts['pending'] || 0,
        bounced: statusCounts['bounced'] || 0,
        templateNames: Array.from(templateNames).sort(),
        logs: deduped,
      };
    },
  });

  const filteredLogs = (stats?.logs || []).filter(log => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (templateFilter !== "all" && log.template_name !== templateFilter) return false;
    return true;
  }).slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Monitoring</h2>
          <p className="text-muted-foreground">Track delivery, failures, and suppression</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Time range */}
      <div className="flex gap-2">
        {(["24h", "7d", "30d"] as const).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range === "24h" ? "Last 24h" : range === "7d" ? "Last 7 days" : "Last 30 days"}
          </Button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{stats?.sent ?? 0}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <XCircle className="h-6 w-6 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{stats?.failed ?? 0}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{stats?.suppressed ?? 0}</p>
            <p className="text-xs text-muted-foreground">Suppressed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{stats?.pending ?? 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="dlq">Failed (DLQ)</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            {(stats?.templateNames || []).map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No emails found for this period
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = STATUS_ICONS[log.status] || Clock;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">{log.template_name}</TableCell>
                      <TableCell className="text-sm">{log.recipient_email}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[log.status] || ''} border text-xs`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {log.error_message || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
