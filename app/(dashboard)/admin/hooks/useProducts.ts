'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Product, Profile } from '../utils/types';

export function useProducts(refresh: number) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('*, owner_profile:profiles!owner_id(full_name, email)')
          .order('created_at', { ascending: false });
        if (data) setProducts(data);
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role');
        if (profileData) setProfiles(profileData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [supabase, refresh]);

  return { loading, products, profiles };
}
