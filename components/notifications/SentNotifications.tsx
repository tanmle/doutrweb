'use client';

import React, { useEffect, useState } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import styles from './SentNotifications.module.css';

type SentNotification = {
    id: string;
    created_at: string;
    title: string;
    message: string;
    type: string;
    recipient_count?: number;
    read_count?: number;
};

export function SentNotifications() {
    const supabase = useSupabase();
    const [sent, setSent] = useState<SentNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSent = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch notifications sent by me
            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    notification_recipients(count)
                `)
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // For read count, we might need a separate query or join if count supports filter
                // Simple version: just count recipients
                const formatted = data.map((n: any) => ({
                    ...n,
                    recipient_count: n.notification_recipients?.[0]?.count || 0,
                    // Note: Getting exact read count requires more complex query or grouping
                }));
                setSent(formatted);
            }
            setLoading(false);
        };

        fetchSent();
    }, [supabase]);

    if (loading) return <div className={styles.loading}>Loading history...</div>;

    if (sent.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p className={styles.emptyDesc}>You haven't sent any notifications yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.sentList}>
            {sent.map((n) => (
                <div key={n.id} className={styles.sentItem}>
                    <div className={styles.sentHeader}>
                        <h4 className={styles.sentTitle}>{n.title}</h4>
                        <span className={styles.sentMeta}>
                            {new Date(n.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p className={styles.sentMessage}>{n.message}</p>
                    <div className={styles.sentStats}>
                        <div className={styles.statItem}>
                            👥 {n.recipient_count} Recipient{n.recipient_count !== 1 ? 's' : ''}
                        </div>
                        {/* Future: Add Read % here */}
                    </div>
                </div>
            ))}
        </div>
    );
}
