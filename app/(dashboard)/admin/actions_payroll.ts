'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export async function generatePayroll(
    month: string,
    standardDays: number = 26,
    userActualDays: Record<string, number> = {}
) {
    const supabase = createAdminClient();
    
    // 1. Get all eligible users (e.g., active members/leaders)
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, base_salary')
        .neq('base_salary', 0); // Only generate for those with salary set?

    if (usersError) return { error: usersError.message };
    if (!users || users.length === 0) return { error: 'No users found eligible for payroll.' };

    const records = users.map(user => {
        const actualDays = userActualDays[user.id] !== undefined ? userActualDays[user.id] : 0;
        const dailyRate = (user.base_salary || 0) / standardDays;
        const totalSalary = Math.round(dailyRate * actualDays); // Simple calc, no bonus yet

        return {
            user_id: user.id,
            month: `${month}-01`,
            standard_work_days: standardDays,
            actual_work_days: actualDays,
            bonus: 0,
            total_salary: totalSalary, // Auto-calculate initial salary
            status: 'pending'
        };
    });

    // 2. Insert records (ignore if exists? Or upsert and update?)
    // If I want to "update" existing ones with new days, I should use upsert with update.
    // user request: "enter actual work day... don't edit one by one". implies overwriting or setting initial.
    // I'll assume upsert merging is fine.
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
