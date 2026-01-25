'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useToast } from '@/components/ui/ToastProvider';
import { usePayroll } from '../hooks/usePayroll';
import { generatePayroll, updatePayrollRecord } from '../actions_payroll';
import {
    PayrollTab,
    PayrollModal,
    GeneratePayrollModal,
    AdminTableStyles,
} from '../components';
import type { PayrollRecord } from '../utils/types';
import { useRealtime } from '@/hooks/useRealtime';

export default function AdminPayrollPage() {
    const [loading, setLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const [selectedPayrollRecord, setSelectedPayrollRecord] = useState<PayrollRecord | null>(null);
    const [isGeneratePayrollModalOpen, setIsGeneratePayrollModalOpen] = useState(false);

    const toast = useToast();

    const {
        loading: dataLoading,
        payrollRecords,
        users,
    } = usePayroll(payrollMonth, refresh);

    useRealtime({
        table: 'payroll_records',
        onData: () => setRefresh(prev => prev + 1)
    });

    const handleGeneratePayroll = () => {
        setIsGeneratePayrollModalOpen(true);
    };

    const handleBulkGenerateSubmit = async (standardDays: number, userDays: Record<string, number>) => {
        setLoading(true);
        const result = await generatePayroll(payrollMonth, standardDays, userDays);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Payroll generated for ${payrollMonth}`);
            setRefresh(prev => prev + 1);
            setIsGeneratePayrollModalOpen(false);
        }
        setLoading(false);
    };

    const openEditPayrollModal = (record: PayrollRecord) => {
        setSelectedPayrollRecord(record);
        setIsPayrollModalOpen(true);
    };

    const handleUpdatePayrollSubmit = async (data: any) => {
        if (!selectedPayrollRecord) return;
        setLoading(true);
        const result = await updatePayrollRecord(selectedPayrollRecord.id, {
            standard_work_days: data.standard_work_days,
            actual_work_days: data.actual_work_days,
            bonus: data.bonus,
            total_salary: data.total_salary,
            status: data.status
        });

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Payroll record updated');
            setIsPayrollModalOpen(false);
            setSelectedPayrollRecord(null);
            setRefresh(prev => prev + 1);
        }
        setLoading(false);
    };

    if (dataLoading) {
        return <LoadingIndicator label="Loading payroll..." />;
    }

    return (
        <>
            <Card>
                <PayrollTab
                    payrollRecords={payrollRecords}
                    users={users}
                    loading={dataLoading}
                    month={payrollMonth}
                    onMonthChange={setPayrollMonth}
                    onGenerate={handleGeneratePayroll}
                    onEdit={openEditPayrollModal}
                />
            </Card>

            <GeneratePayrollModal
                isOpen={isGeneratePayrollModalOpen}
                users={users}
                existingRecords={payrollRecords}
                month={payrollMonth}
                loading={loading}
                onClose={() => setIsGeneratePayrollModalOpen(false)}
                onSubmit={handleBulkGenerateSubmit}
            />

            <PayrollModal
                isOpen={isPayrollModalOpen}
                record={selectedPayrollRecord}
                user={selectedPayrollRecord?.user ? {
                    id: selectedPayrollRecord.user_id,
                    full_name: selectedPayrollRecord.user.full_name,
                    base_salary: selectedPayrollRecord.user.base_salary,
                    bank_name: selectedPayrollRecord.user.bank_name,
                    bank_number: selectedPayrollRecord.user.bank_number
                } : null}
                month={payrollMonth}
                loading={loading}
                onClose={() => setIsPayrollModalOpen(false)}
                onSubmit={handleUpdatePayrollSubmit}
            />

            <AdminTableStyles />
        </>
    );
}
