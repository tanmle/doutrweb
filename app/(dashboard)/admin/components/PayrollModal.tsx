import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PayrollRecord, SalaryPeriod } from '../utils/types';
import { formatCurrency, parseCurrency } from '@/utils/currency';
import { PayrollSummaryCard } from './PayrollSummaryCard';
import { PayrollQRCode } from './PayrollQRCode';
import { SalaryPeriodsEditor } from './SalaryPeriodsEditor';
import styles from './AdminComponents.module.css';

interface PayrollModalProps {
    isOpen: boolean;
    record: PayrollRecord | null;
    user: { id: string; full_name: string; base_salary?: number; bank_name?: string; bank_number?: string } | null;
    month: string;
    loading: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

export function PayrollModal({
    isOpen,
    record,
    user,
    month,
    loading,
    onClose,
    onSubmit
}: PayrollModalProps) {
    const [formData, setFormData] = useState({
        standard_work_days: 26,
        actual_work_days: 0,
        bonus: 0,
        status: 'pending'
    });
    const [salaryPeriods, setSalaryPeriods] = useState<SalaryPeriod[]>([]);

    useEffect(() => {
        if (isOpen && record) {
            setFormData({
                standard_work_days: record.standard_work_days || 26,
                actual_work_days: record.actual_work_days || 0,
                bonus: record.bonus || 0,
                status: record.status || 'pending'
            });
            setSalaryPeriods(record.salary_periods || []);
        } else if (isOpen) {
            setFormData({
                standard_work_days: 26,
                actual_work_days: 0,
                bonus: 0,
                status: 'pending'
            });
            setSalaryPeriods([]);
        }
    }, [isOpen, record]);

    const baseSalary = user?.base_salary || 0;

    const calculateTotal = () => {
        const bonus = Number(formData.bonus) || 0;

        // If there are custom salary periods, use them
        if (salaryPeriods.length > 0) {
            const standard = Number(formData.standard_work_days) || 26;
            const periodsSalary = salaryPeriods.reduce((sum, period) => {
                // Recalculate daily_rate from monthly_salary if available to ensure consistency
                const dailyRate = period.monthly_salary
                    ? Math.round(period.monthly_salary / standard)
                    : period.daily_rate;
                return sum + (period.days * dailyRate);
            }, 0);
            return Math.floor(periodsSalary + bonus);
        }

        // Otherwise use standard calculation
        const standard = Number(formData.standard_work_days) || 1;
        const actual = Number(formData.actual_work_days) || 0;
        const salary = (baseSalary / standard) * actual;
        return Math.floor(salary + bonus);
    };

    const handlePeriodsChange = (periods: SalaryPeriod[]) => {
        setSalaryPeriods(periods);
        // Auto-update actual days based on periods
        const totalDays = periods.reduce((sum, p) => sum + p.days, 0);
        setFormData({ ...formData, actual_work_days: totalDays });
    };

    const totalSalary = calculateTotal();

    // Extract bank short name (e.g. "VCB" from "VCB - Vietcombank")
    const bankShortName = user?.bank_name ? user.bank_name.split(' - ')[0] : '';

    const qrUrl = bankShortName && user?.bank_number
        ? `https://img.vietqr.io/image/${bankShortName}-${user.bank_number}-compact2.jpg?amount=${totalSalary}&addInfo=Salary%20${month}`
        : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            salary_periods: salaryPeriods.length > 0 ? salaryPeriods : null,
            total_salary: totalSalary
        });
    };

    const markAsPaid = () => {
        onSubmit({
            ...formData,
            salary_periods: salaryPeriods.length > 0 ? salaryPeriods : null,
            total_salary: totalSalary,
            status: 'paid'
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Payroll: ${user?.full_name} (${month})`}
        >
            <form onSubmit={handleSubmit} className={styles.modalForm}>
                <div className={styles.modalInputGrid}>
                    <Input
                        label="Standard Work Days"
                        type="number"
                        value={formData.standard_work_days}
                        onChange={e => setFormData({ ...formData, standard_work_days: Number(e.target.value) })}
                    />
                    <Input
                        label="Actual Work Days"
                        type="number"
                        value={formData.actual_work_days}
                        onChange={e => setFormData({ ...formData, actual_work_days: Number(e.target.value) })}
                    />
                </div>

                <SalaryPeriodsEditor
                    periods={salaryPeriods}
                    standardDays={formData.standard_work_days}
                    baseSalary={baseSalary}
                    onChange={handlePeriodsChange}
                />

                <Input
                    label="Bonus (VND)"
                    name="bonus"
                    value={formatCurrency(formData.bonus)}
                    onChange={(e) => {
                        const numericValue = parseCurrency(e.target.value);
                        setFormData({ ...formData, bonus: numericValue });
                    }}
                />

                <PayrollSummaryCard
                    baseSalary={baseSalary}
                    totalSalary={totalSalary}
                    status={formData.status}
                />

                <PayrollQRCode qrUrl={qrUrl} />

                <div className={styles.modalButtonGroup}>
                    <Button type="submit" disabled={loading} className={styles.buttonFlex}>
                        {loading ? 'Saving...' : 'Save Record'}
                    </Button>
                    {formData.status !== 'paid' && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={markAsPaid}
                            disabled={loading}
                            className={styles.buttonSuccess}
                        >
                            Mark as Paid
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
}
