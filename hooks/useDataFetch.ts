'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';

interface UseDataFetchOptions<T> {
    queryFn: () => Promise<T>;
    dependencies?: any[];
    enabled?: boolean;
}

interface UseDataFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Generic data fetching hook with loading and error states
 * Prevents code duplication across components
 */
export function useDataFetch<T>({
    queryFn,
    dependencies = [],
    enabled = true,
}: UseDataFetchOptions<T>): UseDataFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = async () => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const result = await queryFn();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            console.error('Data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);

    return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching user role and profile
 */
export function useUserRole() {
    const supabase = useSupabase();

    return useDataFetch({
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, id')
                .eq('id', user.id)
                .single();

            return profile ? { ...profile, userId: user.id } : null;
        },
        dependencies: [],
    });
}

/**
 * Hook for fetching shops based on user role
 */
export function useShops(userRole: string | null, userId: string | null) {
    const supabase = useSupabase();

    return useDataFetch({
        queryFn: async () => {
            if (!userId) return [];

            let query = supabase.from('shops').select('id, name, owner_id');

            if (userRole === 'admin') {
                // Admin sees all shops
            } else if (userRole === 'leader') {
                const { data: members } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('leader_id', userId);
                const teamIds = [userId, ...(members?.map(m => m.id) || [])];
                query = query.in('owner_id', teamIds);
            } else {
                // Member sees only their shops
                query = query.eq('owner_id', userId);
            }

            const { data } = await query.order('name');
            return data || [];
        },
        dependencies: [userRole, userId],
        enabled: !!userId,
    });
}

/**
 * Hook for fetching products
 */
export function useProducts() {
    const supabase = useSupabase();

    return useDataFetch({
        queryFn: async () => {
            const { data } = await supabase
                .from('products')
                .select('*')
                .order('name');
            return data || [];
        },
        dependencies: [],
    });
}
