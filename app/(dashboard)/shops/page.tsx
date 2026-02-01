'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { cards } from '@/styles/modules';
import { ShopModal, ShopsTable, ShopHistoryModal } from './components';
import { useRealtime } from '@/hooks/useRealtime';
import styles from './ShopsPage.module.css';

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [formData, setFormData] = useState<any>({});

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<any>({
    name: '',
    platform: 'tiktok',
    status: 'active',
    note: '',
    owner_id: '',
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyShop, setHistoryShop] = useState<any>(null);

  const toast = useToast();
  const supabase = createClient();

  const logHistory = async (shopId: string, action: string, details?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('shop_history').insert({
      shop_id: shopId,
      action,
      changed_by: user.id,
      details
    });
  };

  const refreshShopsScoped = async () => {
    let query = supabase
      .from('shops')
      .select('*, owner:profiles!owner_id(id, full_name, email, role)');


    // Filter by status
    if (statusFilter === 'archived') {
      query = query.eq('status', 'archived');
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    } else {
      // When showing "all", exclude archived shops
      query = query.neq('status', 'archived');
    }

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

    if (data) {
      // Sort by status (active first), then by owner name, then by shop name
      const sortedData = data.sort((a, b) => {
        // First, sort by status (active before inactive)
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;

        // Second, sort by owner name alphabetically
        const ownerA = (a.owner?.full_name || a.owner?.email || '').toLowerCase();
        const ownerB = (b.owner?.full_name || b.owner?.email || '').toLowerCase();
        const ownerCompare = ownerA.localeCompare(ownerB);
        if (ownerCompare !== 0) return ownerCompare;

        // Third, sort by shop name alphabetically
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setShops(sortedData);
    }
  };

  useEffect(() => {
    refreshShopsScoped();
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [supabase, ownerFilter, statusFilter]); // Add showArchived depending on if refreshShopsScoped is stable? 
  // refreshShopsScoped inside component depends on state, so better to just use effect to call it.
  // Actually, I should probably rewrite useEffect to call refreshShopsScoped directly or move it.
  // The original code duplicated logic inside useEffect. I'll just use the function.
  // Need to fetch initial profiles only once.

  useEffect(() => {
    const fetchProfiles = async () => {
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
          .select('id, full_name, email, role')
          .neq('role', 'admin')  // Exclude admin users
          .eq('status', 'active')  // Only active users
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

      setCreateFormData((prev: any) => ({
        ...prev,
        owner_id: currentRole === 'member' ? user.id : (prev.owner_id || user.id),
      }));



      setInitialLoading(false);
    };

    fetchProfiles();
  }, []); // Run once for profiles. Shops will handle themselves via other effect? 
  // No, I need to fetch shops initially too or trigger it.
  // I will add [ownerFilter, statusFilter, showArchived] to dependency array of a separate effect calling refreshShopsScoped.

  useEffect(() => {
    if (!initialLoading) {
      refreshShopsScoped();
    }
  }, [ownerFilter, statusFilter, initialLoading]);

  // Real-time subscription for shops
  useRealtime({
    table: 'shops',
    onData: () => {
      // Refresh the list when any change happens to shops
      refreshShopsScoped();
    }
  });


  const handleEditClick = async (shop: any) => {
    setSelectedShop(shop);
    setFormData({
      name: shop.name,
      platform: shop.platform,
      status: shop.status,
      note: shop.note || '',
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
        note: formData.note || null,
        owner_id: formData.owner_id,
      })
      .eq('id', selectedShop.id);

    if (error) {
      toast.error(error.message);
    } else {
      await logHistory(selectedShop.id, 'updated', {
        name: formData.name !== selectedShop.name ? formData.name : undefined,
        status: formData.status !== selectedShop.status ? formData.status : undefined,
        platform: formData.platform !== selectedShop.platform ? formData.platform : undefined,
        note: formData.note !== (selectedShop.note || '') ? formData.note : undefined,
      });
      setIsEditModalOpen(false);
      await refreshShopsScoped();
      toast.success('Shop updated successfully');
    }
    setLoading(false);
  };

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
      note: '',
      owner_id: defaultOwnerId,
    });

    setIsCreateModalOpen(true);
  };

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
        note: createFormData.note || null,
        owner_id: createFormData.owner_id,
      })
      .select('*, owner:profiles!owner_id(full_name, email)')
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      if (data) {
        await logHistory(data.id, 'created', { name: data.name });
      }
      setIsCreateModalOpen(false);
      toast.success('Shop created successfully');
      await refreshShopsScoped();
    }

    setLoading(false);
  };

  const handleArchiveShop = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive the shop "${name}"?`)) return;

    setLoading(true);
    const { error } = await supabase.from('shops').update({ status: 'archived' }).eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      await logHistory(id, 'archived');
      toast.success('Shop archived successfully');
      // If showing archived, it stays (maybe updates status locally). If not, it disappears.
      if (statusFilter !== 'archived') {
        setShops(prev => prev.filter(s => s.id !== id));
      } else {
        await refreshShopsScoped();
      }
    }
    setLoading(false);
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete the shop "${name}"? This action cannot be undone.`)) return;

    setLoading(true);
    const { error } = await supabase.from('shops').delete().eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Shop deleted successfully');
      setShops(prev => prev.filter(s => s.id !== id));
      await refreshShopsScoped();
    }
    setLoading(false);
  };

  const handleViewHistory = (shop: any) => {
    setHistoryShop(shop);
    setIsHistoryModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setCreateFormData({ ...createFormData, [e.target.name]: e.target.value });
  };



  return (
    <div>
      <div className={styles.headerBar}>
        <div className={styles.leftGroup}>
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

          <div className={styles.filterBox}>
            <label className={styles.filterLabel}>Filter by Status</label>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Total: {shops.length}
          </div>
        </div>

        {statusFilter !== 'archived' && (
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
        <Card className={cards.emptyCard}>
          <div className={cards.emptyCardContent}>
            <p className={cards.emptyCardText}>{statusFilter === 'archived' ? 'No archived shops found.' : 'No shops found.'}</p>
            {statusFilter !== 'archived' && (
              <Button variant="secondary" onClick={openCreateModal}>
                Create your first shop
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <ShopsTable
            shops={shops.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
            userRole={userRole}
            onEdit={handleEditClick}
            onArchive={handleArchiveShop}
            onDelete={handleDeleteShop}
            onHistory={handleViewHistory}
          />

          {/* Pagination Controls */}
          {shops.length > ITEMS_PER_PAGE && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {Math.ceil(shops.length / ITEMS_PER_PAGE)} ({shops.length} shops)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(shops.length / ITEMS_PER_PAGE), prev + 1))}
                  disabled={currentPage === Math.ceil(shops.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Shop Modal */}
      <ShopModal
        isOpen={isCreateModalOpen}
        formData={createFormData}
        profiles={profiles}
        userRole={userRole}
        loading={loading}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        onChange={handleCreateInputChange}
      />

      {/* Edit Shop Modal */}
      <ShopModal
        isOpen={isEditModalOpen}
        isEdit
        formData={formData}
        profiles={profiles}
        userRole={userRole}
        loading={loading}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateSubmit}
        onChange={handleInputChange}
      />

      {/* History Modal */}
      <ShopHistoryModal
        isOpen={isHistoryModalOpen}
        shop={historyShop}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}
