import React from 'react';
import styles from './RoleBadge.module.css';

export type UserRole = 'admin' | 'leader' | 'member';

export interface RoleBadgeProps {
    role: UserRole;
    className?: string;
}

const roleConfig: Record<UserRole, { label: string; icon: string }> = {
    admin: { label: 'Admin', icon: '👑' },
    leader: { label: 'Leader', icon: '⭐' },
    member: { label: 'Member', icon: '👤' }
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
    const config = roleConfig[role];

    return (
        <span
            className={`${styles.badge} ${styles[role]} ${className}`}
            title={config.label}
            aria-label={config.label}
        >
            {config.icon}
        </span>
    );
}
