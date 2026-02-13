'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import type { Capital, Income } from '../utils/types';
import { cards, tables, filters, layouts } from '@/styles/modules';
import styles from './AdminComponents.module.css';
import { formatCurrency } from '@/utils/currency';
import { formatVND } from '../utils/formatters';
import { formatDate } from '@/utils/dateHelpers';

interface FinanceTabProps {
    loading: boolean;
    capitalRecords: Capital[];
    incomeRecords: Income[];
    monthlyFees: { total: number; count: number };
    sellingFees: { total: number; count: number };
    payrollTotal: number;
    onAddCapital: () => void;
    onAddIncome: () => void;
    onEditCapital: (record: Capital) => void;
    onEditIncome: (record: Income) => void;
    onDeleteCapital: (id: string) => void;
    onDeleteIncome: (id: string) => void;
    onClickMonthlyFees?: () => void;
    onClickSellingFees?: () => void;
    onClickPayroll?: () => void;
    onViewMonthlyBreakdown?: () => void;
}

export function FinanceTab({
    loading,
    capitalRecords,
    incomeRecords,
    monthlyFees,
    sellingFees,
    payrollTotal,
    onAddCapital,
    onAddIncome,
    onEditCapital,
    onEditIncome,
    onDeleteCapital,
    onDeleteIncome,
    onClickMonthlyFees,
    onClickSellingFees,
    onClickPayroll,
    onViewMonthlyBreakdown
}: FinanceTabProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'month' | 'quarter' | 'year'>('month');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Pagination state for Income Records
    const [incomeCurrentPage, setIncomeCurrentPage] = useState(1);
    const incomeItemsPerPage = 10;

    // Calculate financial metrics
    const metrics = useMemo(() => {
        const totalCapital = capitalRecords.reduce((sum, r) => sum + r.amount, 0);
        const totalIncome = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
        const totalExpenses = monthlyFees.total + sellingFees.total + payrollTotal;
        const netProfit = totalIncome - totalExpenses;
        const roi = totalCapital > 0 ? (netProfit / totalCapital) * 100 : 0;

        return {
            totalCapital,
            totalIncome,
            totalExpenses,
            netProfit,
            roi,
            cashFlow: totalCapital + totalIncome - totalExpenses
        };
    }, [capitalRecords, incomeRecords, monthlyFees, sellingFees, payrollTotal]);

    if (loading) {
        return <LoadingIndicator label="Loading finance data..." />;
    }

    return (
        <div className={layouts.flexColumn}>
            {/* Header Section */}
            <div className={styles.financeHeader}>
                <div>
                    <h2 className={styles.financeTitle}>Financial Overview</h2>
                    <p className={styles.financeSubtitle}>Track your capital, income, and expenses</p>
                </div>
                <div className={styles.financeActions}>
                    {onViewMonthlyBreakdown && (
                        <Button variant="primary" onClick={onViewMonthlyBreakdown}>
                            📊 Monthly Breakdown
                        </Button>
                    )}
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className={cards.cardGridFourCol}>
                <Card className={cards.statCardPrimary}>
                    <div className={cards.statLabel}>Total Capital</div>
                    <div className={cards.statValue}>{formatVND(metrics.totalCapital)}</div>
                    <div className={cards.statSubtext}>{capitalRecords.length} entries</div>
                </Card>
                <Card className={cards.statCardSuccess}>
                    <div className={cards.statLabel}>Total Income</div>
                    <div className={cards.statValue}>{formatVND(metrics.totalIncome)}</div>
                    <div className={cards.statSubtext}>{incomeRecords.length} sources</div>
                </Card>
                <Card className={cards.statCardWarning}>
                    <div className={cards.statLabel}>Total Expenses</div>
                    <div className={cards.statValue}>{formatVND(metrics.totalExpenses)}</div>
                    <div className={cards.statSubtext}>
                        Fees: {formatVND(monthlyFees.total + sellingFees.total)} |
                        Payroll: {formatVND(payrollTotal)}
                    </div>
                </Card>
                <Card className={metrics.netProfit >= 0 ? cards.statCardSuccess : cards.statCardDanger}>
                    <div className={cards.statLabel}>Net Profit</div>
                    <div className={cards.statValue}>{formatVND(metrics.netProfit)}</div>
                    <div className={cards.statSubtext}>
                        ROI: {metrics.roi.toFixed(2)}%
                    </div>
                </Card>
                <Card className={metrics.cashFlow >= 0 ? cards.statCardSuccess : cards.statCardDanger}>
                    <div className={cards.statLabel}>Cash Balance</div>
                    <div className={cards.statValue}>{formatVND(metrics.cashFlow)}</div>
                    <div className={cards.statSubtext}>
                        Capital + Income - Expenses
                    </div>
                </Card>
            </div>

            {/* Expense Breakdown */}
            <Card>
                <h3 className={styles.sectionTitle}>Expense Breakdown</h3>
                <div className={styles.expenseBreakdown}>
                    <div
                        className={styles.expenseItem}
                        onClick={onClickMonthlyFees}
                        style={{ cursor: onClickMonthlyFees ? 'pointer' : 'default' }}
                    >
                        <div className={styles.expenseLabel}>
                            <span className={styles.expenseDot} style={{ backgroundColor: '#3b82f6' }}></span>
                            Monthly Fees
                        </div>
                        <div className={styles.expenseValue}>
                            <strong>{formatVND(monthlyFees.total)}</strong>
                            <span className={styles.expenseCount}>({monthlyFees.count} items)</span>
                        </div>
                    </div>
                    <div
                        className={styles.expenseItem}
                        onClick={onClickSellingFees}
                        style={{ cursor: onClickSellingFees ? 'pointer' : 'default' }}
                    >
                        <div className={styles.expenseLabel}>
                            <span className={styles.expenseDot} style={{ backgroundColor: '#10b981' }}></span>
                            Selling Fees
                        </div>
                        <div className={styles.expenseValue}>
                            <strong>{formatVND(sellingFees.total)}</strong>
                            <span className={styles.expenseCount}>({sellingFees.count} items)</span>
                        </div>
                    </div>
                    <div
                        className={styles.expenseItem}
                        onClick={onClickPayroll}
                        style={{ cursor: onClickPayroll ? 'pointer' : 'default' }}
                    >
                        <div className={styles.expenseLabel}>
                            <span className={styles.expenseDot} style={{ backgroundColor: '#f59e0b' }}></span>
                            Payroll
                        </div>
                        <div className={styles.expenseValue}>
                            <strong>{formatVND(payrollTotal)}</strong>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Capital Records */}
            <Card>
                <div className={styles.tableHeader}>
                    <h3 className={styles.sectionTitle}>Capital Records</h3>
                    <Button variant="primary" onClick={onAddCapital}>+ Add Capital</Button>
                </div>
                <div className={tables.tableWrapper}>
                    <table className={tables.table}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Note</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {capitalRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className={layouts.textCenter}>
                                        <span className={layouts.textMuted}>No capital records yet</span>
                                    </td>
                                </tr>
                            ) : (
                                capitalRecords.map(record => (
                                    <tr key={record.id}>
                                        <td data-label="Date">{formatDate(record.date)}</td>
                                        <td data-label="Amount">
                                            <strong>{formatVND(record.amount)}</strong>
                                        </td>
                                        <td data-label="Note">{record.note || '-'}</td>
                                        <td data-label="Actions">
                                            <div className={tables.tableActionsSmall}>
                                                <Button variant="secondary" onClick={() => onEditCapital(record)}>
                                                    ✏️ Edit
                                                </Button>
                                                <Button variant="danger" onClick={() => onDeleteCapital(record.id)}>
                                                    🗑️ Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {capitalRecords.length > 0 && (
                                <tr className={styles.totalRow}>
                                    <td className={styles.totalLabel}><strong>Total</strong></td>
                                    <td className={styles.totalPrice}>
                                        <strong>{formatVND(metrics.totalCapital)}</strong>
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Income Records */}
            <Card>
                <div className={styles.tableHeader}>
                    <h3 className={styles.sectionTitle}>Income Records</h3>
                    <Button variant="primary" onClick={onAddIncome}>+ Add Income</Button>
                </div>
                <div className={tables.tableWrapper}>
                    <table className={tables.table}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Source</th>
                                <th>Amount</th>
                                <th>Note</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomeRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className={layouts.textCenter}>
                                        <span className={layouts.textMuted}>No income records yet</span>
                                    </td>
                                </tr>
                            ) : (
                                (() => {
                                    const startIndex = (incomeCurrentPage - 1) * incomeItemsPerPage;
                                    const endIndex = startIndex + incomeItemsPerPage;
                                    const paginatedRecords = incomeRecords.slice(startIndex, endIndex);

                                    return paginatedRecords.map(record => (
                                        <tr key={record.id}>
                                            <td data-label="Date">{formatDate(record.date)}</td>
                                            <td data-label="Source">{record.source}</td>
                                            <td data-label="Amount">
                                                <strong>{formatVND(record.amount)}</strong>
                                            </td>
                                            <td data-label="Note">{record.note || '-'}</td>
                                            <td data-label="Actions">
                                                <div className={tables.tableActionsSmall}>
                                                    <Button variant="secondary" onClick={() => onEditIncome(record)}>
                                                        ✏️ Edit
                                                    </Button>
                                                    <Button variant="danger" onClick={() => onDeleteIncome(record.id)}>
                                                        🗑️ Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                })()
                            )}
                            {incomeRecords.length > 0 && (
                                <tr className={styles.totalRow}>
                                    <td colSpan={2} className={styles.totalLabel}><strong>Total</strong></td>
                                    <td className={styles.totalPrice}>
                                        <strong>{formatVND(metrics.totalIncome)}</strong>
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {incomeRecords.length > incomeItemsPerPage && (
                    <div className={styles.paginationControls}>
                        <Button
                            variant="secondary"
                            onClick={() => setIncomeCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={incomeCurrentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className={styles.paginationInfo}>
                            Page {incomeCurrentPage} of {Math.ceil(incomeRecords.length / incomeItemsPerPage)}
                            {' '}({incomeRecords.length} total records)
                        </span>
                        <Button
                            variant="secondary"
                            onClick={() => setIncomeCurrentPage(prev => Math.min(Math.ceil(incomeRecords.length / incomeItemsPerPage), prev + 1))}
                            disabled={incomeCurrentPage >= Math.ceil(incomeRecords.length / incomeItemsPerPage)}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
