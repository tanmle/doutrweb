'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { Product, Profile } from '../utils/types';

export function useProducts(refresh: number) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const initialized = useRef(false);

  const supabase = useSupabase();

  useEffect(() => {
    const fetchData = async () => {
      // Only set loading true if it's the first time
      if (!initialized.current) {
        setLoading(true);
      }

      try {
        // Parallel fetch products and profiles
        const [productsRes, profilesRes] = await Promise.all([
          supabase
            .from('products')
            .select('*, owner_profile:profiles!owner_id(full_name, email)')
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, full_name, email, role')
        ]);

        if (productsRes.data) {
          // Grouping logic:
          // 1. Identify Parents and Standalone items
          const parents = productsRes.data.filter((p: any) => !p.parent_id);
          const children = productsRes.data.filter((p: any) => p.parent_id);

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

        if (profilesRes.data) {
          setProfiles(profilesRes.data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
        initialized.current = true;
      }
    };

    fetchData();
  }, [refresh, supabase]); // Fixed: Added supabase to dependencies

  return { loading, products, profiles };
}
