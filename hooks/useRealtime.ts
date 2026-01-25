import { useEffect, useRef } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeOptions = {
    table: string;
    schema?: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onData?: (payload: RealtimePostgresChangesPayload<any>) => void;
};

/**
 * Universal hook for Supabase Realtime subscriptions
 * @param options Subscription configuration
 * @param dependencies Array of dependencies that trigger re-subscription
 */
export function useRealtime(
    { table, schema = 'public', event = '*', filter, onData }: RealtimeOptions,
    dependencies: any[] = []
) {
    const supabase = useSupabase();
    const onDataRef = useRef(onData);

    // Keep the ref updated with the latest callback
    useEffect(() => {
        onDataRef.current = onData;
    }, [onData]);

    useEffect(() => {
        // Create a unique channel name based on params to avoid conflicts
        const channelName = `realtime:${schema}:${table}:${event}:${filter || 'all'}`;

        const channel = supabase
            .channel(channelName)
            .on(
                // @ts-ignore - 'postgres_changes' valid but TS definitions might be mismatching in some versions
                'postgres_changes',
                {
                    event,
                    schema,
                    table,
                    filter,
                },
                (payload: RealtimePostgresChangesPayload<any>) => {
                    if (onDataRef.current) onDataRef.current(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // console.log(`Subscribed to ${channelName}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase, table, schema, event, filter, ...dependencies]);
}
