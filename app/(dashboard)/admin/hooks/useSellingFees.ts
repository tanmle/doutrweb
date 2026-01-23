'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { FeeFilter, SellingFee, Profile } from '../utils/types';

interface UseSellingFeesProps {
  feeFilter: FeeFilter;
  ownerFilter: string;
  dateRange: { start: string; end: string };
  refresh: number;
}

export function useSellingFees({
  feeFilter,
  ownerFilter,
  dateRange,
  refresh,
}: UseSellingFeesProps) {
  const [loading, setLoading] = useState(false);
  const [sellingFees, setSellingFees] = useState<SellingFee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('selling_fees')
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
        if (error) console.error('Selling Fee fetch error:', error);
        if (data) setSellingFees(data);
        
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

  return { loading, sellingFees, profiles };
}
