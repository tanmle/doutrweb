'use client';

import React, { useEffect, useState } from 'react';
import styles from './ShopsPage.module.css';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Modal } from '@/components/ui/Modal';
import { ShopCard } from '@/components/ui/ShopCard';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';

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

  // ✅ NEW: create modal state + form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<any>({
    name: '',
    platform: 'tiktok',
    status: 'active',
    owner_id: '',
  });

  const toast = useToast();
  const supabase = createClient();

  const refreshShopsScoped = async () => {
    let query = supabase
      .from('shops')
      .select('*, owner:profiles!owner_id(full_name, email)')
      .order('name');

    if (userRole === 'admin') {
      if (ownerFilter !== 'all') query = query.eq('owner_id', ownerFilter);
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
      if (user) query = query.eq('owner_id', user.id);
    }

    const { data } = await query;
    if (data) setShops(data);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const currentRole = profile?.role || 'member';
        setUserRole(currentRole);

        if (currentRole === 'admin') {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .order('full_name');
          if (profileData) setProfiles(profileData);
        } else if (currentRole === 'leader') {
          const { data: teamProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .or(`id.eq.${user.id},leader_id.eq.${user.id}`)
            .order('full_name');
          if (teamProfiles) setProfiles(teamProfiles);
        }

        // ✅ default owner for create form
        setCreateFormData((prev: any) => ({
          ...prev,
          owner_id: currentRole === 'member' ? user.id : (prev.owner_id || user.id),
        }));

        // Fetch shops (same logic as before)
        let query = supabase
          .from('shops')
          .select('*, owner:profiles!owner_id(full_name, email)')
          .order('name');

        if (currentRole === 'admin') {
          if (ownerFilter !== 'all') query = query.eq('owner_id', ownerFilter);
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
      owner_id: shop.owner_id,
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
        owner_id: formData.owner_id,
      })
      .eq('id', selectedShop.id);

    if (error) {
      toast.error(error.message);
    } else {
      setIsEditModalOpen(false);
      await refreshShopsScoped();
      toast.success('Shop updated successfully');
    }
    setLoading(false);
  };

  // ✅ NEW: open create modal
  const openCreateModal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const defaultOwnerId =
      ['admin', 'leader'].includes(userRole)
        ? (createFormData.owner_id || user?.id || '')
        : (user?.id || '');

    setCreateFormData({
      name: '',
      platform: 'tiktok',
      status: 'active',
      owner_id: defaultOwnerId,
    });
    setIsCreateModalOpen(true);
  };

  // ✅ NEW: create submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFormData.name?.trim()) {
      toast.error('Shop name is required');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('shops')
      .insert({
        name: createFormData.name.trim(),
        platform: createFormData.platform,
        status: createFormData.status,
        owner_id: createFormData.owner_id,
      })
      .select('*, owner:profiles!owner_id(full_name, email)')
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      setIsCreateModalOpen(false);
      toast.success('Shop created successfully');

      // Update list
      if (data) {
        // if current view would include it, refresh; simplest is refresh always
        await refreshShopsScoped();
      }
    }

    setLoading(false);
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the shop "${name}"? This will delete all associated sales records.`)) return;

    setLoading(true);
    const { error } = await supabase.from('shops').delete().eq('id', id);

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

  // ✅ NEW: create form input handler
  const handleCreateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCreateFormData({ ...createFormData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div className={styles.headerBar}>
        <div className={styles.leftGroup}>
          <h1 className={styles.title}>Shops</h1>

          {['admin', 'leader'].includes(userRole) && (
            <div className={styles.filterBox}>
              <label className={styles.filterLabel}>Filter by Owner</label>
              <select
                aria-label="Filter by owner"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Owners</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {userRole !== 'member' && (
          <div className={styles.newButton}>
            <Button onClick={openCreateModal} fullWidth>
              + New Shop
            </Button>
          </div>
        )}
      </div>

      {initialLoading ? (
        <LoadingIndicator label="Loading shops…" />
      ) : shops.length === 0 ? (
        <Card className="flex-center" style={{ borderStyle: 'dashed', minHeight: '180px', opacity: 0.8 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem' }}>No shops found.</p>
            {userRole !== 'member' && (
              <Button variant="secondary" onClick={openCreateModal}>
                Create your first shop
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {shops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              userRole={userRole}
              onEdit={handleEditClick}
              onDelete={handleDeleteShop}
              onReports={() => console.log('Reports clicked for shop:', shop.id)}
            />
          ))}
        </div>
      )}

      {/* ✅ NEW: Create Shop Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="New Shop">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Shop Name"
            name="name"
            value={createFormData.name || ''}
            onChange={handleCreateInputChange}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Platform</label>
              <select
                name="platform"
                style={{ width: '100%' }}
                value={createFormData.platform || 'tiktok'}
                onChange={handleCreateInputChange}
              >
                <option value="tiktok">TikTok</option>
                <option value="amazon">Amazon</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Status</label>
              <select
                name="status"
                style={{ width: '100%' }}
                value={createFormData.status || 'active'}
                onChange={handleCreateInputChange}
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
                value={createFormData.owner_id || ''}
                onChange={handleCreateInputChange}
                required
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email} ({p.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Creating...' : 'Create Shop'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Shop Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Shop">
        <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Shop Name" name="name" value={formData.name || ''} onChange={handleInputChange} required />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Platform</label>
              <select name="platform" style={{ width: '100%' }} value={formData.platform || ''} onChange={handleInputChange}>
                <option value="tiktok">TikTok Shop</option>
                <option value="lazada">Lazada</option>
                <option value="shopee">Shopee</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Status</label>
              <select name="status" style={{ width: '100%' }} value={formData.status || ''} onChange={handleInputChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {['admin', 'leader'].includes(userRole) && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Assign to Owner</label>
              <select name="owner_id" style={{ width: '100%' }} value={formData.owner_id || ''} onChange={handleInputChange} required>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email} ({p.email})
                  </option>
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
