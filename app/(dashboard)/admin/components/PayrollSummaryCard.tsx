import React from 'react';
import { formatVND } from '../utils/formatters';
import styles from './AdminComponents.module.css';

interface PayrollSummaryCardProps {
    baseSalary: number;
    totalSalary: number;
    status: string;
}

export function PayrollSummaryCard({ baseSalary, totalSalary, status }: PayrollSummaryCardProps) {
    return (
        <div className={styles.payrollSummary}>
            <div className={styles.payrollSummaryRow}>
                <span className={styles.payrollSummaryLabel}>Base Salary:</span>
                <span className={styles.payrollSummaryValue}>{formatVND(baseSalary)}</span>
            </div>
            <div className={styles.payrollSummaryRowSpaced}>
                <span className={styles.payrollSummaryTotalLabel}>Total Salary:</span>
                <span className={styles.payrollSummaryTotalValue}>{formatVND(totalSalary)}</span>
            </div>
            <div className={styles.payrollSummaryRowBordered}>
                <span className={styles.payrollSummaryLabel}>Status:</span>
                <span className={`${styles.payrollStatusBadge} ${status === 'paid' ? styles.payrollStatusPaid : styles.payrollStatusPending
                    }`}>
                    {status}
                </span>
            </div>
        </div>
    );
}
