'use server';

import { createAdminClient } from '@/utils/supabase/admin';

interface SalaryPeriod {
    days: number;
    daily_rate: number;
}

export async function generatePayroll(
    month: string,
    standardDays: number = 26,
    userActualDays: Record<string, number> = {},
    userSalaryPeriods: Record<string, SalaryPeriod[]> = {}
) {
    const supabase = createAdminClient();

    // 1. Get all eligible users (e.g., active members/leaders)
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, base_salary')
        .neq('base_salary', 0); // Only generate for those with salary set

    if (usersError) return { error: usersError.message };
    if (!users || users.length === 0) return { error: 'No users found eligible for payroll.' };

    const records = users.map(user => {
        const actualDays = userActualDays[user.id] !== undefined ? userActualDays[user.id] : 0;
        const salaryPeriods = userSalaryPeriods[user.id];

        let totalSalary = 0;

        // If user has custom salary periods, calculate based on those
        if (salaryPeriods && salaryPeriods.length > 0) {
            totalSalary = salaryPeriods.reduce((sum, period) => {
                return sum + (period.days * period.daily_rate);
            }, 0);
        } else {
            // Otherwise use standard calculation
            const dailyRate = (user.base_salary || 0) / standardDays;
            totalSalary = dailyRate * actualDays;
        }

        return {
            user_id: user.id,
            month: `${month}-01`,
            standard_work_days: standardDays,
            actual_work_days: actualDays,
            salary_periods: salaryPeriods && salaryPeriods.length > 0 ? salaryPeriods : null,
            bonus: 0,
            total_salary: Math.round(totalSalary),
            status: 'pending'
        };
    });

    // 2. Insert records (upsert to update existing ones)
    const { error: insertError } = await supabase
        .from('payroll_records')
        .upsert(records, { onConflict: 'user_id, month' });

    if (insertError) return { error: insertError.message };

    return { success: true };
}

export async function updatePayrollRecord(id: string, data: any) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('payroll_records')
        .update(data)
        .eq('id', id);

    if (error) return { error: error.message };
    return { success: true };
}
