'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/utils/supabase/client';

export default function NewShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [status, setStatus] = useState('active');
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
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
    };
    init();
  }, [supabase]);

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
        alert('Error creating shop: ' + error.message);
        setLoading(false);
    } else {
        router.push('/shops');
        router.refresh();
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Add New Shop</h1>
      
      <Card>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            label="Shop Name" 
            placeholder="e.g. My Awesome Store" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required 
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Platform</label>
              <select 
                style={{ width: '100%' }}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="tiktok">TikTok Shop</option>
                <option value="amazon">Amazon</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Status</label>
              <select 
                style={{ width: '100%' }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {['admin', 'leader'].includes(userRole) && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Assign to Owner</label>
              <select 
                style={{ width: '100%' }}
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                required
              >
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                Only Admins and Leaders can assign shops to other users.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => router.back()} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Shop'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
