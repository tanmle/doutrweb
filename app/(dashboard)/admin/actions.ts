'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createUserSchema } from '@/lib/validations';
import { z } from 'zod';

export async function createUser(rawData: unknown) {
  try {
    // Validate input
    const data = createUserSchema.parse(rawData);

    const supabase = createAdminClient();
    const { email, password, full_name, role, leader_id, bank_name, bank_number, base_salary } = data;

    // 1. Create User in Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (userError) {
      return { error: userError.message };
    }

    if (userData.user) {
      // 2. Profile creation is handled by the Trigger.
      // We update it with the selected role and leader_id.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: role || 'member',
          leader_id: (role === 'member' || !role) ? (leader_id || null) : null,
          bank_name: bank_name || null,
          bank_number: bank_number || null,
          base_salary: base_salary || 0
        })
        .eq('id', userData.user.id);

      if (profileError) {
        return { error: 'User created but failed to update profile: ' + profileError.message };
      }
      return { success: true };
    }

    return { error: 'Unknown error occurred' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Validation failed' };
  }
}

export async function deleteUser(id: string) {
  const supabase = createAdminClient();

  // 1. Unassign members where this user is leader
  const { error: unassignMembersError } = await supabase
    .from('profiles')
    .update({ leader_id: null })
    .eq('leader_id', id);

  if (unassignMembersError) {
    return { error: 'Failed to unassign members: ' + unassignMembersError.message };
  }

  // 2. Unassign leader from this user
  const { error: unassignLeaderError } = await supabase
    .from('profiles')
    .update({ leader_id: null })
    .eq('id', id);

  if (unassignLeaderError) {
    return { error: 'Failed to unassign leader: ' + unassignLeaderError.message };
  }

  // 3. Unassign Shops
  const { error: shopError } = await supabase
    .from('shops')
    .update({ owner_id: null })
    .eq('owner_id', id);

  if (shopError) return { error: 'Failed to unassign shops: ' + shopError.message };

  // 4. Unassign Sales Records (created_by)
  const { error: salesError } = await supabase
    .from('sales_records')
    .update({ created_by: null })
    .eq('created_by', id);

  if (salesError) return { error: 'Failed to unassign sales records: ' + salesError.message };

  // 5. Unassign Selling Fees
  const { error: sellingFeeError } = await supabase
    .from('selling_fees')
    .update({ owner_id: null })
    .eq('owner_id', id);

  if (sellingFeeError) return { error: 'Failed to unassign selling fees: ' + sellingFeeError.message };

  // 6. Unassign Monthly Fees
  // Note: Wrapped in try/catch logic via checking error message if table might be missing, 
  // but assuming it exists based on project structure.
  const { error: monthlyFeeError } = await supabase
    .from('monthly_fees')
    .update({ owner_id: null })
    .eq('owner_id', id);

  if (monthlyFeeError && !monthlyFeeError.message.includes('relation "public.monthly_fees" does not exist')) {
    return { error: 'Failed to unassign monthly fees: ' + monthlyFeeError.message };
  }

  // 7. Delete Payroll Records
  const { error: payrollError } = await supabase
    .from('payroll_records')
    .delete()
    .eq('user_id', id);

  if (payrollError && !payrollError.message.includes('relation "public.payroll_records" does not exist')) {
    return { error: 'Failed to delete payroll records: ' + payrollError.message };
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function resetUserPassword(id: string, newPassword: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(id, {
    password: newPassword
  });
  if (error) return { error: error.message };
  return { success: true };
}
