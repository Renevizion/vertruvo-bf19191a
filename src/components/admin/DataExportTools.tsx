import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileJson, FileSpreadsheet, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const DataExportTools = () => {
  const [exportType, setExportType] = useState<string>("audit_logs");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const exportOptions = [
    { value: "audit_logs", label: "Audit Logs", table: "audit_logs" },
    { value: "workflows", label: "All Workflows", table: "workflows" },
    { value: "workflow_runs", label: "Workflow Runs", table: "workflow_runs" },
    { value: "users", label: "User Accounts", table: "profiles" },
    { value: "workspaces", label: "Workspaces", table: "workspaces" },
    { value: "system_metrics", label: "System Metrics", table: "system_metrics" },
    { value: "webhook_logs", label: "Webhook Logs", table: "webhook_logs" },
  ];

  const exportData = async () => {
    try {
      const option = exportOptions.find((o) => o.value === exportType);
      if (!option) return;

      let query: any = supabase.from(option.table as "audit_logs").select("*");

      // Apply date filters if set
      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No data found for the selected criteria");
        return;
      }

      // Generate filename
      const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
      const filename = `${exportType}_${timestamp}.${exportFormat}`;

      if (exportFormat === "json") {
        // Export as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        downloadBlob(blob, filename);
      } else {
        // Export as CSV
        const csv = convertToCSV(data);
        const blob = new Blob([csv], { type: "text/csv" });
        downloadBlob(blob, filename);
      }

      toast.success(`Exported ${data.length} records successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data: " + (error as Error).message);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(","));

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        // Handle nested objects and arrays
        const escaped =
          typeof value === "object"
            ? JSON.stringify(value).replace(/"/g, '""')
            : String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Data Export & Backup
        </CardTitle>
        <CardDescription>
          Export system data for compliance, reporting, and backups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="export-type">Data Type</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger id="export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exportOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-format">Format</Label>
            <Select
              value={exportFormat}
              onValueChange={(value: "csv" | "json") => setExportFormat(value)}
            >
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button onClick={exportData} className="w-full" size="lg">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-semibold text-sm">Export Information</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• CSV format is best for spreadsheet applications</li>
            <li>• JSON format preserves nested data structures</li>
            <li>• Date filters are optional - leave blank to export all data</li>
            <li>• Large exports may take a few moments to process</li>
            <li>• Exported files are downloaded directly to your device</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
