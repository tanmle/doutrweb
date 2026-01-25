import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/ui/NotificationItem';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const bellRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { notifications, unreadCount, loading, markAllAsRead } = useNotifications();
    const [mounted, setMounted] = useState(false);
    const [isRinging, setIsRinging] = useState(false);
    const prevUnreadCount = useRef(unreadCount);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Trigger ring effect when unread count increases
    useEffect(() => {
        if (unreadCount > prevUnreadCount.current) {
            setIsRinging(true);
            const timer = setTimeout(() => setIsRinging(false), 2000); // multiple cycles of 1.5s animation
            return () => clearTimeout(timer);
        }
        prevUnreadCount.current = unreadCount;
    }, [unreadCount]);

    // Calculate position on open
    useEffect(() => {
        if (isOpen && bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect();
            const windowWidth = window.innerWidth;

            // Default desktop position: align right edge with bell right edge
            // Gap of 8px
            setDropdownPos({
                top: rect.bottom + 12,
                right: windowWidth - rect.right
            });

            // Prevent body scroll on mobile
            if (windowWidth <= 640) {
                document.body.style.overflow = 'hidden';
            }
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                bellRef.current &&
                !bellRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (isOpen && bellRef.current) {
                // Recalculate if window resizes
                setIsOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen]);


    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const limit = isMobile ? 3 : 5;
    const recentNotifications = notifications.slice(0, limit);

    const DropdownContent = (
        <div
            className={styles.dropdown}
            ref={dropdownRef}
            style={{
                top: `${dropdownPos.top}px`,
                right: `${dropdownPos.right}px`
            }}
        >
            <div className={styles.dropdownHeader}>
                <h3 className={styles.dropdownTitle}>Notifications</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {unreadCount > 0 && (
                        <button
                            className={styles.markAllRead}
                            onClick={handleMarkAllRead}
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        className={styles.closeButton}
                        onClick={() => setIsOpen(false)}
                        aria-label="Close notifications"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className={styles.notificationList}>
                {loading ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>⏳</div>
                        <p className={styles.emptyText}>Loading notifications...</p>
                    </div>
                ) : recentNotifications.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🔔</div>
                        <p className={styles.emptyText}>No notifications yet</p>
                    </div>
                ) : (
                    recentNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onClick={() => setIsOpen(false)}
                        />
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className={styles.viewAll}>
                    <Link href="/notifications" className={styles.viewAllLink} onClick={() => setIsOpen(false)}>
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );

    return (
        <>
            <button
                ref={bellRef}
                className={`${styles.notificationBell} ${unreadCount > 0 ? styles.hasUnread : ''} ${isRinging ? styles.ringing : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
                <span className={styles.bellIcon}>🔔</span>
                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && mounted && createPortal(DropdownContent, document.body)}
        </>
    );
}
