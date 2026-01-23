'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
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
    };
}

interface ShopsTableProps {
    shops: Shop[];
    userRole: string;
    onEdit: (shop: Shop) => void;
    onDelete: (id: string, name: string) => void;
}

export function ShopsTable({ shops, userRole, onEdit, onDelete }: ShopsTableProps) {
    const getPlatformBadge = (platform: string) => {
        const badges: { [key: string]: string } = {
            tiktok: 'TikTok Shop',
            amazon: 'Amazon',
            shopee: 'Shopee',
            lazada: 'Lazada',
            other: 'Other'
        };
        return badges[platform] || platform;
    };

    const getStatusBadge = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
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
                                <span className={`${styles.statusBadge} ${shop.status === 'active' ? styles.statusActive : styles.statusInactive
                                    }`}>
                                    {getStatusBadge(shop.status)}
                                </span>
                            </td>
                            <td data-label="Owner">
                                {shop.owner ? (
                                    <span>{shop.owner.full_name || shop.owner.email}</span>
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
                                        onClick={() => onEdit(shop)}
                                        className={styles.buttonExtraSmall}
                                    >
                                        Edit
                                    </Button>
                                    {userRole !== 'member' && (
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
