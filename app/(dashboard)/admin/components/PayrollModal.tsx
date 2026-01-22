import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PayrollRecord } from '../utils/types';
import styles from './AdminComponents.module.css';

interface PayrollModalProps {
    isOpen: boolean;
    record: PayrollRecord | null; // If null, we might be creating one, but usually we edit existing or generated ones
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
            // Defaults for new record
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
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                    label="Bonus"
                    type="number"
                    value={formData.bonus}
                    onChange={e => setFormData({ ...formData, bonus: Number(e.target.value) })}
                />

                <div className={styles.summaryBox} style={{ background: 'var(--background-secondary)', padding: '1rem', borderRadius: '8px' }}>
                    <p>Base Salary: <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(baseSalary)}</strong></p>
                    <p style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>
                        Total Salary: <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalSalary)}</strong>
                    </p>
                    <p>Status: <span style={{
                        color: formData.status === 'paid' ? 'var(--success)' : 'var(--warning)',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                    }}>{formData.status}</span></p>
                </div>

                {qrUrl && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <p style={{ marginBottom: '0.5rem' }}>Scan to Pay with VietQR</p>
                        <img src={qrUrl} alt="VietQR" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    </div>
                )}

                {!qrUrl && (
                    <p style={{ color: 'var(--error)', fontSize: '0.9rem', textAlign: 'center' }}>
                        User bank info missing. Cannot generate QR.
                    </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="submit" disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'Saving...' : 'Save Record'}
                    </Button>
                    {formData.status !== 'paid' && (
                        <Button type="button" variant="secondary" onClick={markAsPaid} disabled={loading} style={{ flex: 1, backgroundColor: 'var(--success)', color: 'white' }}>
                            Mark as Paid
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
}
