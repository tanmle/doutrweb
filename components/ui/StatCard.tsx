import React from 'react';
import { Card } from './Card';
import styles from './StatCard.module.css';

export interface StatCardProps {
    label: string;
    value: string | number;
    variant?: 'default' | 'success' | 'warning' | 'error';
    subtext?: string;
    icon?: React.ReactNode;
    className?: string;
}

export function StatCard({
    label,
    value,
    variant = 'default',
    subtext,
    icon,
    className = ''
}: StatCardProps) {
    return (
        <Card className={`${styles.statCard} ${styles[variant]} ${className}`}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <div className={styles.content}>
                <div className={styles.label}>{label}</div>
                <div className={styles.value}>{value}</div>
                {subtext && <div className={styles.subtext}>{subtext}</div>}
            </div>
        </Card>
    );
}
