'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Added import
import type { NotificationWithStatus } from '@/types/notifications';
import styles from './NotificationItem.module.css';

type NotificationItemProps = {
    notification: NotificationWithStatus;
    onClick?: () => void;
    onMarkRead?: (id: string) => void;
};

export function NotificationItem({ notification, onClick, onMarkRead }: NotificationItemProps) {
    const router = useRouter(); // Added hook
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
            onMarkRead?.(notification.id);
        }

        // Smart Navigation
        switch (notification.type) {
            case 'achievement':
                router.push('/reports');
                break;
            case 'manual':
                // Assuming 'manual' notifications are mostly about tasks like Sales
                router.push('/dashboard');
                break;
            default:
                // Fallback for system or other notifications
                // Check keywords to guess destination
                if (notification.title.toLowerCase().includes('shop') || notification.message.toLowerCase().includes('shop')) {
                    router.push('/shops');
                } else if (notification.title.toLowerCase().includes('sale') || notification.message.toLowerCase().includes('sale')) {
                    router.push('/sales');
                }
                break;
        }

        onClick?.();
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
    };

    const handleMarkRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        onMarkRead?.(notification.id);
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
                    {!notification.read_at && (
                        <>
                            <button
                                className={`${styles.menuButton} ${menuOpen ? styles.menuOpen : ''}`}
                                onClick={handleMenuClick}
                            >
                                ⋮
                            </button>
                            {menuOpen && (
                                <div className={styles.menuDropdown} ref={menuRef}>
                                    <button className={styles.menuItem} onClick={handleMarkRead}>
                                        Mark as read
                                    </button>
                                </div>
                            )}
                        </>
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
