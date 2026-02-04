'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCurrentUserRole(profile.role);
          if (profile.role !== 'admin') {
            router.push('/dashboard');
          }
        }
      } else {
        router.push('/login');
      }

      setIsLoading(false);
    };

    getUser();
  }, [supabase, router]);

  const canEditUser = (targetRole: string) => {
    if (currentUserRole === 'admin') {
      return true;
    }
    if (currentUserRole === 'leader') {
      return targetRole === 'member';
    }
    return false;
  };

  return {
    currentUser,
    currentUserRole,
    isLoading,
    canEditUser,
  };
}
