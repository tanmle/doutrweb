'use client';

import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { Button } from '@/components/ui/Button';
import styles from './notifications.module.css';

export default function NotificationsPage() {
    const { notifications, loading, markAllAsRead, refresh } = useNotifications();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Notifications</h1>

                <div className={styles.headerActions}>
                    <Button
                        variant="ghost"
                        onClick={() => refresh()}
                        disabled={loading}
                    >
                        Refresh
                    </Button>

                    {notifications.some(n => !n.read_at) && (
                        <Button
                            onClick={() => markAllAsRead()}
                            className={styles.markReadButton}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>
                    <span>⏳</span> Loading notifications...
                </div>
            ) : notifications.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📭</div>
                    <h3 className={styles.emptyTitle}>All caught up!</h3>
                    <p className={styles.emptyDesc}>You don't have any notifications right now.</p>
                </div>
            ) : (
                <div className={styles.notificationList}>
                    {notifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
