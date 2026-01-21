'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export async function createUser(data: any) {
  const supabase = createAdminClient();
  const { email, password, full_name, role, leader_id } = data;

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
            leader_id: (role === 'member' || !role) ? (leader_id || null) : null
        })
        .eq('id', userData.user.id);
    
    if (profileError) {
         return { error: 'User created but failed to update profile: ' + profileError.message };
    }
    return { success: true };
  }

  return { error: 'Unknown error occurred' };
}

export async function deleteUser(id: string) {
  const supabase = createAdminClient();
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
