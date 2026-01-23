import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PayrollRecord } from '../utils/types';
import { formatCurrency, parseCurrency } from '@/utils/currency';
import { PayrollSummaryCard } from './PayrollSummaryCard';
import { PayrollQRCode } from './PayrollQRCode';
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

    useEffect(() => {
        if (isOpen && record) {
            setFormData({
                standard_work_days: record.standard_work_days || 26,
                actual_work_days: record.actual_work_days || 0,
                bonus: record.bonus || 0,
                status: record.status || 'pending'
            });
        } else if (isOpen) {
            setFormData({
                standard_work_days: 26,
                actual_work_days: 0,
                bonus: 0,
                status: 'pending'
            });
        }
    }, [isOpen, record]);

    const baseSalary = user?.base_salary || 0;
    const calculateTotal = () => {
        const standard = Number(formData.standard_work_days) || 1;
        const actual = Number(formData.actual_work_days) || 0;
        const bonus = Number(formData.bonus) || 0;
        const salary = (baseSalary / standard) * actual;
        return Math.floor(salary + bonus);
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
            total_salary: totalSalary
        });
    };

    const markAsPaid = () => {
        onSubmit({
            ...formData,
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
