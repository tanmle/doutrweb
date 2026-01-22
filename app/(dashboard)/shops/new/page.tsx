'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { forms, layouts } from '@/styles/modules';

export default function NewShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [status, setStatus] = useState('active');
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');

  const toast = useToast();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          setSelectedOwnerId(user.id);
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile) {
            setUserRole(profile.role);
            if (profile.role === 'member') {
              router.push('/shops');
              return;
            }
            if (profile.role === 'admin') {
              // Fetch all users to assign to
              const { data: allUsers } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
              if (allUsers) setAvailableUsers(allUsers);
            } else if (profile.role === 'leader') {
              // Fetch only self and team members
              const { data: teamUsers } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .or(`id.eq.${user.id},leader_id.eq.${user.id}`)
                .order('full_name');
              if (teamUsers) setAvailableUsers(teamUsers);
            }
          }
        }
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    // Insert into Supabase
    const { error } = await supabase.from('shops').insert({
      name,
      platform,
      status,
      owner_id: selectedOwnerId || user.id
    });

    if (error) {
      toast.error('Error creating shop: ' + error.message);
      setLoading(false);
    } else {
      router.push('/shops');
      router.refresh();
    }
  };

  if (initialLoading) {
    return <LoadingIndicator label="Loading shop setup…" />;
  }

  return (
    <div className={layouts.pageContainerNarrow}>
      <h1 className={layouts.pageHeader}>Add New Shop</h1>

      <Card>
        <form onSubmit={handleSubmit} className={forms.form}>
          <Input
            label="Shop Name"
            placeholder="e.g. My Awesome Store"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className={forms.formGridAuto}>
            <div className={forms.formField}>
              <label className={forms.formLabel}>Platform</label>
              <select
                aria-label="Select platform"
                className={forms.formSelect}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="tiktok">TikTok Shop</option>
                <option value="amazon">Amazon</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={forms.formField}>
              <label className={forms.formLabel}>Status</label>
              <select
                aria-label="Select status"
                className={forms.formSelect}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {['admin', 'leader'].includes(userRole) && (
            <div className={forms.formField}>
              <label className={forms.formLabel}>Assign to Owner</label>
              <select
                aria-label="Assign shop owner"
                className={forms.formSelect}
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                required
              >
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
                ))}
              </select>
              <p className={forms.formHint}>
                Only Admins and Leaders can assign shops to other users.
              </p>
            </div>
          )}

          <div className={forms.formActionsFull}>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create Shop'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
