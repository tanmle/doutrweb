'use client';

import React, { useState } from 'react';
import { FinanceTab, CapitalModal, IncomeModal, ExpenseBreakdownModal, MonthlyFinancialBreakdown } from '../components';
import { useFinance } from '../hooks/useFinance';
import { getMonthlyBreakdown, getMonthlyFinancialBreakdown } from '../actions_finance';
import type { Capital, Income } from '../utils/types';

export default function FinancePage() {
    const {
        loading,
        capitalRecords,
        incomeRecords,
        monthlyFees,
        sellingFees,
        payrollTotal,
        createCapital,
        updateCapital,
        deleteCapital,
        createIncome,
        updateIncome,
        deleteIncome
    } = useFinance();

    const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [editingCapital, setEditingCapital] = useState<Capital | null>(null);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [capitalFormData, setCapitalFormData] = useState<any>({});
    const [incomeFormData, setIncomeFormData] = useState<any>({});
    const [submitting, setSubmitting] = useState(false);

    // Expense breakdown modal state
    const [expenseBreakdownModal, setExpenseBreakdownModal] = useState<{
        isOpen: boolean;
        title: string;
        data: any[];
        loading: boolean;
    }>({
        isOpen: false,
        title: '',
        data: [],
        loading: false
    });

    // Monthly financial breakdown modal state
    const [monthlyBreakdownModal, setMonthlyBreakdownModal] = useState<{
        isOpen: boolean;
        data: any[];
        loading: boolean;
    }>({
        isOpen: false,
        data: [],
        loading: false
    });

    const today = new Date().toISOString().split('T')[0];

    const handleAddCapital = () => {
        setEditingCapital(null);
        setCapitalFormData({ amount: '', date: today, note: '' });
        setIsCapitalModalOpen(true);
    };

    const handleAddIncome = () => {
        setEditingIncome(null);
        setIncomeFormData({ source: '', amount: '', date: today, note: '' });
        setIsIncomeModalOpen(true);
    };

    const handleEditCapital = (record: Capital) => {
        setEditingCapital(record);
        setCapitalFormData({
            amount: String(record.amount), // Convert number to string for input
            date: record.date,
            note: record.note || ''
        });
        setIsCapitalModalOpen(true);
    };

    const handleEditIncome = (record: Income) => {
        setEditingIncome(record);
        setIncomeFormData({
            source: record.source,
            amount: String(record.amount), // Convert number to string for input
            date: record.date,
            note: record.note || ''
        });
        setIsIncomeModalOpen(true);
    };

    const handleDeleteCapital = async (id: string) => {
        if (!confirm('Are you sure you want to delete this capital entry?')) return;
        await deleteCapital(id);
    };

    const handleDeleteIncome = async (id: string) => {
        if (!confirm('Are you sure you want to delete this income entry?')) return;
        await deleteIncome(id);
    };

    const handleCapitalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingCapital) {
                await updateCapital(editingCapital.id, capitalFormData);
            } else {
                await createCapital(capitalFormData);
            }
            setIsCapitalModalOpen(false);
            setCapitalFormData({});
        } catch (error) {
            // Error is handled by the hook with toast
        } finally {
            setSubmitting(false);
        }
    };

    const handleIncomeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingIncome) {
                await updateIncome(editingIncome.id, incomeFormData);
            } else {
                await createIncome(incomeFormData);
            }
            setIsIncomeModalOpen(false);
            setIncomeFormData({});
        } catch (error) {
            // Error is handled by the hook with toast
        } finally {
            setSubmitting(false);
        }
    };

    const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCapitalFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setIncomeFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    // Expense breakdown handlers
    const handleClickExpense = async (type: 'monthly_fees' | 'selling_fees' | 'payroll', title: string) => {
        setExpenseBreakdownModal({
            isOpen: true,
            title,
            data: [],
            loading: true
        });

        try {
            const data = await getMonthlyBreakdown(type);
            setExpenseBreakdownModal({
                isOpen: true,
                title,
                data,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching breakdown:', error);
            setExpenseBreakdownModal({
                isOpen: true,
                title,
                data: [],
                loading: false
            });
        }
    };

    // Monthly financial breakdown handler
    const handleViewMonthlyBreakdown = async () => {
        setMonthlyBreakdownModal({
            isOpen: true,
            data: [],
            loading: true
        });

        try {
            const data = await getMonthlyFinancialBreakdown();
            setMonthlyBreakdownModal({
                isOpen: true,
                data,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching monthly breakdown:', error);
            setMonthlyBreakdownModal({
                isOpen: true,
                data: [],
                loading: false
            });
        }
    };

    return (
        <>
            <FinanceTab
                loading={loading}
                capitalRecords={capitalRecords}
                incomeRecords={incomeRecords}
                monthlyFees={monthlyFees}
                sellingFees={sellingFees}
                payrollTotal={payrollTotal}
                onAddCapital={handleAddCapital}
                onAddIncome={handleAddIncome}
                onEditCapital={handleEditCapital}
                onEditIncome={handleEditIncome}
                onDeleteCapital={handleDeleteCapital}
                onDeleteIncome={handleDeleteIncome}
                onClickMonthlyFees={() => handleClickExpense('monthly_fees', 'Monthly Fees')}
                onClickSellingFees={() => handleClickExpense('selling_fees', 'Selling Fees')}
                onClickPayroll={() => handleClickExpense('payroll', 'Payroll')}
                onViewMonthlyBreakdown={handleViewMonthlyBreakdown}
            />

            <CapitalModal
                isOpen={isCapitalModalOpen}
                isEdit={!!editingCapital}
                formData={capitalFormData}
                loading={submitting}
                today={today}
                onClose={() => {
                    setIsCapitalModalOpen(false);
                    setCapitalFormData({});
                }}
                onSubmit={handleCapitalSubmit}
                onChange={handleCapitalChange}
            />

            <IncomeModal
                isOpen={isIncomeModalOpen}
                isEdit={!!editingIncome}
                formData={incomeFormData}
                loading={submitting}
                today={today}
                onClose={() => {
                    setIsIncomeModalOpen(false);
                    setIncomeFormData({});
                }}
                onSubmit={handleIncomeSubmit}
                onChange={handleIncomeChange}
            />

            <ExpenseBreakdownModal
                isOpen={expenseBreakdownModal.isOpen}
                title={expenseBreakdownModal.title}
                data={expenseBreakdownModal.data}
                loading={expenseBreakdownModal.loading}
                onClose={() => setExpenseBreakdownModal({ isOpen: false, title: '', data: [], loading: false })}
            />

            <MonthlyFinancialBreakdown
                isOpen={monthlyBreakdownModal.isOpen}
                data={monthlyBreakdownModal.data}
                loading={monthlyBreakdownModal.loading}
                onClose={() => setMonthlyBreakdownModal({ isOpen: false, data: [], loading: false })}
            />
        </>
    );
}
