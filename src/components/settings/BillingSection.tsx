import { useState } from "react";
import { useNavigate } from 'react-router-dom';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, Loader2, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { supabase } from "@/integrations/supabase/client";

export function BillingSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: subscription, isLoading } = useSubscriptionTier();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open subscription management",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const statusBadge = () => {
    if (!subscription) return null;
    const { source, status } = subscription;
    if (source === 'stripe_past_due') return <Badge variant="destructive">Payment Failed</Badge>;
    if (source === 'stripe_trial') return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Trial</Badge>;
    if (source === 'admin_override') return <Badge variant="outline" className="bg-purple-500/10 text-purple-600">Granted</Badge>;
    if (subscription.isActive) return <Badge variant="outline" className="bg-green-500/10 text-green-600">Active</Badge>;
    return <Badge variant="secondary">Free</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">Subscription</h3>
              {statusBadge()}
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading subscription...
              </div>
            ) : subscription?.isActive ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Crown className="h-4 w-4 text-primary" />
                      {subscription.planName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {subscription.source === 'stripe_trial' ? 'Trial Ends' : 'Next Billing'}
                    </p>
                    <p className="font-semibold">
                      {subscription.subscriptionEnd
                        ? new Date(subscription.subscriptionEnd).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  {subscription.trialDaysRemaining !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground">Trial Days Left</p>
                      <p className="font-semibold">{subscription.trialDaysRemaining} days</p>
                    </div>
                  )}
                  {subscription.cancelAtPeriodEnd && (
                    <div className="col-span-2">
                      <Badge variant="destructive">Cancels at period end</Badge>
                    </div>
                  )}
                </div>

                {subscription.source !== 'admin_override' && (
                  <Button onClick={handleManageSubscription} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                    Manage Subscription
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You're on the Free plan. Upgrade to unlock more features, higher limits, and priority support.
                </p>
                <Button onClick={() => navigate('/pricing')}>
                  <Crown className="h-4 w-4 mr-2" />
                  View Plans
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {subscription?.source === 'stripe_past_due' && (
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <h4 className="font-medium text-destructive mb-2">⚠️ Payment Issue</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Your last payment failed. Please update your payment method to avoid losing access to your plan features.
          </p>
          <Button variant="destructive" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            Update Payment Method
          </Button>
        </Card>
      )}
    </div>
  );
}
