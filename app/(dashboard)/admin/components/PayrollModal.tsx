import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PayrollRecord } from '../utils/types';
import { formatCurrency, parseCurrency } from '@/utils/currency';
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
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
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

                <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Base Salary:</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(baseSalary)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                        <span style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 600 }}>Total Salary:</span>
                        <span style={{ fontSize: '1.4rem', color: '#818cf8', fontWeight: 800 }}>{formatCurrency(totalSalary)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Status:</span>
                        <span style={{
                            color: formData.status === 'paid' ? '#10b981' : '#f59e0b',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            background: formData.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                        }}>{formData.status}</span>
                    </div>
                </div>

                {qrUrl && (
                    <div style={{ textAlign: 'center', marginTop: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px dotted var(--border)' }}>
                        <p style={{ marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Scan to Pay with VietQR</p>
                        <img src={qrUrl} alt="VietQR" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }} />
                    </div>
                )}

                {!qrUrl && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px' }}>
                        User bank info missing. Cannot generate QR.
                    </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="submit" disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'Saving...' : 'Save Record'}
                    </Button>
                    {formData.status !== 'paid' && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={markAsPaid}
                            disabled={loading}
                            style={{
                                flex: 1,
                                backgroundColor: '#10b981',
                                color: 'white',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            Mark as Paid
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
}
