import { AlertTriangle, Clock, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useIsPlatformAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SubscriptionBanner() {
  const { data: subscription, isLoading: subLoading } = useSubscriptionTier();
  const { isPlatformAdmin, isLoading: adminLoading } = useIsPlatformAdmin();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Wait for both checks to finish before deciding what to show
  if (dismissed || subLoading || adminLoading || !subscription || isPlatformAdmin) return null;

  const { source, subscriptionEnd } = subscription;

  // Past due - payment failed
  if (source === 'stripe_past_due') {
    return (
      <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            Payment failed — please update your payment method to avoid losing access.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={async () => {
              setLoading(true);
              try {
                const { data, error } = await supabase.functions.invoke('customer-portal');
                if (error) throw error;
                  if (data?.url) window.location.href = data.url;
              } catch {
                toast.error("Failed to open billing portal");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Update Payment
          </Button>
          <button onClick={() => setDismissed(true)} className="text-destructive/70 hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Trial active — always show countdown (also handle null source with active trial)
  if ((source === 'stripe_trial' || (subscription.isActive && subscription.trialDaysRemaining !== null)) && subscriptionEnd) {
    const daysLeft = Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      const isUrgent = daysLeft <= 3;
      return (
        <div className={cn(
          "px-4 py-3 flex items-center justify-between",
          isUrgent 
            ? "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400"
            : "bg-primary/5 border border-primary/20 text-primary"
        )}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              {isUrgent
                ? `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Add a payment method to continue uninterrupted.`
                : `Free trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isUrgent && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('customer-portal');
                    if (error) throw error;
                    if (data?.url) window.location.href = data.url;
                  } catch {
                    toast.error("Failed to open billing portal");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                Add Payment Method
              </Button>
            )}
            <button onClick={() => setDismissed(true)} className={cn(
              isUrgent ? "text-amber-500/70 hover:text-amber-700" : "text-primary/50 hover:text-primary"
            )}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }
  }
  return null;
}
