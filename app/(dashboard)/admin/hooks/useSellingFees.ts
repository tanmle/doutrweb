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

  // Helper to get date string in local timezone (YYYY-MM-DD)
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString(new Date());

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
          const startOfMonth = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
          query = query.gte('date', startOfMonth).lte('date', today);
        } else if (feeFilter === 'last_month') {
          const startOfLastMonth = getLocalDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
          const endOfLastMonth = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 0));
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
