'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { Product, Profile } from '../utils/types';

export function useProducts(refresh: number) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const supabase = useSupabase();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('*, owner_profile:profiles!owner_id(full_name, email)')
          .order('created_at', { ascending: false });

        if (data) {
          // Grouping logic:
          // 1. Identify Parents and Standalone items
          const parents = data.filter((p: any) => !p.parent_id);
          const children = data.filter((p: any) => p.parent_id);

          // 2. Map children to parents
          const groupedProducts = parents.map((parent: any) => {
            const myChildren = children.filter((c: any) => c.parent_id === parent.id);
            if (myChildren.length > 0) {
              return { ...parent, variations: myChildren };
            }
            return parent;
          });

          setProducts(groupedProducts);
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role');
        if (profileData) setProfiles(profileData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refresh]); // Removed supabase - it's stable from context

  return { loading, products, profiles };
}
