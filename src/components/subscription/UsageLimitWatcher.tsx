import { useState, useEffect } from "react";
import { useUsageLimitAlert } from "@/hooks/useUsageLimitAlert";
import { UpgradeDialog } from "./UpgradeDialog";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useIsPlatformAdmin } from "@/hooks/useIsAdmin";

const RESOURCE_LABELS: Record<string, string> = {
  leads: "leads",
  workflows: "workflows",
  forms: "forms",
  agents: "AI agents",
  staff: "staff seats",
  pipelines: "pipelines",
};

/**
 * Watches usage limits and auto-shows UpgradeDialog when a limit is hit.
 * Platform admins never see this.
 */
export function UsageLimitWatcher() {
  const { isPlatformAdmin, isLoading: adminLoading } = useIsPlatformAdmin();
  const { data: subscription, isLoading: subLoading } = useSubscriptionTier();
  const alert = useUsageLimitAlert();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("upgrade-dialog-dismissed");
  });

  const ready = !adminLoading && !subLoading;
  const alertKey = alert && subscription
    ? `${subscription.tier}:${alert.resource}:${alert.usage}:${alert.limit}`
    : null;

  useEffect(() => {
    if (ready && !isPlatformAdmin && alert?.limitHit && alertKey && alertKey !== dismissed) {
      setOpen(true);
    }
  }, [ready, isPlatformAdmin, alert?.limitHit, alertKey, dismissed]);

  if (!ready || isPlatformAdmin || !alert || !subscription) return null;

  const label = RESOURCE_LABELS[alert.resource] || alert.resource;
  const over = alert.usage - alert.limit;
  const message =
    over > 0
      ? `You're ${over} ${label} over your ${subscription.tier} plan limit (${alert.usage} used of ${alert.limit} included).`
      : over === 0
        ? `You've used all ${alert.limit} ${label} included in your ${subscription.tier} plan.`
        : `You're approaching your ${label} limit (${alert.usage} of ${alert.limit} used on ${subscription.tier}).`;

  return (
    <UpgradeDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v && alertKey) {
          setDismissed(alertKey);
          window.localStorage.setItem("upgrade-dialog-dismissed", alertKey);
        }
      }}
      currentTier={subscription.tier}
      limitHit={message}
    />
  );
}

