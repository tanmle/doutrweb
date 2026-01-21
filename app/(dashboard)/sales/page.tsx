'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/utils/supabase/client';
import { Shop } from '@/lib/types';

export default function DailyEntryPage() {
  const [loading, setLoading] = useState(false);
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
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const router = useRouter();
  const supabase = createClient();

  // Form State
  const [shopId, setShopId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ productId: '', quantity: '' }]);

  useEffect(() => {
    const fetchData = async () => {
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
        alert('You must be logged in');
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
      alert('Please add at least one valid product record');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('sales_records').insert(records);

    if (error) {
        alert('Error saving records: ' + error.message);
    } else {
        alert('Daily records submitted successfully!');
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
        alert('Invalid product');
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
        alert('Error updating record: ' + error.message);
    } else {
        alert('Record updated successfully!');
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
        alert('Error deleting record: ' + error.message);
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Sales Records</h1>
        <Button onClick={() => setIsModalOpen(true)}>+ Add Daily Sales</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total QTY</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalQty.toLocaleString()}</div>
        </Card>
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatUSD(totalRevenue)}</div>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
          <div style={{ minWidth: '150px', flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Shop</label>
            <select value={shopFilter} onChange={(e) => setShopFilter(e.target.value)} style={{ width: '100%' }}>
              <option value="all">All Shops</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {['admin', 'leader'].includes(userRole) && (
            <div style={{ minWidth: '150px', flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Owner</label>
              <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ width: '100%' }}>
                <option value="all">All Owners</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
          )}

          <div style={{ minWidth: '300px', flex: 2, display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Start Date</label>
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                style={{ width: '100%', height: '40px', background: '#1a1a1a', border: '1px solid var(--border)', color: 'white', padding: '0 0.5rem', borderRadius: '4px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>End Date</label>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                style={{ width: '100%', height: '40px', background: '#1a1a1a', border: '1px solid var(--border)', color: 'white', padding: '0 0.5rem', borderRadius: '4px' }}
              />
            </div>
          </div>
          
          <Button variant="ghost" onClick={() => { setShopFilter('all'); setOwnerFilter('all'); setDateRange({start: '', end: ''}); }}>Reset</Button>
        </div>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Shop</th>
                <th style={{ padding: '0.75rem' }}>Owner</th>
                <th style={{ padding: '0.75rem' }}>Product</th>
                <th style={{ padding: '0.75rem' }}>QTY</th>
                <th style={{ padding: '0.75rem' }}>Revenue</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No records found.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '0.75rem' }}>{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                    <td style={{ padding: '0.75rem' }}>{r.shop?.name}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {(() => {
                        const shopData = r.shop;
                        // Supabase often returns the join under the table name or specified alias
                        const profile = Array.isArray(shopData?.profiles) ? shopData.profiles[0] : shopData?.profiles;
                        
                        if (profile) {
                          return profile.full_name || profile.email || 'No Name';
                        }
                        return shopData?.owner_id ? `ID: ${shopData.owner_id.substring(0, 8)}...` : 'N/A';
                      })()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{r.product?.name}</td>
                    <td style={{ padding: '0.75rem' }}>{r.items_sold}</td>
                    <td style={{ padding: '0.75rem' }}>{formatUSD(r.revenue)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '600px', maxWidth: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Shop</label>
              <select 
                style={{ width: '100%', height: '42px' }}
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                required
              >
                {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required 
                style={{ 
                  width: '100%', 
                  background: '#1a1a1a', 
                  border: '1px solid var(--border)', 
                  color: 'var(--foreground)', 
                  padding: '0.625rem 1rem', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: '0.875rem',
                  height: '42px'
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Products Sold</h3>
              <Button type="button" variant="ghost" onClick={addItem} style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                + Add row
              </Button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {items.map((item, index) => (
                <div key={index} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 80px 40px', 
                  gap: '0.75rem', 
                  alignItems: 'center', 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border)' 
                }}>
                  <div>
                    {index === 0 && <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--muted-foreground)' }}>Product</label>}
                    <select 
                      style={{ width: '100%', height: '40px' }}
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
                    {index === 0 && <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--muted-foreground)' }}>QTY</label>}
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      required 
                      style={{ 
                        width: '100%', 
                        background: '#1a1a1a', 
                        border: '1px solid var(--border)', 
                        color: 'var(--foreground)', 
                        padding: '0.5rem 0.5rem', 
                        borderRadius: 'var(--radius-md)', 
                        fontSize: '0.875rem',
                        height: '40px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: index === 0 ? '1.25rem' : '0' }}>
                    {items.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeItem(index)}
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

          <Button type="submit" fullWidth disabled={loading} style={{ height: '48px', fontSize: '1rem' }}>
            {loading ? 'Submitting...' : 'Submit Daily Record'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Sales Entry">
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '500px', maxWidth: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Shop</label>
              <select 
                style={{ width: '100%', height: '42px' }}
                value={formData.shopId}
                onChange={(e) => setFormData({...formData, shopId: e.target.value})}
                required
              >
                {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Date</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required 
                style={{ 
                  width: '100%', 
                  background: '#1a1a1a', 
                  border: '1px solid var(--border)', 
                  color: 'white', 
                  padding: '0.625rem 1rem', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: '0.875rem',
                  height: '42px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Product</label>
              <select 
                style={{ width: '100%', height: '42px' }}
                value={formData.productId}
                onChange={(e) => setFormData({...formData, productId: e.target.value})}
                required
              >
                {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Quantity Sold</label>
              <input 
                type="number" 
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                required 
                style={{ 
                  width: '100%', 
                  background: '#1a1a1a', 
                  border: '1px solid var(--border)', 
                  color: 'white', 
                  padding: '0.625rem 1rem', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: '0.875rem',
                  height: '42px'
                }}
              />
            </div>

            <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Updating...' : 'Update Sales Record'}
            </Button>
        </form>
      </Modal>
    </div>
  );
}

