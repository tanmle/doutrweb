'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { createUser, deleteUser, resetUserPassword } from './actions';

type Tab = 'products' | 'users' | 'fees' | 'configuration';
type FeeFilter = 'all' | 'today' | 'this_month' | 'last_month' | 'range';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const [refresh, setRefresh] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const router = useRouter();

  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]); 
  const [commissionRates, setCommissionRates] = useState<any[]>([]);

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isEditFeeModalOpen, setIsEditFeeModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form States
  const [formData, setFormData] = useState<any>({});

  // Default date for fee modal
  const today = new Date().toISOString().split('T')[0];

  // Get current user and role on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) {
          setCurrentUserRole(profile.role);
          if (profile.role !== 'admin') {
            router.push('/dashboard');
          }
        }
      } else {
        router.push('/login');
      }
    };
    getUser();
  }, [supabase, router]);

  // Fetch Data

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (activeTab === 'products') {
        const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (data) setProducts(data);
      } else if (activeTab === 'users') {
        const { data } = await supabase
          .from('profiles')
          .select('*, leader:profiles!leader_id(full_name)')
          .order('created_at', { ascending: false });
        if (data) setUsers(data);
        
        const { data: profileData } = await supabase.from('profiles').select('id, full_name, email, role');
        if (profileData) setProfiles(profileData);
      } else if (activeTab === 'fees') {
        let query = supabase
          .from('selling_fees')
          .select('*, owner_profile:profiles!owner_id(full_name)')
          .order('date', { ascending: false });
        
        const now = new Date();
        
        if (feeFilter === 'today') {
          query = query.eq('date', today);
        } else if (feeFilter === 'this_month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          query = query.gte('date', startOfMonth);
        } else if (feeFilter === 'last_month') {
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
          query = query.gte('date', startOfLastMonth).lte('date', endOfLastMonth);
        } else if (feeFilter === 'range' && dateRange.start && dateRange.end) {
          query = query.gte('date', dateRange.start).lte('date', dateRange.end);
        }

        if (ownerFilter !== 'all') {
          query = query.eq('owner_id', ownerFilter);
        }

        const { data, error } = await query;
        if (error) console.error('Fee fetch error:', error);
        if (data) setFees(data);
        
        const { data: profileData } = await supabase.from('profiles').select('id, full_name, email, role');
        if (profileData) setProfiles(profileData);
      } else if (activeTab === 'configuration') {
        const { data } = await supabase.from('commission_rates').select('*').order('level', { ascending: true });
        if (data) setCommissionRates(data);
      }
      setLoading(false);
    };
    fetchData();
  }, [activeTab, feeFilter, ownerFilter, dateRange, supabase, refresh, today]);

  const totalFeePrice = fees.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

  // Handle opening fee modal with default date and owner
  const openFeeModal = () => {
    setFormData({ 
      ...formData, 
      date: today,
      owner_id: currentUser?.id || '' 
    });
    setIsFeeModalOpen(true);
  };

  // Live formatting for input display
  const formatInputVND = (val: string) => {
    const numericValue = val.replace(/\D/g, '');
    if (!numericValue) return '';
    return new Intl.NumberFormat('vi-VN').format(parseInt(numericValue));
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Check if it's a price field for numeric extraction
    if (['price', 'base_price', 'selling_price'].includes(name)) {
      const numericValue = value.replace(/\D/g, '');
      setFormData({ 
        ...formData, 
        [name]: numericValue // Store raw numeric string in state for DB
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('products').insert({
      name: formData.name,
      base_price: parseFloat(formData.base_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
    });
    if (error) alert(error.message);
    else {
      setIsProductModalOpen(false);
      setFormData({});
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This cannot be undone.`)) return;
    setLoading(true);
    const result = await deleteUser(id);
    if (result.error) {
        alert(result.error);
    } else {
        alert('User deleted successfully');
        setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const handleResetPassword = async (id: string, email: string) => {
    const newPassword = prompt(`Enter new password for ${email}:`);
    if (!newPassword) return;
    if (newPassword.length < 6) return alert('Password must be at least 6 characters');
    
    setLoading(true);
    const result = await resetUserPassword(id, newPassword);
    if (result.error) {
        alert(result.error);
    } else {
        alert('Password reset successfully');
    }
    setLoading(false);
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);
    const { error } = await supabase.from('products').update({
      name: formData.name,
      base_price: parseFloat(formData.base_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
    }).eq('id', selectedProduct.id);

    if (error) alert(error.message);
    else {
      setIsEditProductModalOpen(false);
      setFormData({});
      setSelectedProduct(null);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const openEditProductModal = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      base_price: product.base_price.toString(),
      selling_price: product.selling_price.toString(),
    });
    setIsEditProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setLoading(true);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert(error.message);
    else setRefresh(prev => prev + 1);
    setLoading(false);
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('selling_fees').insert({
      name: formData.name,
      price: parseFloat(formData.price) || 0,
      owner_id: formData.owner_id || null,
      date: formData.date || new Date().toISOString().split('T')[0],
      note: formData.note || '',
    });
    if (error) alert(error.message);
    else {
      setIsFeeModalOpen(false);
      setFormData({});
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const handleUpdateFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;
    setLoading(true);
    const { error } = await supabase.from('selling_fees').update({
      name: formData.name,
      price: parseFloat(formData.price) || 0,
      owner_id: formData.owner_id || null,
      date: formData.date || new Date().toISOString().split('T')[0],
      note: formData.note || '',
    }).eq('id', selectedFee.id);

    if (error) alert(error.message);
    else {
      setIsEditFeeModalOpen(false);
      setFormData({});
      setSelectedFee(null);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const openEditFeeModal = (fee: any) => {
    setSelectedFee(fee);
    setFormData({
      name: fee.name,
      price: fee.price.toString(),
      owner_id: fee.owner_id || '',
      date: fee.date,
      note: fee.note || '',
    });
    setIsEditFeeModalOpen(true);
  };

  const handleDeleteFee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee?')) return;
    setLoading(true);
    const { error } = await supabase.from('selling_fees').delete().eq('id', id);
    if (error) alert(error.message);
    else setRefresh(prev => prev + 1);
    setLoading(false);
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      full_name: formData.full_name,
      role: formData.role,
      leader_id: formData.role === 'member' ? (formData.leader_id || null) : null
    }).eq('id', selectedUser.id);

    if (error) alert(error.message);
    else {
      setIsEditUserModalOpen(false);
      setFormData({});
      setSelectedUser(null);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const canEditUser = (targetRole: string) => {
    if (currentUserRole === 'admin') {
      return targetRole === 'leader' || targetRole === 'member';
    }
    if (currentUserRole === 'leader') {
      return targetRole === 'member';
    }
    return false;
  };

  const openEditUserModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || '',
      role: user.role,
      leader_id: user.leader_id || ''
    });
    setIsEditUserModalOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const res = await createUser({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role || 'member',
          leader_id: (formData.role === 'member' || !formData.role) ? formData.leader_id : null
      });

      if (res.error) {
          alert('Error: ' + res.error);
      } else {
          alert('User created successfully');
          setIsUserModalOpen(false);
          setFormData({});
          setRefresh(prev => prev + 1);
      }
      setLoading(false);
  };

  const handleCommissionChange = (id: string, field: string, value: string) => {
    setCommissionRates(prev => prev.map(rate => 
      rate.id === id ? { ...rate, [field]: parseFloat(value) || 0 } : rate
    ));
  };

  const handleSaveCommission = async () => {
    setLoading(true);
    const { error } = await supabase.from('commission_rates').upsert(commissionRates);
    if (error) {
      alert('Error updating commission rates: ' + error.message);
    } else {
      alert('Commission rates updated successfully!');
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };


  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Admin Control Center</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <Button variant={activeTab === 'products' ? 'primary' : 'ghost'} onClick={() => setActiveTab('products')}>
          Product Entry
        </Button>
        <Button variant={activeTab === 'users' ? 'primary' : 'ghost'} onClick={() => setActiveTab('users')}>
          User Management
        </Button>
        <Button variant={activeTab === 'fees' ? 'primary' : 'ghost'} onClick={() => setActiveTab('fees')}>
          Selling Fee
        </Button>
        <Button variant={activeTab === 'configuration' ? 'primary' : 'ghost'} onClick={() => setActiveTab('configuration')}>
          Configuration
        </Button>
      </div>

      {/* Content */}
      <Card>
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Product List</h3>
              <Button onClick={() => setIsProductModalOpen(true)}>+ Add New Product</Button>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem' }}>Name</th>
                      <th style={{ padding: '0.75rem' }}>Base Price</th>
                      <th style={{ padding: '0.75rem' }}>Selling Price</th>
                      <th style={{ padding: '0.75rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem' }}>{p.name}</td>
                        <td style={{ padding: '0.75rem' }}>{formatUSD(p.base_price)}</td>
                        <td style={{ padding: '0.75rem' }}>{formatUSD(p.selling_price)}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button variant="ghost" onClick={() => openEditProductModal(p)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                              Edit
                            </Button>
                            <Button variant="ghost" onClick={() => handleDeleteProduct(p.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>User List</h3>
              <Button onClick={() => setIsUserModalOpen(true)}>+ Add New User</Button>
            </div>
             <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                   <thead>
                    <tr style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem' }}>Email</th>
                      <th style={{ padding: '0.75rem' }}>Full Name</th>
                      <th style={{ padding: '0.75rem' }}>Role</th>
                      <th style={{ padding: '0.75rem' }}>Leader</th>
                      <th style={{ padding: '0.75rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem' }}>{u.full_name || 'N/A'}</td>
                        <td style={{ padding: '0.75rem' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <span style={{ 
                                    textTransform: 'capitalize', 
                                    padding: '0.2rem 0.5rem', 
                                    borderRadius: '4px', 
                                    fontSize: '0.75rem',
                                    background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : u.role === 'leader' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
                                    color: u.role === 'admin' ? '#ef4444' : u.role === 'leader' ? '#6366f1' : 'inherit'
                                }}>
                                    {u.role}
                                </span>
                                {u.role === 'leader' && (
                                    <span style={{ 
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        background: '#6366f1',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        padding: '0 0.4rem',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        border: '2px solid var(--card-bg)',
                                        zIndex: 1
                                    }}>
                                        {users.filter(user => user.leader_id === u.id).length}
                                    </span>
                                )}
                            </div>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {profiles.find(p => p.id === u.leader_id)?.full_name || '-'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                            {canEditUser(u.role) && (
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <Button variant="ghost" onClick={() => openEditUserModal(u)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                        Edit
                                    </Button>
                                    <Button variant="ghost" onClick={() => handleResetPassword(u.id, u.email)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#f59e0b' }}>
                                        Reset
                                    </Button>
                                    <Button variant="ghost" onClick={() => handleDeleteUser(u.id, u.email)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}>
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'fees' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ marginBottom: '0.75rem' }}>Selling Fees</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button variant={feeFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setFeeFilter('all')} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>All</Button>
                    <Button variant={feeFilter === 'today' ? 'primary' : 'secondary'} onClick={() => setFeeFilter('today')} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Today</Button>
                    <Button variant={feeFilter === 'this_month' ? 'primary' : 'secondary'} onClick={() => setFeeFilter('this_month')} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>This Month</Button>
                    <Button variant={feeFilter === 'last_month' ? 'primary' : 'secondary'} onClick={() => setFeeFilter('last_month')} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Last Month</Button>
                    <Button variant={feeFilter === 'range' ? 'primary' : 'secondary'} onClick={() => setFeeFilter('range')} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Date Range</Button>
                  </div>
                </div>
                <Button onClick={openFeeModal}>+ Add New Fee</Button>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ minWidth: '150px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Filter by Owner</label>
                  <select 
                    value={ownerFilter} 
                    onChange={(e) => setOwnerFilter(e.target.value)}
                    style={{ fontSize: '0.75rem', width: '100%' }}
                  >
                    <option value="all">All Owners</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </div>

                {feeFilter === 'range' && (
                  <>
                    <div style={{ minWidth: '150px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Start Date</label>
                      <input 
                        type="date" 
                        value={dateRange.start} 
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        style={{ fontSize: '0.75rem', width: '100%', padding: '0.5rem', background: '#1a1a1a', border: '1px solid var(--border)', color: 'white', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                    <div style={{ minWidth: '150px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>End Date</label>
                      <input 
                        type="date" 
                        value={dateRange.end} 
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        style={{ fontSize: '0.75rem', width: '100%', padding: '0.5rem', background: '#1a1a1a', border: '1px solid var(--border)', color: 'white', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem' }}>Fee Name</th>
                      <th style={{ padding: '0.75rem' }}>Price</th>
                      <th style={{ padding: '0.75rem' }}>Owner</th>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                      <th style={{ padding: '0.75rem' }}>Note</th>
                      <th style={{ padding: '0.75rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No fees found for this selection</td></tr>
                    ) : (
                      <>
                        {fees.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem' }}>{f.name}</td>
                            <td style={{ padding: '0.75rem' }}>{formatVND(f.price)}</td>
                            <td style={{ padding: '0.75rem' }}>{f.owner_profile?.full_name || 'Unknown'}</td>
                            <td style={{ padding: '0.75rem' }}>{f.date}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{f.note || '-'}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Button variant="ghost" onClick={() => openEditFeeModal(f)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                  Edit
                                </Button>
                                <Button variant="ghost" onClick={() => handleDeleteFee(f.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}>
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)', fontWeight: 'bold' }}>
                          <td style={{ padding: '1rem 0.75rem' }}>Total</td>
                          <td style={{ padding: '1rem 0.75rem', color: 'var(--primary)' }}>{formatVND(totalFeePrice)}</td>
                          <td colSpan={4}></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Commission Configuration</h3>
              <Button onClick={handleSaveCommission} disabled={loading}>
                {loading ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
              {/* Company Products Table */}
              <div>
                <h4 style={{ marginBottom: '1rem', color: 'var(--primary)', fontWeight: 600 }}>COMPANY PRODUCTS</h4>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        <th style={{ padding: '0.75rem' }}>Level</th>
                        <th style={{ padding: '0.75rem' }}>Profit per month ($)</th>
                        <th style={{ padding: '0.75rem' }}>% Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionRates.filter(r => r.type === 'company').map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 500 }}>Level {r.level}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              type="number" 
                              value={r.profit_threshold} 
                              onChange={(e) => handleCommissionChange(r.id, 'profit_threshold', e.target.value)}
                              style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: 'inherit', padding: '0.25rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <input 
                                type="number" 
                                value={r.commission_percent} 
                                onChange={(e) => handleCommissionChange(r.id, 'commission_percent', e.target.value)}
                                style={{ width: '60px', background: 'transparent', border: '1px solid transparent', color: 'inherit', padding: '0.25rem' }}
                              />
                              <span>%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Self-Researched Products Table */}
              <div>
                <h4 style={{ marginBottom: '1rem', color: '#10b981', fontWeight: 600 }}>SELF-RESEARCHED PRODUCT</h4>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        <th style={{ padding: '0.75rem' }}>Level</th>
                        <th style={{ padding: '0.75rem' }}>Profit per month ($)</th>
                        <th style={{ padding: '0.75rem' }}>% Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionRates.filter(r => r.type === 'self_researched').map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 500 }}>Level {r.level}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              type="number" 
                              value={r.profit_threshold} 
                              onChange={(e) => handleCommissionChange(r.id, 'profit_threshold', e.target.value)}
                              style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: 'inherit', padding: '0.25rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <input 
                                type="number" 
                                value={r.commission_percent} 
                                onChange={(e) => handleCommissionChange(r.id, 'commission_percent', e.target.value)}
                                style={{ width: '60px', background: 'transparent', border: '1px solid transparent', color: 'inherit', padding: '0.25rem' }}
                              />
                              <span>%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Add New Product">
        <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Product Name" name="name" onChange={handleInputChange} required />
          <Input 
            label="Base Price (USD)" 
            name="base_price" 
            value={formatInputVND(formData.base_price || '')}
            onChange={handleInputChange} 
            required 
          />
          <Input 
            label="Selling Price (USD)" 
            name="selling_price" 
            value={formatInputVND(formData.selling_price || '')}
            onChange={handleInputChange} 
            required 
          />
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Product'}</Button>
        </form>
      </Modal>

      <Modal isOpen={isFeeModalOpen} onClose={() => setIsFeeModalOpen(false)} title="Add New Fee">
        <form onSubmit={handleFeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Fee Name" name="name" onChange={handleInputChange} required />
          <Input 
            label="Price (VND)" 
            name="price" 
            value={formatInputVND(formData.price || '')}
            onChange={handleInputChange} 
            required 
          />
          
          <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Owner</label>
              <select 
                name="owner_id" 
                value={formData.owner_id || ''} 
                onChange={handleInputChange} 
                style={{ width: '100%' }}
              >
                  <option value="">Select User</option>
                  {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                  ))}
              </select>
          </div>

          <Input 
            label="Date" 
            name="date" 
            type="date" 
            value={formData.date || today} 
            onChange={handleInputChange} 
            required
            placeholder="Select date"
          />

          <Input label="Note" name="note" onChange={handleInputChange} placeholder="Add any details about this fee..." />
          
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Fee'}</Button>
        </form>
      </Modal>

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Create New User">
        <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Email Address" type="email" name="email" onChange={handleInputChange} required />
          <Input label="Password" type="password" name="password" onChange={handleInputChange} required />
          <Input label="Full Name" name="full_name" onChange={handleInputChange} required />
          
          <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Role</label>
              <select name="role" value={formData.role || 'member'} onChange={handleInputChange} style={{ width: '100%' }}>
                  <option value="member">Member</option>
                  <option value="leader">Leader</option>
                  <option value="admin">Admin</option>
              </select>
          </div>

          {(formData.role === 'member' || !formData.role) && (
            <div>
               <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Assign Leader</label>
               <select 
                 name="leader_id" 
                 value={formData.leader_id || ''} 
                 onChange={handleInputChange} 
                 style={{ width: '100%' }}
               >
                   <option value="">No Leader</option>
                   {profiles.filter(p => p.role === 'leader').map(p => (
                       <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                   ))}
               </select>
            </div>
          )}

          <Button type="submit" disabled={loading}>{loading ? 'Creating User...' : 'Create User'}</Button>
        </form>
      </Modal>

      <Modal isOpen={isEditProductModalOpen} onClose={() => setIsEditProductModalOpen(false)} title="Edit Product">
        <form onSubmit={handleUpdateProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Product Name" name="name" value={formData.name || ''} onChange={handleInputChange} required />
          <Input 
            label="Base Price (USD)" 
            name="base_price" 
            value={formatInputVND(formData.base_price || '')}
            onChange={handleInputChange} 
            required 
          />
          <Input 
            label="Selling Price (USD)" 
            name="selling_price" 
            value={formatInputVND(formData.selling_price || '')}
            onChange={handleInputChange} 
            required 
          />
          <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Product'}</Button>
        </form>
      </Modal>

      <Modal isOpen={isEditFeeModalOpen} onClose={() => setIsEditFeeModalOpen(false)} title="Edit Fee">
        <form onSubmit={handleUpdateFeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Fee Name" name="name" value={formData.name || ''} onChange={handleInputChange} required />
          <Input 
            label="Price (VND)" 
            name="price" 
            value={formatInputVND(formData.price || '')}
            onChange={handleInputChange} 
            required 
          />
          
          <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Owner</label>
              <select 
                name="owner_id" 
                value={formData.owner_id || ''} 
                onChange={handleInputChange} 
                style={{ width: '100%' }}
              >
                  <option value="">Select User</option>
                  {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                  ))}
              </select>
          </div>

          <Input 
            label="Date" 
            name="date" 
            type="date" 
            value={formData.date || today} 
            onChange={handleInputChange} 
            required
          />

          <Input label="Note" name="note" value={formData.note || ''} onChange={handleInputChange} />
          
          <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Fee'}</Button>
        </form>
      </Modal>

      <Modal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} title="Edit User">
        <form onSubmit={handleUpdateUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Editing: <strong>{selectedUser?.email}</strong></p>
          </div>
          
          <Input 
            label="Full Name" 
            name="full_name" 
            value={formData.full_name || ''} 
            onChange={handleInputChange} 
            required 
          />
          
          <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Role</label>
              <select 
                name="role" 
                value={formData.role || 'member'} 
                onChange={handleInputChange} 
                style={{ width: '100%' }}
              >
                  <option value="member">Member</option>
                  <option value="leader">Leader</option>
                  <option value="admin">Admin</option>
              </select>
          </div>

          {formData.role === 'member' && (
            <div>
               <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Assign Leader</label>
               <select 
                 name="leader_id" 
                 value={formData.leader_id || ''} 
                 onChange={handleInputChange} 
                 style={{ width: '100%' }}
               >
                   <option value="">No Leader</option>
                   {profiles.filter(p => p.role === 'leader').map(p => (
                       <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                   ))}
               </select>
            </div>
          )}

          <p style={{ fontSize: '0.7rem', color: '#ef4444' }}>
            Note: Passwords cannot be changed here for security reasons.
          </p>

          <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update User'}</Button>
        </form>
      </Modal>
    </div>
  );
}


