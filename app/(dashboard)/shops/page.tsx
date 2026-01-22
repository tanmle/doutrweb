'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { Shop } from '@/lib/types';

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [formData, setFormData] = useState<any>({});

  const toast = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) {
          setUserRole(profile.role);
          if (profile.role === 'admin') {
            const { data: profileData } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
            if (profileData) setProfiles(profileData);
          } else if (profile.role === 'leader') {
            const { data: teamProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .or(`id.eq.${user.id},leader_id.eq.${user.id}`)
              .order('full_name');
            if (teamProfiles) setProfiles(teamProfiles);
          }
        }

        let query = supabase
          .from('shops')
          .select('*, owner:profiles!owner_id(full_name, email)')
          .order('name');

        const currentRole = profile?.role || 'member';
        if (currentRole === 'admin') {
          if (ownerFilter !== 'all') {
            query = query.eq('owner_id', ownerFilter);
          }
        } else if (currentRole === 'leader') {
          const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('leader_id', user.id);

          const memberIds = members?.map(m => m.id) || [];
          const teamIds = [user.id, ...memberIds];

          if (ownerFilter !== 'all' && teamIds.includes(ownerFilter)) {
            query = query.eq('owner_id', ownerFilter);
          } else {
            query = query.in('owner_id', teamIds);
          }
        } else {
          // Member sees only their own shops
          query = query.eq('owner_id', user.id);
        }

        const { data: shopsData } = await query;

        if (shopsData) setShops(shopsData);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, [supabase, ownerFilter]);

  const handleEditClick = (shop: any) => {
    setSelectedShop(shop);
    setFormData({
      name: shop.name,
      platform: shop.platform,
      status: shop.status,
      owner_id: shop.owner_id
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    setLoading(true);
    const { error } = await supabase
      .from('shops')
      .update({
        name: formData.name,
        platform: formData.platform,
        status: formData.status,
        owner_id: formData.owner_id
      })
      .eq('id', selectedShop.id);

    if (error) {
      toast.error(error.message);
    } else {
      setIsEditModalOpen(false);
      // Refresh list scoped to role
      let query = supabase
        .from('shops')
        .select('*, owner:profiles!owner_id(full_name, email)')
        .order('name');

      if (userRole === 'admin') {
        if (ownerFilter !== 'all') {
          query = query.eq('owner_id', ownerFilter);
        }
      } else if (userRole === 'leader') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('leader_id', user.id);

          const memberIds = members?.map(m => m.id) || [];
          const teamIds = [user.id, ...memberIds];

          if (ownerFilter !== 'all' && teamIds.includes(ownerFilter)) {
            query = query.eq('owner_id', ownerFilter);
          } else {
            query = query.in('owner_id', teamIds);
          }
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('owner_id', user.id);
        }
      }

      const { data } = await query;
      if (data) setShops(data);
    }
    setLoading(false);
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the shop "${name}"? This will delete all associated sales records.`)) return;

    setLoading(true);
    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      setShops(shops.filter(s => s.id !== id));
      toast.success('Shop deleted successfully');
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Shops</h1>

          {['admin', 'leader'].includes(userRole) && (
            <div style={{ minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Filter by Owner</label>
              <select
                aria-label="Filter by owner"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={{ fontSize: '0.875rem', width: '100%' }}
              >
                <option value="all">All Owners</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {userRole !== 'member' && (
          <Link href="/shops/new">
            <Button>+ New Shop</Button>
          </Link>
        )}
      </div>

      {initialLoading ? (
        <LoadingIndicator label="Loading shops…" />
      ) : shops.length === 0 ? (
        <Card className="flex-center" style={{ borderStyle: 'dashed', minHeight: '180px', opacity: 0.8 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem' }}>No shops found.</p>
            {userRole !== 'member' && (
              <Link href="/shops/new">
                <Button variant="secondary">Create your first shop</Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {shops.map((shop) => (
            <Card key={shop.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{shop.name}</h3>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '99px',
                  background: shop.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: shop.status === 'active' ? '#34d399' : '#f87171',
                  fontSize: '0.75rem',
                  border: '1px solid currentColor'
                }}>
                  {shop.status.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                <span>Platform: {shop.platform}</span>
                <span>Owner: {shop.owner?.full_name || shop.owner?.email || 'Unknown'}</span>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {userRole !== 'member' && (
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => handleEditClick(shop)}>Edit</Button>
                )}
                <Button variant="secondary" style={{ flex: 1 }}>Reports</Button>
                {['admin', 'leader'].includes(userRole) && (
                  <Button
                    variant="ghost"
                    style={{ flex: '0 0 auto', color: '#ef4444', padding: '0.5rem' }}
                    onClick={() => handleDeleteShop(shop.id, shop.name)}
                    title="Delete Shop"
                    aria-label="Delete shop"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Shop Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Shop">
        <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Shop Name"
            name="name"
            value={formData.name || ''}
            onChange={handleInputChange}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Platform</label>
              <select
                name="platform"
                style={{ width: '100%' }}
                value={formData.platform || ''}
                onChange={handleInputChange}
              >
                <option value="tiktok">TikTok Shop</option>
                <option value="lazada">Lazada</option>
                <option value="shopee">Shopee</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Status</label>
              <select
                name="status"
                style={{ width: '100%' }}
                value={formData.status || ''}
                onChange={handleInputChange}
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
                name="owner_id"
                style={{ width: '100%' }}
                value={formData.owner_id || ''}
                onChange={handleInputChange}
                required
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email} ({p.email})</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Saving...' : 'Update Shop'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
