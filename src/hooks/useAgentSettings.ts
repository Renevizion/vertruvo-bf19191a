import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAgentSettings() {
  const [enabled, setEnabled] = useState(true);
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');
  const [provider, setProvider] = useState<'mistral' | 'gemini'>('mistral');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEnabled(data.agent_features_enabled ?? true);
        setTier((data.agent_tier as 'basic' | 'premium') ?? 'basic');
        setProvider((data.ai_provider as 'mistral' | 'gemini') ?? 'mistral');
      }
      // If no data, keep defaults (enabled=true, tier='basic', provider='mistral')
    } catch (error) {
      console.error('Error fetching agent settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: { enabled?: boolean; tier?: 'basic' | 'premium'; provider?: 'mistral' | 'gemini' }) => {
    try {
      const { data: currentSettings } = await supabase
        .from('agent_settings')
        .select('id')
        .limit(1)
        .single();

      if (currentSettings) {
        const { error } = await supabase
          .from('agent_settings')
          .update({
            agent_features_enabled: updates.enabled ?? enabled,
            agent_tier: updates.tier ?? tier,
            ai_provider: updates.provider ?? provider,
          })
          .eq('id', currentSettings.id);

        if (error) throw error;
      }

      if (updates.enabled !== undefined) setEnabled(updates.enabled);
      if (updates.tier) setTier(updates.tier);
      if (updates.provider) setProvider(updates.provider);
    } catch (error) {
      console.error('Error updating agent settings:', error);
    }
  };

  return { enabled, tier, provider, loading, updateSettings };
}