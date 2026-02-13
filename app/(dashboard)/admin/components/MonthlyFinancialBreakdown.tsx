'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/currency';
import { formatVND } from '../utils/formatters';
import { formatDate } from '@/utils/dateHelpers';
import { tables } from '@/styles/modules';
import styles from './AdminComponents.module.css';

interface MonthlyFinancialData {
    month: string;
    capital: number;
    income: number;
    monthlyFees: number;
    sellingFees: number;
    payroll: number;
    totalExpenses: number;
    netCashFlow: number;
}

interface MonthlyFinancialBreakdownProps {
    isOpen: boolean;
    onClose: () => void;
    data: MonthlyFinancialData[];
    loading?: boolean;
}

export function MonthlyFinancialBreakdown({
    isOpen,
    onClose,
    data,
    loading = false
}: MonthlyFinancialBreakdownProps) {
    console.log('MonthlyFinancialBreakdown received data:', data);
    console.log('Data length:', data.length);
    console.log('Unique months:', new Set(data.map(d => d.month)).size);
    console.log('All months:', data.map(d => d.month));

    // Check for any duplicate month values
    const monthCounts: { [key: string]: number } = {};
    data.forEach(item => {
        monthCounts[item.month] = (monthCounts[item.month] || 0) + 1;
    });
    const duplicates = Object.entries(monthCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
        console.error('DUPLICATE MONTHS FOUND:', duplicates);
    }

    const totals = data.reduce((acc, item) => ({
        capital: acc.capital + item.capital,
        income: acc.income + item.income,
        monthlyFees: acc.monthlyFees + item.monthlyFees,
        sellingFees: acc.sellingFees + item.sellingFees,
        payroll: acc.payroll + item.payroll,
        totalExpenses: acc.totalExpenses + item.totalExpenses,
        netCashFlow: acc.netCashFlow + item.netCashFlow,
    }), {
        capital: 0,
        income: 0,
        monthlyFees: 0,
        sellingFees: 0,
        payroll: 0,
        totalExpenses: 0,
        netCashFlow: 0,
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Monthly Financial Breakdown"
        >
            <div className={styles.modalContent}>
                {loading ? (
                    <div className={styles.loadingText}>Loading...</div>
                ) : data.length === 0 ? (
                    <div className={styles.emptyText}>No data available</div>
                ) : (
                    <>
                        <div className={styles.summaryInfo} style={{ marginBottom: '1rem' }}>
                            <div>
                                <strong>Total Months:</strong> {data.length}
                            </div>
                            <div>
                                <strong>Net Cash Flow:</strong>{' '}
                                <span style={{ color: totals.netCashFlow >= 0 ? '#10b981' : '#ef4444' }}>
                                    {formatVND(totals.netCashFlow)}
                                </span>
                            </div>
                        </div>

                        <div className={tables.tableWrapper} style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table className={tables.table}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>
                                    <tr>
                                        <th>Month</th>
                                        <th>Capital</th>
                                        <th>Income</th>
                                        <th>Monthly Fees</th>
                                        <th>Selling Fees</th>
                                        <th>Payroll</th>
                                        <th>Total Expenses</th>
                                        <th>Net Cash Flow</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => {
                                        const [year, month] = item.month.split('-');
                                        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                                        const monthName = formatDate(date, {
                                            year: 'numeric',
                                            month: 'short'
                                        });

                                        return (
                                            <tr key={item.month}>
                                                <td data-label="Month"><strong>{monthName}</strong></td>
                                                <td data-label="Capital" style={{ color: '#3b82f6' }}>
                                                    {formatVND(item.capital)}
                                                </td>
                                                <td data-label="Income" style={{ color: '#10b981' }}>
                                                    {formatVND(item.income)}
                                                </td>
                                                <td data-label="Monthly Fees" style={{ color: '#6366f1' }}>
                                                    {formatVND(item.monthlyFees)}
                                                </td>
                                                <td data-label="Selling Fees" style={{ color: '#8b5cf6' }}>
                                                    {formatVND(item.sellingFees)}
                                                </td>
                                                <td data-label="Payroll" style={{ color: '#f59e0b' }}>
                                                    {formatVND(item.payroll)}
                                                </td>
                                                <td data-label="Total Expenses">
                                                    <strong>{formatVND(item.totalExpenses)}</strong>
                                                </td>
                                                <td
                                                    data-label="Net Cash Flow"
                                                    style={{
                                                        color: item.netCashFlow >= 0 ? '#10b981' : '#ef4444',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {formatVND(item.netCashFlow)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className={styles.totalRow}>
                                        <td className={styles.totalLabel}><strong>Total</strong></td>
                                        <td className={styles.totalPrice} style={{ color: '#3b82f6' }}>
                                            <strong>{formatVND(totals.capital)}</strong>
                                        </td>
                                        <td className={styles.totalPrice} style={{ color: '#10b981' }}>
                                            <strong>{formatVND(totals.income)}</strong>
                                        </td>
                                        <td className={styles.totalPrice} style={{ color: '#6366f1' }}>
                                            <strong>{formatVND(totals.monthlyFees)}</strong>
                                        </td>
                                        <td className={styles.totalPrice} style={{ color: '#8b5cf6' }}>
                                            <strong>{formatVND(totals.sellingFees)}</strong>
                                        </td>
                                        <td className={styles.totalPrice} style={{ color: '#f59e0b' }}>
                                            <strong>{formatVND(totals.payroll)}</strong>
                                        </td>
                                        <td className={styles.totalPrice}>
                                            <strong>{formatVND(totals.totalExpenses)}</strong>
                                        </td>
                                        <td
                                            className={styles.totalPrice}
                                            style={{
                                                color: totals.netCashFlow >= 0 ? '#10b981' : '#ef4444'
                                            }}
                                        >
                                            <strong>{formatVND(totals.netCashFlow)}</strong>
                                        </td>
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
