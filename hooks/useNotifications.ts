'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { NotificationWithStatus } from '@/types/notifications';

export function useNotifications() {
    const supabase = useSupabase();
    const [notifications, setNotifications] = useState<NotificationWithStatus[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notification_recipients')
                .select(`
          id,
          notification_id,
          recipient_id,
          read_at,
          created_at,
          notification:notifications (
            id,
            created_at,
            title,
            message,
            type,
            sender_id,
            metadata
          )
        `)
                .eq('recipient_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const formatted = (data || []).map((item: any) => ({
                ...item.notification,
                read_at: item.read_at,
                recipient_id: item.recipient_id,
            }));

            setNotifications(formatted);
            setUnreadCount(formatted.filter((n: NotificationWithStatus) => !n.read_at).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notification_recipients')
                .update({ read_at: new Date().toISOString() })
                .eq('notification_id', notificationId)
                .eq('recipient_id', user.id)
                .is('read_at', null);

            if (error) throw error;

            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId
                        ? { ...n, read_at: new Date().toISOString() }
                        : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, [supabase]);

    const markAllAsRead = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const unreadIds = notifications
                .filter(n => !n.read_at)
                .map(n => n.id);

            if (unreadIds.length === 0) return;

            const { error } = await supabase
                .from('notification_recipients')
                .update({ read_at: new Date().toISOString() })
                .eq('recipient_id', user.id)
                .is('read_at', null);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }, [supabase, notifications]);

    // Subscribe to real-time updates
    useEffect(() => {
        fetchNotifications();

        let channel: ReturnType<typeof supabase.channel> | null = null;

        const setupRealtimeSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channel = supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notification_recipients',
                        filter: `recipient_id=eq.${user.id}`,
                    },
                    () => {
                        fetchNotifications();
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notification_recipients',
                        filter: `recipient_id=eq.${user.id}`,
                    },
                    () => {
                        fetchNotifications();
                    }
                )
                .subscribe();
        };

        setupRealtimeSubscription();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [supabase, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
    };
}
