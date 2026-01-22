'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Tab, FeeFilter, Product, User, Fee, Profile, CommissionRate } from '../utils/types';

interface UseAdminDataProps {
  activeTab: Tab;
  feeFilter: FeeFilter;
  ownerFilter: string;
  dateRange: { start: string; end: string };
  refresh: number;
}

export function useAdminData({
  activeTab,
  feeFilter,
  ownerFilter,
  dateRange,
  refresh,
}: UseAdminDataProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'products') {
          const { data } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
          if (data) setProducts(data);
        } else if (activeTab === 'users') {
          const { data } = await supabase
            .from('profiles')
            .select('*, leader:profiles!leader_id(full_name)')
            .order('created_at', { ascending: false });
          if (data) setUsers(data);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, email, role');
          if (profileData) setProfiles(profileData);
        } else if (activeTab === 'fees') {
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
          if (error) console.error('Fee fetch error:', error);
          if (data) setFees(data);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, email, role');
          if (profileData) setProfiles(profileData);
        } else if (activeTab === 'configuration') {
          const { data } = await supabase
            .from('commission_rates')
            .select('*')
            .order('level', { ascending: true });
          if (data) setCommissionRates(data);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeTab, feeFilter, ownerFilter, dateRange, supabase, refresh, today]);

  return {
    loading,
    products,
    users,
    fees,
    profiles,
    commissionRates,
    setCommissionRates,
  };
}
