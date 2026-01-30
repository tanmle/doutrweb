'use client';

import React, { useState, useMemo } from 'react';
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
    onDelete: (id: string, name: string) => void;
    onHistory: (shop: Shop) => void;
}

export function ShopsTable({ shops, userRole, onEdit, onArchive, onDelete, onHistory }: ShopsTableProps) {
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

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedShops = useMemo(() => {
        let sortableShops = [...shops];
        if (sortConfig !== null) {
            sortableShops.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Shop];
                let bValue: any = b[sortConfig.key as keyof Shop];

                if (sortConfig.key === 'owner') {
                    aValue = a.owner?.full_name || a.owner?.email || '';
                    bValue = b.owner?.full_name || b.owner?.email || '';
                }

                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = (bValue as string)?.toLowerCase() || '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableShops;
    }, [shops, sortConfig]);

    return (
        <div className={styles.tableContainer}>
            <table className={styles.shopsTable}>
                <thead>
                    <tr>
                        <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Shop Name
                                {sortConfig?.key === 'name' && (
                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </div>
                        </th>
                        <th>Platform</th>
                        <th>Status</th>
                        <th onClick={() => handleSort('owner')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Owner
                                {sortConfig?.key === 'owner' && (
                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </div>
                        </th>
                        <th>Note</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedShops.map(shop => (
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
                                            className={`${styles.buttonExtraSmall} ${styles.buttonWarningColor}`}
                                        >
                                            Archive
                                        </Button>
                                    )}
                                    {userRole === 'admin' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => onDelete(shop.id, shop.name)}
                                            className={`${styles.buttonExtraSmall} ${styles.buttonDeleteColor}`}
                                        >
                                            Delete
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
