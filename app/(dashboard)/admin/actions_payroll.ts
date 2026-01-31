'use server';

import { createAdminClient } from '@/utils/supabase/admin';

interface SalaryPeriod {
    days: number;
    daily_rate: number;
    monthly_salary?: number;
}

export async function generatePayroll(
    month: string,
    standardDays: number = 26,
    userActualDays: Record<string, number> = {},
    userSalaryPeriods: Record<string, SalaryPeriod[]> = {}
) {
    const supabase = createAdminClient();

    // 1. Get all eligible users (active members/leaders with salary set)
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, base_salary')
        .neq('base_salary', 0)
        .neq('role', 'admin')
        .eq('status', 'active'); // Only generate for active users

    if (usersError) return { error: usersError.message };
    if (!users || users.length === 0) return { error: 'No users found eligible for payroll.' };

    const records = users.map(user => {
        const actualDays = userActualDays[user.id] !== undefined ? userActualDays[user.id] : 0;
        const salaryPeriods = userSalaryPeriods[user.id];

        let totalSalary = 0;

        // If user has custom salary periods, calculate based on those
        if (salaryPeriods && salaryPeriods.length > 0) {
            totalSalary = salaryPeriods.reduce((sum, period) => {
                // Calculate with full precision to avoid rounding errors
                const periodSalary = period.monthly_salary
                    ? (period.monthly_salary / standardDays) * period.days
                    : period.daily_rate * period.days;
                return sum + periodSalary;
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

    // 3. Send Notifications
    if (users.length > 0) {
        const recipientIds = users.map(u => u.id);
        const { error: notifError } = await supabase.rpc('send_notification', {
            p_sender_id: null,
            p_title: 'Payroll Generated 💰',
            p_message: `Your payroll for ${month} has been generated.`,
            p_type: 'manual',
            p_recipient_ids: recipientIds,
            p_metadata: { month }
        });
        if (notifError) {
            console.error('Error sending payroll notifications:', notifError);
            return { success: true, warning: `Payroll generated but notification failed: ${notifError.message}` };
        }
    }

    return { success: true };
}

export async function updatePayrollRecord(id: string, data: any) {
    const supabase = createAdminClient();
    const { data: updatedRecord, error } = await supabase
        .from('payroll_records')
        .update(data)
        .eq('id', id)
        .select('user_id, month, status')
        .single();

    if (error) return { error: error.message };

    if (updatedRecord) {
        let title = 'Payroll Updated';
        let message = `Your payroll for ${updatedRecord.month} has been updated.`;

        if (updatedRecord.status === 'paid') {
            title = 'Payroll Paid 💰';
            message = `Your payroll for ${updatedRecord.month} has been marked as PAID.`;
        }

        // Send notification
        await supabase.rpc('send_notification', {
            p_sender_id: null, // System
            p_title: title,
            p_message: message,
            p_type: 'manual',
            p_recipient_ids: [updatedRecord.user_id],
            p_metadata: { month: updatedRecord.month, status: updatedRecord.status }
        });
    }

    return { success: true };
}
