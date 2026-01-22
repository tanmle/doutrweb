'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { forms, cards, tables, filters, layouts } from '@/styles/modules';

export default function DailyEntryPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [userRole, setUserRole] = useState<string>('member');

  // Grid Filters
  const [shopFilter, setShopFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'this_month' | 'last_month' | 'range'>('today');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return { start: today, end: today };
  });

  const toast = useToast();

  useEffect(() => {
    if (dateFilter === 'range') return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      setDateRange({ start: todayStr, end: todayStr });
      return;
    }

    if (dateFilter === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({
        start: startOfMonth.toISOString().split('T')[0],
        end: todayStr
      });
      return;
    }

    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    setDateRange({
      start: startOfLastMonth.toISOString().split('T')[0],
      end: endOfLastMonth.toISOString().split('T')[0]
    });
  }, [dateFilter]);
  const router = useRouter();
  const supabase = createClient();

  // Form State
  const [shopId, setShopId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ productId: '', quantity: '' }]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch User Role and Profiles for Owners
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

        // Fetch shops based on role hierarchy
        let shopsQuery = supabase.from('shops').select('id, name, owner_id');
        if (profile?.role === 'admin') {
          // Admin sees all
        } else if (profile?.role === 'leader') {
          const { data: members } = await supabase.from('profiles').select('id').eq('leader_id', user.id);
          const teamIds = [user.id, ...(members?.map(m => m.id) || [])];
          shopsQuery = shopsQuery.in('owner_id', teamIds);
        } else {
          // Member
          shopsQuery = shopsQuery.eq('owner_id', user.id);
        }

        const { data: shopsData } = await shopsQuery.order('name');
        if (shopsData) {
          setShops(shopsData);
          if (shopsData.length > 0 && !shopId) setShopId(shopsData[0].id);
        }

        // Fetch products
        const { data: productsData } = await supabase.from('products').select('*').order('name');
        if (productsData) {
          setProducts(productsData);
          if (productsData.length > 0 && items[0].productId === '') {
            setItems([{ productId: productsData[0].id, quantity: '' }]);
          }
        }

        // Fetch records with filters based on role hierarchy
        let query = supabase
          .from('sales_records')
          .select(`
              *,
              shop:shops!inner(
                id,
                name, 
                owner_id,
                profiles!owner_id(full_name, email)
              ),
              product:products(id, name)
            `)
          .order('date', { ascending: false });

        if (shopFilter !== 'all') query = query.eq('shop_id', shopFilter);

        const currentRole = profile?.role || 'member';
        if (currentRole === 'admin') {
          if (ownerFilter !== 'all') {
            query = query.eq('shop.owner_id', ownerFilter);
          }
        } else if (currentRole === 'leader') {
          const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('leader_id', user.id);

          const memberIds = members?.map(m => m.id) || [];
          const teamIds = [user.id, ...memberIds];

          if (ownerFilter !== 'all' && teamIds.includes(ownerFilter)) {
            query = query.eq('shop.owner_id', ownerFilter);
          } else {
            query = query.in('shop.owner_id', teamIds);
          }
        } else {
          // Member sees only their own shops
          query = query.eq('shop.owner_id', user.id);
        }

        if (dateRange.start) query = query.gte('date', dateRange.start);
        if (dateRange.end) query = query.lte('date', dateRange.end);

        const { data: salesData } = await query.limit(50);
        if (salesData) setRecords(salesData);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, [supabase, refresh, shopFilter, ownerFilter, dateRange, shopId, items]);

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const addItem = () => {
    setItems([...items, { productId: products[0]?.id || '', quantity: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      setLoading(false);
      return;
    }

    const records = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return null;

      const quantity = parseInt(item.quantity) || 0;
      const revenue = quantity * (product.selling_price || 0);
      const cost = quantity * (product.base_price || 0);

      return {
        shop_id: shopId,
        product_id: item.productId,
        date: date,
        revenue: revenue,
        items_sold: quantity,
        profit: revenue - cost,
        created_by: user.id,
        status: 'pending'
      };
    }).filter(r => r !== null);

    if (records.length === 0) {
      toast.error('Please add at least one valid product record');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('sales_records').insert(records);

    if (error) {
      toast.error('Error saving records: ' + error.message);
    } else {
      toast.success('Daily records submitted successfully!');
      setItems([{ productId: products[0]?.id || '', quantity: '' }]);
      setIsModalOpen(false);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setLoading(true);

    const product = products.find(p => p.id === formData.productId);
    if (!product) {
      toast.error('Invalid product');
      setLoading(false);
      return;
    }

    const quantity = parseInt(formData.quantity) || 0;
    const revenue = quantity * (product.selling_price || 0);
    const cost = quantity * (product.base_price || 0);

    const { error } = await supabase.from('sales_records').update({
      shop_id: formData.shopId,
      product_id: formData.productId,
      date: formData.date,
      items_sold: quantity,
      revenue: revenue,
      profit: revenue - cost,
    }).eq('id', selectedRecord.id);

    if (error) {
      toast.error('Error updating record: ' + error.message);
    } else {
      toast.success('Record updated successfully!');
      setIsEditModalOpen(false);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const openEditModal = (record: any) => {
    setSelectedRecord(record);
    setFormData({
      shopId: record.shop_id,
      date: record.date,
      productId: record.product_id,
      quantity: record.items_sold.toString()
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    setLoading(true);
    const { error } = await supabase.from('sales_records').delete().eq('id', id);
    if (error) {
      toast.error('Error deleting record: ' + error.message);
    } else {
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const [formData, setFormData] = useState<any>({
    shopId: '',
    date: '',
    productId: '',
    quantity: ''
  });

  const totalQty = records.reduce((sum, r) => sum + (r.items_sold || 0), 0);
  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0);

  if (initialLoading) {
    return <LoadingIndicator label="Loading sales data…" />;
  }

  return (
    <div className={layouts.pageContainer}>
      <div className={layouts.pageHeaderWithActions}>
        <h1 className={layouts.pageHeader}>Sales Records</h1>
        <Button onClick={() => setIsModalOpen(true)}>+ Add Daily Sales</Button>
      </div>

      <div className={cards.cardGridTwoCol}>
        <Card className={cards.statCard}>
          <div className={cards.statLabel}>Total QTY</div>
          <div className={cards.statValue}>{totalQty.toLocaleString()}</div>
        </Card>
        <Card className={cards.statCardSuccess}>
          <div className={cards.statLabel}>Total Revenue</div>
          <div className={cards.statValue}>{formatUSD(totalRevenue)}</div>
        </Card>
      </div>

      <div className={layouts.spacingY}></div>

      <Card>
        <div className={filters.filterControls}>
          <div className={filters.filterField}>
            <label className={filters.filterLabel}>Shop</label>
            <select
              aria-label="Filter by shop"
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className={filters.filterSelect}
            >
              <option value="all">All Shops</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {['admin', 'leader'].includes(userRole) && (
            <div className={filters.filterField}>
              <label className={filters.filterLabel}>Owner</label>
              <select
                aria-label="Filter by owner"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className={filters.filterSelect}
              >
                <option value="all">All Owners</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
          )}

          <div className={filters.filterGroup}>
            <label className={filters.filterLabel}>Date Filter</label>

            <div className={layouts.flexColumn}>
              <div className={filters.filterButtons}>
                <Button variant={dateFilter === 'today' ? 'primary' : 'secondary'} onClick={() => setDateFilter('today')}>
                  Today
                </Button>
                <Button variant={dateFilter === 'this_month' ? 'primary' : 'secondary'} onClick={() => setDateFilter('this_month')}>
                  This Month
                </Button>
                <Button variant={dateFilter === 'last_month' ? 'primary' : 'secondary'} onClick={() => setDateFilter('last_month')}>
                  Last Month
                </Button>
                <Button variant={dateFilter === 'range' ? 'primary' : 'secondary'} onClick={() => setDateFilter('range')}>
                  Date Range
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setShopFilter('all');
                    setOwnerFilter('all');
                    setDateFilter('today');
                    setDateRange({ start: today, end: today });
                  }}
                >
                  Reset
                </Button>
              </div>

              {dateFilter === 'range' && (
                <div className={filters.dateRangeContainer}>
                  <div className={filters.dateRangeField}>
                    <label className={filters.filterLabel}>Start Date</label>
                    <input
                      aria-label="Start date"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className={filters.filterInput}
                    />
                  </div>

                  <div className={filters.dateRangeField}>
                    <label className={filters.filterLabel}>End Date</label>
                    <input
                      aria-label="End date"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className={filters.filterInput}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className={layouts.spacingY}></div>

      <Card>
        <div className={tables.tableWrapper}>
          <table className={tables.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shop</th>
                <th>Owner</th>
                <th>Product</th>
                <th>QTY</th>
                <th>Revenue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className={layouts.textCenter} style={{ padding: '2rem' }}>
                    <span className={layouts.textMuted}>No records found.</span>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Date">{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                    <td data-label="Shop">{r.shop?.name}</td>
                    <td data-label="Owner">
                      {(() => {
                        const shopData = r.shop;
                        const profile = Array.isArray(shopData?.profiles) ? shopData.profiles[0] : shopData?.profiles;

                        if (profile) {
                          return profile.full_name || profile.email || 'No Name';
                        }
                        return shopData?.owner_id ? `ID: ${shopData.owner_id.substring(0, 8)}...` : 'N/A';
                      })()}
                    </td>
                    <td data-label="Product">{r.product?.name}</td>
                    <td data-label="QTY">{r.items_sold}</td>
                    <td data-label="Revenue">{formatUSD(r.revenue)}</td>
                    <td data-label="Actions">
                      <div className={tables.tableActionsSmall}>
                        <Button variant="ghost" onClick={() => openEditModal(r)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                          Edit
                        </Button>
                        <Button variant="ghost" onClick={() => handleDelete(r.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Daily Sales Entry">
        <form onSubmit={handleSubmit} className={forms.form}>
          <div className={forms.formGridAuto}>
            <div className={forms.formField}>
              <label className={forms.formLabel}>Shop</label>
              <select
                aria-label="Select shop"
                className={forms.formSelect}
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                required
              >
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>

            <div className={forms.formField}>
              <label className={forms.formLabel}>Date</label>
              <input
                aria-label="Select date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={forms.formInput}
              />
            </div>
          </div>

          <div className={layouts.spacingTop}>
            <div className={layouts.flexRowSpaced} style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3 className={layouts.sectionHeaderSmall}>Products Sold</h3>
              <Button type="button" variant="ghost" onClick={addItem} style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                + Add row
              </Button>
            </div>

            <div className={layouts.flexColumn} style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {items.map((item, index) => (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px, 1fr) 70px 36px',
                  gap: '0.75rem',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    {index === 0 && <label className={forms.formLabel} style={{ marginBottom: '0.25rem' }}>Product</label>}
                    <select
                      aria-label="Select product"
                      className={forms.formSelect}
                      style={{ height: '40px' }}
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      required
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    {index === 0 && <label className={forms.formLabel} style={{ marginBottom: '0.25rem' }}>QTY</label>}
                    <input
                      aria-label="Quantity"
                      type="number"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      required
                      className={forms.formInput}
                      style={{ height: '40px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: index === 0 ? '1.25rem' : '0' }}>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        aria-label="Remove product row"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth disabled={loading} style={{ height: '48px', fontSize: '1rem', marginTop: '1rem' }}>
            {loading ? 'Submitting…' : 'Submit Daily Record'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Sales Entry">
        <form onSubmit={handleUpdate} className={forms.form}>
          <div className={forms.formField}>
            <label className={forms.formLabel}>Shop</label>
            <select
              aria-label="Select shop"
              className={forms.formSelect}
              value={formData.shopId}
              onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
              required
            >
              {shops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>

          <div className={forms.formField}>
            <label className={forms.formLabel}>Date</label>
            <input
              aria-label="Select date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className={forms.formInput}
            />
          </div>

          <div className={forms.formField}>
            <label className={forms.formLabel}>Product</label>
            <select
              aria-label="Select product"
              className={forms.formSelect}
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              required
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={forms.formField}>
            <label className={forms.formLabel}>Quantity Sold</label>
            <input
              aria-label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
              className={forms.formInput}
            />
          </div>

          <Button type="submit" fullWidth disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Updating…' : 'Update Sales Record'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
