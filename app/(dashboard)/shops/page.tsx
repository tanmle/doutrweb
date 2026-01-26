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
  const [showArchived, setShowArchived] = useState(false);

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
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

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
      .select('*, owner:profiles!owner_id(full_name, email, role)')
      .order('name');

    if (showArchived) {
      query = query.eq('status', 'archived');
    } else {
      query = query.neq('status', 'archived');
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
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
    if (data) setShops(data);
  };

  useEffect(() => {
    refreshShopsScoped();
  }, [supabase, ownerFilter, statusFilter, showArchived]); // Add showArchived depending on if refreshShopsScoped is stable? 
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

      setCreateFormData((prev: any) => ({
        ...prev,
        owner_id: currentRole === 'member' ? user.id : (prev.owner_id || user.id),
      }));

      const { data: productsData } = await supabase.from('products').select('id, name').order('name');
      if (productsData) setAllProducts(productsData);

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
  }, [ownerFilter, statusFilter, showArchived, initialLoading]);

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

    // Fetch products associated with this shop
    const { data: associations } = await supabase
      .from('shop_products')
      .select('product_id')
      .eq('shop_id', shop.id);

    setSelectedProductIds(associations ? associations.map(a => a.product_id) : []);
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
      // Fetch original products for history comparison
      const { data: oldAssociations } = await supabase
        .from('shop_products')
        .select('product_id')
        .eq('shop_id', selectedShop.id);

      const oldIds = oldAssociations ? oldAssociations.map(a => a.product_id) : [];
      const newIds = selectedProductIds;

      const added = newIds.filter(id => !oldIds.includes(id));
      const removed = oldIds.filter(id => !newIds.includes(id));

      const productChanges: any = {};
      if (added.length > 0) {
        productChanges.added = added.map(id => allProducts.find(p => p.id === id)?.name || id);
      }
      if (removed.length > 0) {
        productChanges.removed = removed.map(id => allProducts.find(p => p.id === id)?.name || id);
      }

      await logHistory(selectedShop.id, 'updated', {
        name: formData.name !== selectedShop.name ? formData.name : undefined,
        status: formData.status !== selectedShop.status ? formData.status : undefined,
        platform: formData.platform !== selectedShop.platform ? formData.platform : undefined,
        note: formData.note !== (selectedShop.note || '') ? formData.note : undefined,
        ...((added.length > 0 || removed.length > 0) ? { products: productChanges } : {})
      });
      await saveShopProducts(selectedShop.id, selectedProductIds);
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
    setSelectedProductIds([]); // Reset selection
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
        await saveShopProducts(data.id, selectedProductIds);
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
      if (!showArchived) {
        setShops(prev => prev.filter(s => s.id !== id));
      } else {
        await refreshShopsScoped();
      }
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

  const saveShopProducts = async (shopId: string, productIds: string[]) => {
    const { error: delError } = await supabase.from('shop_products').delete().eq('shop_id', shopId);
    if (delError) console.error('Error clearing shop products:', delError);

    if (productIds.length > 0) {
      const records = productIds.map(pid => ({ shop_id: shopId, product_id: pid }));
      const { error: insError } = await supabase.from('shop_products').insert(records);
      if (insError) console.error('Error saving shop products:', insError);
    }
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
              disabled={showArchived} // Disable status filter if showing archived
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className={styles.checkboxContainer}>
            <input
              id="showArchived"
              type="checkbox"
              className={styles.checkboxInput}
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <label htmlFor="showArchived" className={styles.checkboxLabel}>
              Show Archived Shop
            </label>
          </div>
        </div>

        {userRole !== 'member' && !showArchived && (
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
            <p className={cards.emptyCardText}>{showArchived ? 'No archived shops found.' : 'No shops found.'}</p>
            {userRole !== 'member' && !showArchived && (
              <Button variant="secondary" onClick={openCreateModal}>
                Create your first shop
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <ShopsTable
          shops={shops}
          userRole={userRole}
          onEdit={handleEditClick}
          onArchive={handleArchiveShop} // Logic for Archive button might need to check if shop is already archived?
          // If viewing archived shops, "Archive" button should probably be hidden or "Restore"?
          // I didn't implement restore. I'll just hide Archive button if showArchived is true.
          // Or pass a flag to ShopsTable? Or handled by ShopsTable based on status?
          // I'll update ShopsTable to hide Archive button if status is archived.
          onHistory={handleViewHistory}
        />
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
        allProducts={allProducts}
        selectedProductIds={selectedProductIds}
        onSelectedProductsChange={setSelectedProductIds}
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
        allProducts={allProducts}
        selectedProductIds={selectedProductIds}
        onSelectedProductsChange={setSelectedProductIds}
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
