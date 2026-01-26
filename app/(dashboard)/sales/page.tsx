'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/ToastProvider';
import { useSupabase } from '@/contexts/SupabaseContext';
import { formatCurrency } from '@/utils/formatters';
import { SalesTable } from './components';
import { forms, cards, tables, filters, layouts, sales } from '@/styles/modules';
import type {
  Shop,
  Product,
  Profile,
  SalesRecordWithRelations,
  SalesFormData,
  SalesItem,
  DateFilterType,
  DateRange,
  CommissionRate
} from './types';
import { sendAchievementNotification, checkThresholdCrossed } from '@/utils/notifications';
import { useRealtime } from '@/hooks/useRealtime';

export default function DailyEntryPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalesRecordWithRelations | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [records, setRecords] = useState<SalesRecordWithRelations[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [userRole, setUserRole] = useState<string>('member');

  // Grid Filters
  const [shopFilter, setShopFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().split('T')[0];
    return { start: today, end: today };
  });

  const toast = useToast();
  const router = useRouter();
  const supabase = useSupabase();

  // Form State
  const [shopId, setShopId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<SalesItem[]>([{ productId: '', quantity: '', price: '' }]);
  const [formData, setFormData] = useState<SalesFormData>({
    shopId: '',
    date: '',
    productId: '',
    quantity: '',
    price: ''
  });

  // Real-time subscription for sales records
  useRealtime({
    table: 'sales_records',
    onData: () => {
      // Trigger a re-fetch when data changes
      setRefresh(prev => prev + 1);
    }
  });

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
            setItems([{
              productId: productsData[0].id,
              quantity: '',
              price: productsData[0].selling_price.toString()
            }]);
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
                profiles!owner_id(full_name, email, role)
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
  }, [refresh, shopFilter, ownerFilter, dateRange.start, dateRange.end]); // Fixed: removed unstable dependencies

  const addItem = () => {
    setItems([...items, {
      productId: products[0]?.id || '',
      quantity: '',
      price: products[0]?.selling_price?.toString() || ''
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].price = product.selling_price.toString();
      }
    }
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
      const unitPrice = parseFloat(item.price) || 0;
      const revenue = quantity * unitPrice;
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

    // Auto-Achievement Checks: Pre-fetch previous stats
    // We fetch existing stats BEFORE insertion to establish a baseline
    let companyRates: CommissionRate[] = [];
    let selfRates: CommissionRate[] = [];
    let prevCompanyProfit = 0;
    let prevSelfProfit = 0;

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

      const [ratesData, salesData] = await Promise.all([
        supabase.from('commission_rates').select('*'),
        supabase.from('sales_records')
          .select('profit, product:products(type)')
          .eq('created_by', user.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
      ]);

      if (ratesData.data) {
        companyRates = ratesData.data.filter(r => r.type === 'company');
        selfRates = ratesData.data.filter(r => r.type === 'self_researched');
      }

      if (salesData.data) {
        salesData.data.forEach((sale: any) => {
          const type = sale.product?.type || 'company';
          if (type === 'self_researched') {
            prevSelfProfit += sale.profit || 0;
          } else {
            prevCompanyProfit += sale.profit || 0;
          }
        });
      }
    } catch (err) {
      console.error('Error preparing achievement check:', err);
    }

    const { error } = await supabase.from('sales_records').insert(records);

    if (error) {
      toast.error('Error saving records: ' + error.message);
    } else {
      toast.success('Daily records submitted successfully!');

      // Calculate newly added profit
      let addedCompanyProfit = 0;
      let addedSelfProfit = 0;

      records.forEach(r => {
        const product = products.find(p => p.id === r.product_id);
        const type = product?.type || 'company';
        if (type === 'self_researched') {
          addedSelfProfit += r.profit;
        } else {
          addedCompanyProfit += r.profit;
        }
      });

      // Check thresholds
      if (addedCompanyProfit > 0 && companyRates.length > 0) {
        const current = prevCompanyProfit + addedCompanyProfit;
        const crossed = checkThresholdCrossed(prevCompanyProfit, current, companyRates);
        if (crossed) {
          sendAchievementNotification(user.id, crossed.level, current, crossed.threshold);
        }
      }

      if (addedSelfProfit > 0 && selfRates.length > 0) {
        const current = prevSelfProfit + addedSelfProfit;
        const crossed = checkThresholdCrossed(prevSelfProfit, current, selfRates);
        if (crossed) {
          sendAchievementNotification(user.id, crossed.level, current, crossed.threshold);
        }
      }

      setItems([{ productId: products[0]?.id || '', quantity: '', price: products[0]?.selling_price?.toString() || '' }]);
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
    const unitPrice = parseFloat(formData.price) || 0;
    const revenue = quantity * unitPrice;
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
    const unitPrice = record.items_sold > 0 ? (record.revenue / record.items_sold) : 0;
    setFormData({
      shopId: record.shop_id,
      date: record.date,
      productId: record.product_id,
      quantity: record.items_sold.toString(),
      price: unitPrice.toString()
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

  const totalQty = records.reduce((sum, r) => sum + (r.items_sold || 0), 0);
  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0);

  if (initialLoading) {
    return <LoadingIndicator label="Loading sales data…" />;
  }

  return (
    <div>


      <div className={cards.cardGridTwoCol}>
        <StatCard
          label="Total QTY"
          value={totalQty.toLocaleString()}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          variant="success"
        />
      </div>

      <div className={layouts.spacingY}></div>

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
                    onClick={(e) => e.currentTarget.showPicker()}
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
                    onClick={(e) => e.currentTarget.showPicker()}
                    className={filters.filterInput}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={layouts.hideOnMobile} style={{ marginLeft: 'auto', paddingBottom: '2px' }}>
          <Button onClick={() => setIsModalOpen(true)}>+ Add Daily Sales</Button>
        </div>
      </div>

      <div className={layouts.spacingBottom}></div>

      <div className={layouts.showOnMobile}>
        <Button onClick={() => setIsModalOpen(true)} fullWidth>+ Add Daily Sales</Button>
      </div>

      <div className={layouts.spacingY}></div>

      <SalesTable
        records={records}
        loading={false}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

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
                onClick={(e) => e.currentTarget.showPicker()}
                required
                className={forms.formInput}
              />
            </div>
          </div>

          <div className={layouts.spacingTop}>
            <div className={`${layouts.flexRowSpaced} ${sales.productsSectionHeader}`}>
              <h3 className={layouts.sectionHeaderSmall}>Products Sold</h3>
              <Button type="button" variant="ghost" onClick={addItem} className={sales.addButton}>
                + Add row
              </Button>
            </div>

            {items.length > 0 && (
              <div style={{ padding: '0 0.75rem 0.5rem', display: 'flex', gap: '0.75rem' }}>
                <label className={forms.formLabel} style={{ flex: 3.5, marginBottom: 0 }}>Product</label>
                <label className={forms.formLabel} style={{ flex: 1.2, marginBottom: 0 }}>Price($)</label>
                <label className={forms.formLabel} style={{ flex: 1.2, marginBottom: 0 }}>QTY</label>
                <div style={{ width: '32px' }}></div>
              </div>
            )}

            <div className={sales.productsList}>
              {items.map((item, index) => {
                const qty = parseInt(item.quantity) || 0;
                const price = parseFloat(item.price) || 0;
                const total = qty * price;

                return (
                  <div key={index} className={sales.productRow}>
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%', alignItems: 'flex-start' }}>
                      <div style={{ flex: 3.5 }}>
                        <select
                          aria-label="Select product"
                          className={forms.formSelect}
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          required
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1.2 }}>
                        <input
                          aria-label="Selling Price"
                          type="number"
                          placeholder="0"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          required
                          className={forms.formInput}
                        />
                      </div>

                      <div style={{ flex: 1.2 }}>
                        <input
                          aria-label="Quantity"
                          type="number"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          required
                          className={forms.formInput}
                        />
                      </div>

                      <div className={sales.removeButtonContainer} style={{ width: '32px', paddingTop: '0.6rem' }}>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            aria-label="Remove product row"
                            className={sales.removeButton}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{
                      width: '100%',
                      textAlign: 'right',
                      fontSize: '0.8rem',
                      color: 'var(--muted-foreground)',
                      paddingRight: '2.5rem'
                    }}>
                      Total: <span style={{ color: '#60a5fa', fontWeight: 600 }}>{formatCurrency(total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button type="submit" fullWidth disabled={loading} className={sales.submitButton}>
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
              onClick={(e) => e.currentTarget.showPicker()}
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
            <label className={forms.formLabel}>Selling Price</label>
            <input
              aria-label="Selling Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              className={forms.formInput}
            />
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

          <Button type="submit" fullWidth disabled={loading} className={sales.updateButton}>
            {loading ? 'Updating…' : 'Update Sales Record'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
