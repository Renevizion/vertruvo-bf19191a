import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FormVariant {
  id: string;
  variant_name: string;
  traffic_percentage: number;
  variant_config: any;
  is_active: boolean;
}

export const useFormABTesting = (formId: string) => {
  const [selectedVariant, setSelectedVariant] = useState<FormVariant | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const selectVariant = async () => {
      // Fetch active A/B test variants
      const { data: variants, error } = await supabase
        .from('form_ab_tests')
        .select('*')
        .eq('form_id', formId)
        .eq('is_active', true);

      if (error || !variants || variants.length === 0) {
        return; // No A/B testing active, use default form
      }

      // Select variant based on traffic allocation
      const random = Math.random() * 100;
      let cumulative = 0;

      for (const variant of variants) {
        cumulative += variant.traffic_percentage || 0;
        if (random < cumulative) {
          setSelectedVariant(variant);
          return;
        }
      }

      // Fallback to first variant
      setSelectedVariant(variants[0]);
    };

    selectVariant();
  }, [formId]);

  return { selectedVariant, sessionId };
};