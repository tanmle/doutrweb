'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { FeeFilter, MonthlyFee, Profile } from '../utils/types';

interface UseMonthlyFeesProps {
  feeFilter: FeeFilter;
  ownerFilter: string;
  dateRange: { start: string; end: string };
  refresh: number;
}

export function useMonthlyFees({
  feeFilter,
  ownerFilter,
  dateRange,
  refresh,
}: UseMonthlyFeesProps) {
  const [loading, setLoading] = useState(false);
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('monthly_fees')
          .select('*, owner_profile:profiles!owner_id(full_name)')
          .order('date', { ascending: false });
        
        const now = new Date();
        
        if (feeFilter === 'today') {
          query = query.eq('date', today);
        } else if (feeFilter === 'this_month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString().split('T')[0];
          query = query.gte('date', startOfMonth);
        } else if (feeFilter === 'last_month') {
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            .toISOString().split('T')[0];
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
            .toISOString().split('T')[0];
          query = query.gte('date', startOfLastMonth).lte('date', endOfLastMonth);
        } else if (feeFilter === 'range' && dateRange.start && dateRange.end) {
          query = query.gte('date', dateRange.start).lte('date', dateRange.end);
        }

        if (ownerFilter !== 'all') {
          query = query.eq('owner_id', ownerFilter);
        }

        const { data, error } = await query;
        if (error) console.error('Monthly Fee fetch error:', error);
        if (data) setMonthlyFees(data);
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role');
        if (profileData) setProfiles(profileData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [supabase, feeFilter, ownerFilter, dateRange, refresh, today]);

  return { loading, monthlyFees, profiles };
}
