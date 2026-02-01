'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { User, Profile } from '../utils/types';

export function useUsers(refresh: number) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const supabase = useSupabase();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*, leader:profiles!leader_id(full_name)');

        if (data) {
          // Define role priority (lower number = higher priority)
          const rolePriority: Record<string, number> = {
            'admin': 1,
            'leader': 2,
            'member': 3
          };

          // Sort: 1) Status (active first), 2) Role (admin > leader > member), 3) Name (A-Z)
          const sortedData = data.sort((a, b) => {
            // First, sort by status (active before inactive)
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;

            // Second, sort by role priority
            const roleA = rolePriority[a.role] || 999;
            const roleB = rolePriority[b.role] || 999;
            if (roleA !== roleB) return roleA - roleB;

            // Third, sort by name alphabetically
            const nameA = (a.full_name || '').toLowerCase();
            const nameB = (b.full_name || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });

          setUsers(sortedData);
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role');
        if (profileData) setProfiles(profileData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refresh]); // Removed supabase - it's stable from context

  return { loading, users, profiles };
}
