'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface CapitalData {
    amount: number;
    date: string;
    note?: string;
}

interface IncomeData {
    amount: number;
    source: string;
    date: string;
    note?: string;
}

// ============================================
// CAPITAL RECORDS
// ============================================

export async function getCapitalRecords() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('capital_records')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching capital records:', error);
        throw new Error('Failed to fetch capital records');
    }

    return data;
}

export async function createCapital(capitalData: CapitalData) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('capital_records')
        .insert({
            amount: capitalData.amount,
            date: capitalData.date,
            note: capitalData.note || null,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating capital record:', error);
        throw new Error('Failed to create capital record');
    }

    revalidatePath('/admin/finance');
    return data;
}

export async function updateCapital(id: string, capitalData: CapitalData) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('capital_records')
        .update({
            amount: capitalData.amount,
            date: capitalData.date,
            note: capitalData.note || null
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating capital record:', error);
        throw new Error('Failed to update capital record');
    }

    revalidatePath('/admin/finance');
    return data;
}

export async function deleteCapital(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('capital_records')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting capital record:', error);
        throw new Error('Failed to delete capital record');
    }

    revalidatePath('/admin/finance');
    return { success: true };
}

// ============================================
// INCOME RECORDS
// ============================================

export async function getIncomeRecords() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('income_records')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching income records:', error);
        throw new Error('Failed to fetch income records');
    }

    return data;
}

export async function createIncome(incomeData: IncomeData) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('income_records')
        .insert({
            amount: incomeData.amount,
            source: incomeData.source,
            date: incomeData.date,
            note: incomeData.note || null,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating income record:', error);
        throw new Error('Failed to create income record');
    }

    revalidatePath('/admin/finance');
    return data;
}

export async function updateIncome(id: string, incomeData: IncomeData) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('income_records')
        .update({
            amount: incomeData.amount,
            source: incomeData.source,
            date: incomeData.date,
            note: incomeData.note || null
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating income record:', error);
        throw new Error('Failed to update income record');
    }

    revalidatePath('/admin/finance');
    return data;
}

export async function deleteIncome(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('income_records')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting income record:', error);
        throw new Error('Failed to delete income record');
    }

    revalidatePath('/admin/finance');
    return { success: true };
}

// ============================================
// FINANCIAL SUMMARY
// ============================================

export async function getFinancialSummary() {
    const supabase = await createClient();

    console.log('Finance Summary - Fetching lifetime totals');

    // Fetch all monthly fees (lifetime)
    const { data: monthlyFeesData, error: monthlyFeesError } = await supabase
        .from('monthly_fees')
        .select('price');

    if (monthlyFeesError) {
        console.error('Error fetching monthly fees:', monthlyFeesError);
    }

    const monthlyFeesTotal = monthlyFeesData?.reduce((sum, fee) => sum + (fee.price || 0), 0) || 0;
    const monthlyFeesCount = monthlyFeesData?.length || 0;

    console.log('Monthly Fees (Lifetime):', { total: monthlyFeesTotal, count: monthlyFeesCount });

    // Fetch all selling fees (lifetime)
    const { data: sellingFeesData, error: sellingFeesError } = await supabase
        .from('selling_fees')
        .select('price');

    if (sellingFeesError) {
        console.error('Error fetching selling fees:', sellingFeesError);
    }

    const sellingFeesTotal = sellingFeesData?.reduce((sum, fee) => sum + (fee.price || 0), 0) || 0;
    const sellingFeesCount = sellingFeesData?.length || 0;

    console.log('Selling Fees (Lifetime):', { total: sellingFeesTotal, count: sellingFeesCount });

    // Fetch all payroll (lifetime)
    const { data: payrollData, error: payrollError } = await supabase
        .from('payroll_records')
        .select('total_salary');

    if (payrollError) {
        console.error('Error fetching payroll:', payrollError);
    }

    const payrollTotal = payrollData?.reduce((sum, record) => sum + (record.total_salary || 0), 0) || 0;

    console.log('Payroll (Lifetime):', { total: payrollTotal });

    return {
        monthlyFees: {
            total: monthlyFeesTotal,
            count: monthlyFeesCount
        },
        sellingFees: {
            total: sellingFeesTotal,
            count: sellingFeesCount
        },
        payrollTotal
    };
}

// ============================================
// MONTHLY BREAKDOWN
// ============================================

