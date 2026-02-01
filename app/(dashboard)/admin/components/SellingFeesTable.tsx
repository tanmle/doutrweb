'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { formatVND } from '../utils/formatters';
import type { SellingFee } from '../utils/types';
import styles from './AdminComponents.module.css';
import { tables } from '@/styles/modules';

interface SellingFeesTableProps {
    fees: SellingFee[];
    totalFeePrice: number;
    onEdit: (fee: SellingFee) => void;
    onDelete: (id: string) => void;
}

const getUserColor = (userId: string) => {
    const colors = [
        '#f472b6', // pink-400
        '#22d3ee', // cyan-400
        '#818cf8', // indigo-400
        '#a78bfa', // violet-400
        '#34d399', // emerald-400
        '#fbbf24', // amber-400
        '#f87171', // red-400
        '#60a5fa', // blue-400
        '#c084fc', // purple-400
        '#db2777', // pink-600
        '#ea580c', // orange-600
        '#65a30d', // lime-600
        '#0891b2', // cyan-600
        '#7c3aed', // violet-600
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

export function SellingFeesTable({ fees, totalFeePrice, onEdit, onDelete }: SellingFeesTableProps) {
    return (
        <div className={tables.tableWrapper}>
            <table className={tables.table}>
                <thead>
                    <tr>
                        <th>Fee Name</th>
                        <th>Price</th>
                        <th>Owner</th>
                        <th>Date</th>
                        <th>Note</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {fees.length === 0 ? (
                        <tr>
                            <td colSpan={6} data-label="Status" className={styles.emptyState}>
                                No selling fees found for this selection
                            </td>
                        </tr>
                    ) : (
                        <>
                            {fees.map(f => (
                                <tr key={f.id}>
                                    <td data-label="Fee Name">{f.name}</td>
                                    <td data-label="Price">{formatVND(f.price)}</td>
                                    <td data-label="Owner">
                                        <span
                                            style={{
                                                color: f.owner_id ? getUserColor(f.owner_id) : 'inherit',
                                                fontWeight: 600
                                            }}
                                        >
                                            {f.owner_profile?.full_name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td data-label="Date">{f.date}</td>
                                    <td data-label="Note" className={styles.noteCell} title={f.note || ''}>
                                        {f.note || '-'}
                                    </td>
                                    <td data-label="Actions">
                                        <div className={styles.tableActions}>
                                            <Button
                                                variant="ghost"
                                                onClick={() => onEdit(f)}
                                                className={styles.buttonExtraSmall}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => onDelete(f.id)}
                                                className={`${styles.buttonExtraSmall} ${styles.buttonDeleteColor}`}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            <tr className={styles.totalRow}>
                                <td data-label="Fee Name" className={styles.totalLabel}>Total</td>
                                <td data-label="Price" className={styles.totalPrice}>
                                    {formatVND(totalFeePrice)}
                                </td>
                                <td colSpan={4}></td>
                            </tr>
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
}
