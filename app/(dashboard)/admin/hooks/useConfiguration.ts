'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { CommissionRate } from '../utils/types';

export function useConfiguration(refresh: number) {
  const [loading, setLoading] = useState(false);
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [supabase, refresh]);

  return { loading, commissionRates, setCommissionRates };
}
