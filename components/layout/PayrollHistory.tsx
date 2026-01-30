import React, { useState } from 'react';
import { formatCurrency } from '@/utils/currency';
import styles from './PayrollHistory.module.css';

interface SalaryPeriod {
    days: number;
    daily_rate: number;
    monthly_salary?: number;
}

interface PayrollRecord {
    id: string;
    month: string;
    standard_work_days: number;
    actual_work_days: number;
    salary_periods?: SalaryPeriod[];
    bonus: number;
    total_salary: number;
    status: 'pending' | 'paid';
}

interface PayrollHistoryProps {
    records: PayrollRecord[];
    baseSalary: number;
}

export const PayrollHistory: React.FC<PayrollHistoryProps> = ({ records, baseSalary }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const formatMonth = (monthStr: string) => {
        const date = new Date(monthStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    // Filter to show only the last 2 months, sorted by most recent first
    const recentRecords = [...records]
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
        .slice(0, 2);

    if (recentRecords.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>💰</div>
                <p className={styles.emptyText}>No payroll records yet</p>
            </div>
        );
    }

    return (
        <div className={styles.payrollHistory}>
            {recentRecords.map((record) => {
                const isExpanded = expandedId === record.id;
                const baseSalaryAmount = record.salary_periods
                    ? record.salary_periods.reduce((sum, p) => sum + (p.days * p.daily_rate), 0)
                    : (baseSalary / record.standard_work_days) * record.actual_work_days;

                return (
                    <div key={record.id} className={styles.recordCard}>
                        {/* Header - Always Visible */}
                        <div
                            className={styles.recordHeader}
                            onClick={() => toggleExpand(record.id)}
                        >
                            <div className={styles.recordMonth}>
                                <span className={styles.monthIcon}>📅</span>
                                <span className={styles.monthText}>{formatMonth(record.month)}</span>
                            </div>

                            <div className={styles.recordSummary}>
                                <div className={styles.totalAmount}>
                                    {formatCurrency(record.total_salary)}
                                </div>
                                <div className={`${styles.statusBadge} ${styles[`status${record.status.charAt(0).toUpperCase() + record.status.slice(1)}`]}`}>
                                    {record.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                                </div>
                            </div>

                            <button
                                type="button"
                                className={styles.expandButton}
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                                {isExpanded ? '▼' : '▶'}
                            </button>
                        </div>

                        {/* Details - Expandable */}
                        {isExpanded && (
                            <div className={styles.recordDetails}>
                                <div className={styles.detailsGrid}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Standard Days</span>
                                        <span className={styles.detailValue}>{record.standard_work_days} days</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Actual Days</span>
                                        <span className={styles.detailValue}>{record.actual_work_days} days</span>
                                    </div>
                                </div>

                                {/* Salary Periods Breakdown */}
                                {record.salary_periods && record.salary_periods.length > 0 && (
                                    <div className={styles.periodsSection}>
                                        <div className={styles.periodsSectionTitle}>
                                            <span className={styles.periodsIcon}>📊</span>
                                            Salary Periods Breakdown
                                        </div>
                                        <div className={styles.periodsList}>
                                            {record.salary_periods.map((period, idx) => (
                                                <div key={idx} className={styles.periodItem}>
                                                    <div className={styles.periodDays}>
                                                        {period.days} days
                                                    </div>
                                                    <div className={styles.periodRate}>
                                                        @ {formatCurrency(period.daily_rate)}/day
                                                    </div>
                                                    <div className={styles.periodTotal}>
                                                        = {formatCurrency(period.days * period.daily_rate)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Calculation Breakdown */}
                                <div className={styles.calculationSection}>
                                    <div className={styles.calculationRow}>
                                        <span className={styles.calculationLabel}>Base Salary</span>
                                        <span className={styles.calculationValue}>{formatCurrency(baseSalaryAmount)}</span>
                                    </div>
                                    {record.bonus > 0 && (
                                        <div className={styles.calculationRow}>
                                            <span className={styles.calculationLabel}>Bonus</span>
                                            <span className={`${styles.calculationValue} ${styles.bonusValue}`}>
                                                +{formatCurrency(record.bonus)}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`${styles.calculationRow} ${styles.totalRow}`}>
                                        <span className={styles.calculationLabel}>Total</span>
                                        <span className={styles.calculationValue}>{formatCurrency(record.total_salary)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
