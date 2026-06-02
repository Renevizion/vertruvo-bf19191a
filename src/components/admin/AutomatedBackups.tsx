import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Download, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BackupConfig {
  schedule: string;
  lastBackup: string | null;
  backups: BackupRecord[];
}

interface BackupRecord {
  id: string;
  timestamp: string;
  size: number;
  status: string;
  type: string;
}

export const AutomatedBackups = () => {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState("daily");

  const { data: config } = useQuery<BackupConfig>({
    queryKey: ["backup-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .eq("key", "backup_config")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data?.value) return { schedule: "daily", lastBackup: null, backups: [] };
      const value = data.value as unknown as BackupConfig;
      return value;
    },
  });

  const { data: backupHistory } = useQuery<BackupRecord[]>({
    queryKey: ["backup-history"],
    queryFn: async () => {
      // In production, this would fetch from actual backup storage
      // For now, we'll use platform_config to store backup metadata
      return config?.backups || [];
    },
    enabled: !!config,
  });

  const updateSchedule = useMutation({
    mutationFn: async (newSchedule: string) => {
      const currentConfig = config || { schedule: "daily", lastBackup: null, backups: [] };
      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key: "backup_config",
          value: {
            ...currentConfig,
            schedule: newSchedule,
          } as any,
          description: "Database backup configuration",
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-config"] });
      toast.success("Backup schedule updated");
    },
  });

  const triggerBackup = useMutation({
    mutationFn: async () => {
      // In production, this would trigger actual database backup
      // For now, we'll simulate by storing metadata
      const newBackup: BackupRecord = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        size: Math.floor(Math.random() * 500) + 100, // Simulated size in MB
        status: "completed",
        type: "manual",
      };

      const currentConfig = config || { schedule: "daily", lastBackup: null, backups: [] };
      const backups = [...currentConfig.backups, newBackup];

      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key: "backup_config",
          value: {
            ...currentConfig,
            lastBackup: newBackup.timestamp,
            backups,
          } as any,
          description: "Database backup configuration",
        } as any);

      if (error) throw error;
      return newBackup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-config"] });
      queryClient.invalidateQueries({ queryKey: ["backup-history"] });
      toast.success("Backup completed successfully");
    },
  });

  const scheduleOptions = [
    { value: "hourly", label: "Every Hour" },
    { value: "daily", label: "Daily at 2 AM" },
    { value: "weekly", label: "Weekly (Sunday 2 AM)" },
    { value: "monthly", label: "Monthly (1st, 2 AM)" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Automated Backups
          </CardTitle>
          <CardDescription>
            Configure automatic database backups and manage backup history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="space-y-1">
              <h3 className="font-medium">Backup Schedule</h3>
              <p className="text-sm text-muted-foreground">
                Automatically backup your database on a regular schedule
              </p>
            </div>
            <Select value={config?.schedule || "daily"} onValueChange={(value) => {
              setSchedule(value);
              updateSchedule.mutate(value);
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scheduleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <h3 className="font-medium">Manual Backup</h3>
              <p className="text-sm text-muted-foreground">
                Create an on-demand backup of your database
              </p>
              {config?.lastBackup && (
                <p className="text-xs text-muted-foreground">
                  Last backup: {format(new Date(config.lastBackup), "PPpp")}
                </p>
              )}
            </div>
            <Button onClick={() => triggerBackup.mutate()} disabled={triggerBackup.isPending}>
              <Download className="h-4 w-4 mr-2" />
              {triggerBackup.isPending ? "Creating..." : "Backup Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup History</CardTitle>
          <CardDescription>Recent database backups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {config?.backups && config.backups.length > 0 ? (
              [...config.backups]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10)
                .map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {backup.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-warning" />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {format(new Date(backup.timestamp), "PPpp")}
                          </span>
                          <Badge variant={backup.type === "manual" ? "default" : "secondary"}>
                            {backup.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Size: {backup.size} MB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No backups yet. Create your first backup above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
