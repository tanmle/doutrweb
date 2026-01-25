'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { CommissionRate } from '../utils/types';

export function useConfiguration(refresh: number) {
  const [loading, setLoading] = useState(false);
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  const [baseKpi, setBaseKpi] = useState<number>(500);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('commission_rates')
          .select('*')
          .order('level', { ascending: true });
        if (data) setCommissionRates(data);

        const { data: settings } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'base_kpi')
          .maybeSingle();
        if (settings) setBaseKpi(parseFloat(settings.value));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, refresh]);

  return { loading, commissionRates, setCommissionRates, baseKpi, setBaseKpi };
}
