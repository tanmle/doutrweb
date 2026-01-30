import React from 'react';
import { Button } from '@/components/ui/Button';
import { SalaryPeriod } from '../utils/types';
import { formatCurrency } from '@/utils/currency';
import styles from './AdminComponents.module.css';

interface SalaryPeriodsEditorProps {
    periods: SalaryPeriod[];
    standardDays: number;
    baseSalary: number;
    onChange: (periods: SalaryPeriod[]) => void;
}

export function SalaryPeriodsEditor({
    periods,
    standardDays,
    baseSalary,
    onChange
}: SalaryPeriodsEditorProps) {
    const addPeriod = () => {
        const defaultDailyRate = Math.round(baseSalary / standardDays);
        onChange([...periods, { days: 1, daily_rate: defaultDailyRate, monthly_salary: baseSalary }]);
    };

    const removePeriod = (index: number) => {
        onChange(periods.filter((_, i) => i !== index));
    };

    const updatePeriodDays = (index: number, days: number) => {
        const updated = [...periods];
        updated[index] = { ...updated[index], days };
        onChange(updated);
    };

    const updatePeriodMonthlySalary = (index: number, monthlySalary: number) => {
        const dailyRate = Math.round(monthlySalary / standardDays);
        const updated = [...periods];
        updated[index] = { ...updated[index], daily_rate: dailyRate, monthly_salary: monthlySalary };
        onChange(updated);
    };

    const totalDays = periods.reduce((sum, p) => sum + p.days, 0);
    const totalSalary = periods.reduce((sum, p) => sum + (p.days * p.daily_rate), 0);

    return (
        <div className={styles.salaryPeriodsEditor}>
            <div className={styles.salaryPeriodsHeader}>
                <h4 className={styles.salaryPeriodsTitle}>Salary Periods</h4>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={addPeriod}
                    className={styles.salaryPeriodsAddButton}
                >
                    + Add Period
                </Button>
            </div>

            {periods.length === 0 ? (
                <p className={styles.salaryPeriodsEmpty}>
                    No custom periods. Click "Add Period" to define different monthly salaries for different days.
                </p>
            ) : (
                <div className={styles.salaryPeriodsList}>
                    {periods.map((period, index) => {
                        // Use stored monthly_salary if available, otherwise calculate from daily_rate
                        const monthlySalary = period.monthly_salary ?? Math.round(period.daily_rate * standardDays);

                        return (
                            <div key={index} className={styles.salaryPeriodRow}>
                                <div className={styles.salaryPeriodFields}>
                                    <div className={styles.salaryPeriodField}>
                                        <label className={styles.salaryPeriodLabel}>Days</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={period.days}
                                            onChange={(e) => updatePeriodDays(index, parseFloat(e.target.value) || 0)}
                                            className={styles.salaryPeriodInput}
                                        />
                                    </div>
                                    <div className={styles.salaryPeriodField}>
                                        <label className={styles.salaryPeriodLabel}>Monthly Salary (VND)</label>
                                        <input
                                            type="text"
                                            value={formatCurrency(monthlySalary)}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                updatePeriodMonthlySalary(index, parseFloat(rawValue) || 0);
                                            }}
                                            className={styles.salaryPeriodInput}
                                            placeholder="e.g., 4,000,000 ₫"
                                        />
                                        <div className={styles.salaryQuickButtons}>
                                            <button
                                                type="button"
                                                onClick={() => updatePeriodMonthlySalary(index, 2000000)}
                                                className={styles.salaryQuickButton}
                                            >
                                                2M
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updatePeriodMonthlySalary(index, 4000000)}
                                                className={styles.salaryQuickButton}
                                            >
                                                4M
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updatePeriodMonthlySalary(index, 5000000)}
                                                className={styles.salaryQuickButton}
                                            >
                                                5M
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.salaryPeriodField}>
                                        <label className={styles.salaryPeriodLabel}>Daily Rate</label>
                                        <div className={styles.salaryPeriodSubtotal}>
                                            {formatCurrency(period.daily_rate)}
                                        </div>
                                    </div>
                                    <div className={styles.salaryPeriodField}>
                                        <label className={styles.salaryPeriodLabel}>Subtotal</label>
                                        <div className={styles.salaryPeriodSubtotal}>
                                            {formatCurrency(period.days * period.daily_rate)}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => removePeriod(index)}
                                    className={styles.salaryPeriodRemove}
                                >
                                    ✕
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}

            {periods.length > 0 && (
                <div className={styles.salaryPeriodsSummary}>
                    <div className={styles.salaryPeriodsSummaryRow}>
                        <span>Total Days:</span>
                        <strong>{totalDays}</strong>
                    </div>
                    <div className={styles.salaryPeriodsSummaryRow}>
                        <span>Total Salary:</span>
                        <strong>{formatCurrency(totalSalary)}</strong>
                    </div>
                </div>
            )}
        </div>
    );
}
