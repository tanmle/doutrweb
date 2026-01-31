'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getCapitalRecords,
    getIncomeRecords,
    getFinancialSummary,
    createCapital,
    updateCapital,
    deleteCapital,
    createIncome,
    updateIncome,
    deleteIncome
} from '../actions_finance';
import type { Capital, Income } from '../utils/types';
import { useToast } from '@/components/ui/ToastProvider';
import { parseCurrency } from '@/utils/currency';

interface FinancialSummary {
    monthlyFees: { total: number; count: number };
    sellingFees: { total: number; count: number };
    payrollTotal: number;
}

export function useFinance() {
    const [loading, setLoading] = useState(true);
    const [capitalRecords, setCapitalRecords] = useState<Capital[]>([]);
    const [incomeRecords, setIncomeRecords] = useState<Income[]>([]);
    const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
        monthlyFees: { total: 0, count: 0 },
        sellingFees: { total: 0, count: 0 },
        payrollTotal: 0
    });
    const toast = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            console.log('useFinance - Fetching lifetime data');
            const [capital, income, summary] = await Promise.all([
                getCapitalRecords(),
                getIncomeRecords(),
                getFinancialSummary()
            ]);

            console.log('useFinance - Capital records:', capital);
            console.log('useFinance - Income records:', income);
            console.log('useFinance - Financial summary:', summary);

            setCapitalRecords(capital);
            setIncomeRecords(income);
            setFinancialSummary(summary);
        } catch (error) {
            console.error('Error fetching finance data:', error);
            toast.error('Failed to load finance data');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Capital operations
    const handleCreateCapital = useCallback(async (formData: any) => {
        try {
            const capitalData = {
                amount: parseCurrency(formData.amount),
                date: formData.date,
                note: formData.note
            };

            const newRecord = await createCapital(capitalData);
            setCapitalRecords(prev => [newRecord, ...prev]);
            toast.success('Capital entry added successfully');
            return newRecord;
        } catch (error) {
            console.error('Error creating capital:', error);
            toast.error('Failed to add capital entry');
            throw error;
        }
    }, [toast]);

    const handleUpdateCapital = useCallback(async (id: string, formData: any) => {
        try {
            const capitalData = {
                amount: parseCurrency(formData.amount),
                date: formData.date,
                note: formData.note
            };

            const updated = await updateCapital(id, capitalData);
            setCapitalRecords(prev => prev.map(r => r.id === id ? updated : r));
            toast.success('Capital entry updated successfully');
            return updated;
        } catch (error) {
            console.error('Error updating capital:', error);
            toast.error('Failed to update capital entry');
            throw error;
        }
    }, [toast]);

    const handleDeleteCapital = useCallback(async (id: string) => {
        try {
            await deleteCapital(id);
            setCapitalRecords(prev => prev.filter(r => r.id !== id));
            toast.success('Capital entry deleted successfully');
        } catch (error) {
            console.error('Error deleting capital:', error);
            toast.error('Failed to delete capital entry');
            throw error;
        }
    }, [toast]);

    // Income operations
    const handleCreateIncome = useCallback(async (formData: any) => {
        try {
            const incomeData = {
                amount: parseCurrency(formData.amount),
                source: formData.source,
                date: formData.date,
                note: formData.note
            };

            const newRecord = await createIncome(incomeData);
            setIncomeRecords(prev => [newRecord, ...prev]);
            toast.success('Income entry added successfully');
            return newRecord;
        } catch (error) {
            console.error('Error creating income:', error);
            toast.error('Failed to add income entry');
            throw error;
        }
    }, [toast]);

    const handleUpdateIncome = useCallback(async (id: string, formData: any) => {
        try {
            const incomeData = {
                amount: parseCurrency(formData.amount),
                source: formData.source,
                date: formData.date,
                note: formData.note
            };

            const updated = await updateIncome(id, incomeData);
            setIncomeRecords(prev => prev.map(r => r.id === id ? updated : r));
            toast.success('Income entry updated successfully');
            return updated;
        } catch (error) {
            console.error('Error updating income:', error);
            toast.error('Failed to update income entry');
            throw error;
        }
    }, [toast]);

    const handleDeleteIncome = useCallback(async (id: string) => {
        try {
            await deleteIncome(id);
            setIncomeRecords(prev => prev.filter(r => r.id !== id));
            toast.success('Income entry deleted successfully');
        } catch (error) {
            console.error('Error deleting income:', error);
            toast.error('Failed to delete income entry');
            throw error;
        }
    }, [toast]);

    return {
        loading,
        capitalRecords,
        incomeRecords,
        monthlyFees: financialSummary.monthlyFees,
        sellingFees: financialSummary.sellingFees,
        payrollTotal: financialSummary.payrollTotal,
        createCapital: handleCreateCapital,
        updateCapital: handleUpdateCapital,
        deleteCapital: handleDeleteCapital,
        createIncome: handleCreateIncome,
        updateIncome: handleUpdateIncome,
        deleteIncome: handleDeleteIncome,
        refresh: fetchData
    };
}
