import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionTier } from "./useSubscriptionTier";

const CAPS_BY_TIER: Record<string, { call: number; sms: number; voicemail: number }> = {
  free:         { call: 0,   sms: 0,   voicemail: 0 },
  starter:      { call: 0,   sms: 0,   voicemail: 0 },
  professional: { call: 10,  sms: 10,  voicemail: 10 },
  enterprise:   { call: 100, sms: 100, voicemail: 100 },
};

export interface SandboxQuota {
  tier: string;
  caps: { call: number; sms: number; voicemail: number };
  used: { call: number; sms: number; voicemail: number };
  hasOwnNumber: boolean;
  isSandboxActive: boolean; // tier eligible AND no BYO number
  totalRemaining: number;
}

/**
 * Sandbox pool quota: free trial of voice/SMS on the platform Twilio number
 * for Pro+ workspaces that haven't connected their own Twilio yet.
 */
export function useSandboxQuota() {
  const { data: sub } = useSubscriptionTier();
  const tier = sub?.tier || "free";

  return useQuery({
    queryKey: ["sandbox-quota", tier],
    queryFn: async (): Promise<SandboxQuota> => {
      const { data: { user } } = await supabase.auth.getUser();
      const empty: SandboxQuota = {
        tier,
        caps: CAPS_BY_TIER[tier] || CAPS_BY_TIER.free,
        used: { call: 0, sms: 0, voicemail: 0 },
        hasOwnNumber: false,
        isSandboxActive: false,
        totalRemaining: 0,
      };
      if (!user) return empty;

      const { data: ws } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!ws?.workspace_id) return empty;

      const [{ data: numbers }, { data: usage }] = await Promise.all([
        supabase
          .from("twilio_phone_numbers")
          .select("id")
          .eq("workspace_id", ws.workspace_id)
          .eq("is_active", true)
          .limit(1),
        supabase
          .from("twilio_sandbox_usage")
          .select("calls_used, sms_used, voicemails_used")
          .eq("workspace_id", ws.workspace_id)
          .maybeSingle(),
      ]);

      const caps = CAPS_BY_TIER[tier] || CAPS_BY_TIER.free;
      const used = {
        call: usage?.calls_used ?? 0,
        sms: usage?.sms_used ?? 0,
        voicemail: usage?.voicemails_used ?? 0,
      };
      const hasOwnNumber = (numbers?.length ?? 0) > 0;
      const tierAllowed = caps.call > 0;
      const isSandboxActive = tierAllowed && !hasOwnNumber;
      const totalRemaining = isSandboxActive
        ? Math.max(0, caps.call - used.call)
          + Math.max(0, caps.sms - used.sms)
          + Math.max(0, caps.voicemail - used.voicemail)
        : 0;

      return { tier, caps, used, hasOwnNumber, isSandboxActive, totalRemaining };
    },
    staleTime: 30 * 1000,
  });
}
