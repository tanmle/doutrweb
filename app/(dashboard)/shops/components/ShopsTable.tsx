'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/RoleBadge';
import type { UserRole } from '@/components/ui/RoleBadge';
import styles from './ShopsComponents.module.css';

interface Shop {
    id: string;
    name: string;
    platform: string;
    status: string;
    note?: string;
    owner_id: string;
    owner?: {
        full_name?: string;
        email: string;
        role?: UserRole;
    };
}

interface ShopsTableProps {
    shops: Shop[];
    userRole: string;
    onEdit: (shop: Shop) => void;
    onArchive: (id: string, name: string) => void;
    onHistory: (shop: Shop) => void;
}

export function ShopsTable({ shops, userRole, onEdit, onArchive, onHistory }: ShopsTableProps) {
    const getPlatformBadge = (platform: string) => {
        const badges: { [key: string]: string } = {
            tiktok: 'TikTok Shop',
            amazon: 'Amazon',
            other: 'Other'
        };
        return badges[platform] || platform;
    };

    const getStatusBadge = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'active': return styles.statusActive;
            case 'inactive': return styles.statusInactive;
            case 'archived': return styles.statusArchived;
            default: return styles.statusInactive;
        }
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.shopsTable}>
                <thead>
                    <tr>
                        <th>Shop Name</th>
                        <th>Platform</th>
                        <th>Status</th>
                        <th>Owner</th>
                        <th>Note</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {shops.map(shop => (
                        <tr key={shop.id}>
                            <td data-label="Shop Name">
                                <span className={styles.shopName}>{shop.name}</span>
                            </td>
                            <td data-label="Platform">
                                <span className={styles.platformBadge}>
                                    {getPlatformBadge(shop.platform)}
                                </span>
                            </td>
                            <td data-label="Status">
                                <span className={`${styles.statusBadge} ${getStatusClass(shop.status)}`}>
                                    {getStatusBadge(shop.status)}
                                </span>
                            </td>
                            <td data-label="Owner">
                                {shop.owner ? (
                                    <div className={styles.ownerCell}>
                                        <span className={styles.ownerName}>
                                            {shop.owner.full_name || shop.owner.email}
                                        </span>
                                        {shop.owner.role && (
                                            <RoleBadge role={shop.owner.role} />
                                        )}
                                    </div>
                                ) : (
                                    <span className={styles.mutedText}>-</span>
                                )}
                            </td>
                            <td data-label="Note">
                                {shop.note ? (
                                    <span className={styles.noteText}>{shop.note}</span>
                                ) : (
                                    <span className={styles.mutedText}>-</span>
                                )}
                            </td>
                            <td data-label="Actions">
                                <div className={styles.tableActions}>
                                    <Button
                                        variant="ghost"
                                        onClick={() => onHistory(shop)}
                                        className={styles.buttonExtraSmall}
                                    >
                                        History
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => onEdit(shop)}
                                        className={styles.buttonExtraSmall}
                                    >
                                        Edit
                                    </Button>
                                    {userRole !== 'member' && shop.status !== 'archived' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => onArchive(shop.id, shop.name)}
                                            className={`${styles.buttonExtraSmall} ${styles.buttonDeleteColor}`}
                                        >
                                            Archive
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
