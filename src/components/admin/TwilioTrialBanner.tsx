import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useIsPlatformAdmin } from "@/hooks/useIsAdmin";

interface TwilioStatus {
  configured?: boolean;
  type?: string;
  is_trial?: boolean;
  confirmed_upgraded?: boolean;
  friendly_name?: string;
  status?: string;
  checked_at?: string;
  error?: string;
}

/**
 * Admin-only banner that surfaces Twilio trial-mode state.
 * - Shows a destructive warning when Twilio is in Trial AND not confirmed upgraded.
 * - Lets the admin re-check live status or mark as upgraded after upgrading in Twilio.
 * - Voicemail drop edge function reads the same flag and blocks sends while in trial.
 */
export function TwilioTrialBanner({ compact = false }: { compact?: boolean }) {
  const { isPlatformAdmin } = useIsPlatformAdmin();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["twilio-account-status"],
    enabled: !!isPlatformAdmin,
    queryFn: async (): Promise<TwilioStatus | null> => {
      const { data, error } = await supabase.functions.invoke("twilio-account-status", {
        body: { action: "check" },
      });
      if (error) throw error;
      return data as TwilioStatus;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("twilio-account-status", {
        body: { action: "confirm_upgraded" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Twilio confirmed as upgraded. Voicemail drops re-enabled.");
      qc.invalidateQueries({ queryKey: ["twilio-account-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isPlatformAdmin) return null;
  if (isLoading || !data) return null;

  // No creds configured — silent (nothing to warn about).
  if (data.configured === false) return null;

  const isBlocked = data.is_trial === true && data.confirmed_upgraded !== true;
  const isHealthy = data.is_trial === false || data.confirmed_upgraded === true;

  if (isHealthy && compact) return null;

  if (isHealthy) {
    return (
      <Alert className="border-emerald-600/40 bg-emerald-600/5">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="flex items-center gap-2">
          Twilio: Production ready
          <Badge variant="outline" className="text-[10px]">{data.type || "Full"}</Badge>
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {data.friendly_name ? `${data.friendly_name} · ` : ""}Voicemail drops enabled.
          </span>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2 flex-wrap">
        Twilio is in Trial mode — voicemail drops are blocked
        <Badge variant="outline" className="text-[10px] border-destructive/50">
          {data.type || "Trial"}
        </Badge>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-xs">
          Trial accounts intercept calls with a "press any key" prompt, which breaks automated voicemail
          drops and can cause failed call charges. Upgrade your Twilio account, then confirm below to
          re-enable drops platform-wide.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            asChild
            className="bg-background"
          >
            <a href="https://console.twilio.com/us1/billing/manage-billing/upgrade" target="_blank" rel="noreferrer">
              Upgrade Twilio <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-background"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Re-check
          </Button>
          <Button
            size="sm"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? "Confirming..." : "I've upgraded — unblock drops"}
          </Button>
        </div>
        {data.error && (
          <p className="text-[11px] opacity-70">Last check note: {data.error}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
