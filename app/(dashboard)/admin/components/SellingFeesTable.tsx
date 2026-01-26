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
                                        {f.owner_profile?.full_name || 'Unknown'}
                                    </td>
                                    <td data-label="Date">{f.date}</td>
                                    <td data-label="Note" className={styles.mutedText}>
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
