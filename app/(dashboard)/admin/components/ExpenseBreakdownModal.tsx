'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/currency';
import { tables } from '@/styles/modules';
import styles from './AdminComponents.module.css';

interface MonthlyBreakdown {
    month: string;
    total: number;
    count: number;
}

interface ExpenseBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: MonthlyBreakdown[];
    loading?: boolean;
}

export function ExpenseBreakdownModal({
    isOpen,
    onClose,
    title,
    data,
    loading = false
}: ExpenseBreakdownModalProps) {
    const grandTotal = data.reduce((sum, item) => sum + item.total, 0);
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${title} - Monthly Breakdown`}
        >
            <div className={styles.modalContent}>
                {loading ? (
                    <div className={styles.loadingText}>Loading...</div>
                ) : data.length === 0 ? (
                    <div className={styles.emptyText}>No data available</div>
                ) : (
                    <>
                        <div className={styles.summaryInfo}>
                            <div>
                                <strong>Total:</strong> {formatCurrency(grandTotal)}
                            </div>
                            <div>
                                <strong>Items:</strong> {totalCount}
                            </div>
                        </div>

                        <div className={tables.tableWrapper}>
                            <table className={tables.table}>
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Total Amount</th>
                                        <th>Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => {
                                        // Parse YYYY-MM format
                                        const [year, month] = item.month.split('-');
                                        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                                        const monthName = date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long'
                                        });

                                        return (
                                            <tr key={item.month}>
                                                <td data-label="Month">{monthName}</td>
                                                <td data-label="Total Amount">
                                                    <strong>{formatCurrency(item.total)}</strong>
                                                </td>
                                                <td data-label="Count">{item.count} items</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className={styles.totalRow}>
                                        <td className={styles.totalLabel}><strong>Total</strong></td>
                                        <td className={styles.totalPrice}>
                                            <strong>{formatCurrency(grandTotal)}</strong>
                                        </td>
                                        <td><strong>{totalCount} items</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
