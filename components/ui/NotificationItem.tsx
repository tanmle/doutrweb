'use client';

import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationWithStatus } from '@/types/notifications';
import styles from './NotificationItem.module.css';

type NotificationItemProps = {
    notification: NotificationWithStatus;
    onClick?: () => void;
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const { markAsRead } = useNotifications();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    const handleClick = () => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        onClick?.();
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
    };

    const handleMarkRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        markAsRead(notification.id);
        setMenuOpen(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'achievement':
                return '🎉';
            case 'manual':
                return '📢';
            case 'system':
                return '⚙️';
            default:
                return '📬';
        }
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            className={`${styles.notificationItem} ${!notification.read_at ? styles.unread : ''}`}
            onClick={handleClick}
        >
            <div className={styles.icon}>{getIcon(notification.type)}</div>

            <div className={styles.content}>
                <div className={styles.header}>
                    <h4 className={styles.title}>{notification.title}</h4>
                    <button
                        className={`${styles.menuButton} ${menuOpen ? styles.menuOpen : ''}`}
                        onClick={handleMenuClick}
                    >
                        ⋮
                    </button>
                    {menuOpen && (
                        <div className={styles.menuDropdown} ref={menuRef}>
                            {!notification.read_at && (
                                <button className={styles.menuItem} onClick={handleMarkRead}>
                                    Mark as read
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <p className={styles.message}>{notification.message}</p>

                <div className={styles.footer}>
                    <span className={styles.timestamp}>
                        {getRelativeTime(notification.created_at)}
                    </span>
                    <span className={`${styles.typeBadge} ${styles[`typeBadge${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]}`}>
                        {notification.type}
                    </span>
                </div>
            </div>
        </div>
    );
}