export async function getMonthlyBreakdown(type: 'monthly_fees' | 'selling_fees' | 'payroll') {
    const supabase = await createClient();

    console.log('Fetching monthly breakdown for:', type);

    if (type === 'payroll') {
        // Payroll is already grouped by month
        const { data, error } = await supabase
            .from('payroll_records')
            .select('month, total_salary')
            .order('month', { ascending: false });

        if (error) {
            console.error('Error fetching payroll breakdown:', error);
            throw new Error('Failed to fetch payroll breakdown');
        }

        // Group by month and sum
        const grouped = data.reduce((acc: any, record) => {
            const month = record.month;
            if (!acc[month]) {
                acc[month] = { month, total: 0, count: 0 };
            }
            acc[month].total += record.total_salary || 0;
            acc[month].count += 1;
            return acc;
        }, {});

        return Object.values(grouped);
    } else {
        // For fees, we need to extract month from date
        const tableName = type;
        const { data, error } = await supabase
            .from(tableName)
            .select('date, price')
            .order('date', { ascending: false });

        if (error) {
            console.error(`Error fetching ${type} breakdown:`, error);
            throw new Error(`Failed to fetch ${type} breakdown`);
        }

        // Group by month (YYYY-MM)
        const grouped = data.reduce((acc: any, record) => {
            const month = record.date.substring(0, 7); // Extract YYYY-MM
            if (!acc[month]) {
                acc[month] = { month, total: 0, count: 0 };
            }
            acc[month].total += record.price || 0;
            acc[month].count += 1;
            return acc;
        }, {});

        return Object.values(grouped).sort((a: any, b: any) => b.month.localeCompare(a.month));
    }
}

// ============================================
// COMPREHENSIVE MONTHLY FINANCIAL BREAKDOWN
// ============================================

export async function getMonthlyFinancialBreakdown() {
    const supabase = await createClient();

    console.log('Fetching comprehensive monthly financial breakdown');

    try {
        // Fetch all data in parallel
        const [capitalData, incomeData, monthlyFeesData, sellingFeesData, payrollData] = await Promise.all([
            supabase.from('capital_records').select('date, amount').order('date'),
            supabase.from('income_records').select('date, amount').order('date'),
            supabase.from('monthly_fees').select('date, price').order('date'),
            supabase.from('selling_fees').select('date, price').order('date'),
            supabase.from('payroll_records').select('month, total_salary').order('month')
        ]);

        // Group all data by month
        const monthlyData: { [key: string]: any } = {};

        // Process capital
        capitalData.data?.forEach(record => {
            const month = record.date.substring(0, 7); // Extract YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { month, capital: 0, income: 0, monthlyFees: 0, sellingFees: 0, payroll: 0 };
            }
            monthlyData[month].capital += record.amount || 0;
        });

        // Process income
        incomeData.data?.forEach(record => {
            const month = record.date.substring(0, 7); // Extract YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { month, capital: 0, income: 0, monthlyFees: 0, sellingFees: 0, payroll: 0 };
            }
            monthlyData[month].income += record.amount || 0;
        });

        // Process monthly fees
        monthlyFeesData.data?.forEach(record => {
            const month = record.date.substring(0, 7); // Extract YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { month, capital: 0, income: 0, monthlyFees: 0, sellingFees: 0, payroll: 0 };
            }
            monthlyData[month].monthlyFees += record.price || 0;
        });

        // Process selling fees
        sellingFeesData.data?.forEach(record => {
            const month = record.date.substring(0, 7); // Extract YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { month, capital: 0, income: 0, monthlyFees: 0, sellingFees: 0, payroll: 0 };
            }
            monthlyData[month].sellingFees += record.price || 0;
        });

        // Process payroll
        payrollData.data?.forEach(record => {
            const month = record.month.substring(0, 7); // Normalize to YYYY-MM (in case it's YYYY-MM-DD)
            if (!monthlyData[month]) {
                monthlyData[month] = { month, capital: 0, income: 0, monthlyFees: 0, sellingFees: 0, payroll: 0 };
            }
            monthlyData[month].payroll += record.total_salary || 0;
        });

        console.log('Monthly data before mapping:', monthlyData);

        // Calculate totals and net cash flow for each month
        const result = Object.values(monthlyData).map((data: any) => ({
            month: data.month,
            capital: data.capital,
            income: data.income,
            monthlyFees: data.monthlyFees,
            sellingFees: data.sellingFees,
            payroll: data.payroll,
            totalExpenses: data.monthlyFees + data.sellingFees + data.payroll,
            netCashFlow: data.capital + data.income - (data.monthlyFees + data.sellingFees + data.payroll)
        }));

        console.log('Result before sorting:', result);

        // Sort by month descending and ensure uniqueness
        const uniqueResult = result.sort((a, b) => b.month.localeCompare(a.month));

        console.log('Final result:', uniqueResult);

        return uniqueResult;
    } catch (error) {
        console.error('Error fetching monthly financial breakdown:', error);
        throw new Error('Failed to fetch monthly financial breakdown');
    }
}
