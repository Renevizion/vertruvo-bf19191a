import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

interface SubscriptionInfo {
  tier: SubscriptionTier;
  isActive: boolean;
  planName: string | null;
  subscriptionEnd: string | null;
  source: string | null;
  status: string | null;
  trialDaysRemaining: number | null;
  cancelAtPeriodEnd: boolean;
}

// Map Stripe product IDs to tiers
const PRODUCT_TO_TIER: Record<string, SubscriptionTier> = {
  "prod_TWJsiTC1NjHYNA": "starter",
  "prod_TWJtzGu8NtKoOR": "professional",
  "prod_TWJuL45k95WeVZ": "enterprise",
};

export const useSubscriptionTier = () => {
  return useQuery({
    queryKey: ['subscription-tier'],
    queryFn: async (): Promise<SubscriptionInfo> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { tier: 'free', isActive: false, planName: null, subscriptionEnd: null, source: null, status: null, trialDaysRemaining: null, cancelAtPeriodEnd: false };

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error || !data) {
        console.error('Subscription check failed:', error);
        return { tier: 'free', isActive: false, planName: null, subscriptionEnd: null, source: null, status: null, trialDaysRemaining: null, cancelAtPeriodEnd: false };
      }

      if (!data.subscribed && data.source !== 'stripe_past_due') {
        return { tier: 'free', isActive: false, planName: null, subscriptionEnd: null, source: data.source, status: data.status, trialDaysRemaining: null, cancelAtPeriodEnd: false };
      }

      const tier = data.tier as SubscriptionTier || PRODUCT_TO_TIER[data.product_id] || 'free';
      const planName = tier.charAt(0).toUpperCase() + tier.slice(1);

      return {
        tier,
        isActive: data.subscribed,
        planName,
        subscriptionEnd: data.subscription_end,
        source: data.source,
        status: data.status,
        trialDaysRemaining: data.trial_days_remaining ?? null,
        cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
};

// Feature access check based on tier
export const canAccessFeature = (tier: SubscriptionTier, feature: string): boolean => {
  // Voice/SMS available on Professional+ (sandbox pool) per platform pricing.
  // Enterprise unlocks BYO Twilio + white-glove setup.
  const featureAccess: Record<string, SubscriptionTier[]> = {
    'twilio_phone_numbers': ['professional', 'enterprise'],
    'voice_ai': ['professional', 'enterprise'],
    'voice_assistant': ['professional', 'enterprise'],
    'ab_testing': ['professional', 'enterprise'],
    'workflow_analytics': ['professional', 'enterprise'],
    'advanced_insights': ['professional', 'enterprise'],
    'unlimited_workflows': ['enterprise'],
    'custom_integrations': ['professional', 'enterprise'],
    'byo_twilio': ['enterprise'],
  };

  const allowedTiers = featureAccess[feature] || ['free', 'starter', 'professional', 'enterprise'];
  return allowedTiers.includes(tier);
};
