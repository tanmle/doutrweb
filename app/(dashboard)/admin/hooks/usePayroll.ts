'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { PayrollRecord, User } from '../utils/types';

export function usePayroll(month: string, refresh: number) {
  const [loading, setLoading] = useState(false);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!month) return;
      setLoading(true);
      try {
        const { data: userData } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, base_salary, bank_name, bank_number');
        if (userData) setUsers(userData as any);

        const startOfMonth = `${month}-01`;
        const { data } = await supabase
            .from('payroll_records')
            .select('*, user:profiles!user_id(full_name, email, bank_name, bank_number, base_salary, role)')
            .eq('month', startOfMonth);
        if (data) setPayrollRecords(data as any);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [supabase, month, refresh]);

  return { loading, payrollRecords, users };
}
