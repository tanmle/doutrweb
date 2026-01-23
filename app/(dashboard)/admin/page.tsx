'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { createUser, deleteUser, resetUserPassword } from './actions';
import { generatePayroll, updatePayrollRecord } from './actions_payroll';
import { useAuth } from './hooks/useAuth';
import { useAdminData } from './hooks/useAdminData';
import {
  TabNavigation,
  ProductsTab,
  UsersTab,
  FeesTab,
  ConfigurationTab,
  PayrollTab,
  ProductModal,
  FeeModal,
  UserModal,
  PayrollModal,
  GeneratePayrollModal,
  AdminTableStyles,
} from './components';
import type { Tab, FeeFilter, Product, User, Fee, FormData, PayrollRecord } from './utils/types';
import styles from './components/AdminComponents.module.css';

export default function AdminPage() {
  // Tab and filter states
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [refresh, setRefresh] = useState(0);
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isEditFeeModalOpen, setIsEditFeeModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedPayrollRecord, setSelectedPayrollRecord] = useState<PayrollRecord | null>(null);
  const [isGeneratePayrollModalOpen, setIsGeneratePayrollModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({});
  const [loading, setLoading] = useState(false);

  // Hooks
  const { currentUser, currentUserRole, isLoading: authLoading, canEditUser } = useAuth();
  const {
    loading: dataLoading,
    products,
    users,
    fees,
    profiles,
    commissionRates,
    setCommissionRates,
    payrollRecords,
  } = useAdminData({ activeTab, feeFilter, ownerFilter, dateRange, month: payrollMonth, refresh });

  const supabase = createClient();
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];

  // Computed values
  const totalFeePrice = fees.reduce((acc, curr) => acc + (parseFloat(curr.price as any) || 0), 0);

  // Input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (['price', 'base_price', 'selling_price'].includes(name)) {
      const numericValue = value.replace(/\D/g, '');
      setFormData({ ...formData, [name]: numericValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Product handlers
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('products').insert({
      name: formData.name,
      sku: formData.sku || null,
      base_price: parseFloat(formData.base_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      type: formData.type || 'company',
      owner_id: formData.type === 'self_researched' ? (formData.owner_id || null) : null,
    });
    if (error) toast.error(error.message);
    else {
      setIsProductModalOpen(false);
      setFormData({});
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);
    const { error } = await supabase.from('products').update({
      name: formData.name,
      sku: formData.sku || null,
      base_price: parseFloat(formData.base_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      type: formData.type,
      owner_id: formData.type === 'self_researched' ? (formData.owner_id || null) : null,
    }).eq('id', selectedProduct.id);

    if (error) toast.error(error.message);
    else {
      setIsEditProductModalOpen(false);
      setFormData({});
      setSelectedProduct(null);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const openEditProductModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      base_price: product.base_price.toString(),
      selling_price: product.selling_price.toString(),
      type: product.type || 'company',
      owner_id: product.owner_id || '',
    });
    setIsEditProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setLoading(true);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error(error.message);
    else setRefresh(prev => prev + 1);
    setLoading(false);
  };

  // Fee handlers
  const openFeeModal = () => {
    setFormData({
      date: today,
      owner_id: currentUser?.id || ''
    });
    setIsFeeModalOpen(true);
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('selling_fees').insert({
      name: formData.name,
      price: parseFloat(formData.price) || 0,
      owner_id: formData.owner_id || null,
      date: formData.date || today,
      note: formData.note || '',
    });
    if (error) toast.error(error.message);
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
      date: formData.date || today,
      note: formData.note || '',
    }).eq('id', selectedFee.id);

    if (error) toast.error(error.message);
    else {
      setIsEditFeeModalOpen(false);
      setFormData({});
      setSelectedFee(null);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const openEditFeeModal = (fee: Fee) => {
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
    if (error) toast.error(error.message);
    else setRefresh(prev => prev + 1);
    setLoading(false);
  };

  // User handlers
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createUser({
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      role: formData.role || 'member',
      leader_id: (formData.role === 'member' || !formData.role) ? formData.leader_id : null,
      bank_name: formData.bank_name,
      bank_number: formData.bank_number,
      base_salary: parseFloat(formData.base_salary) || 0
    });

    if (res.error) {
      toast.error('Error: ' + res.error);
    } else {
      toast.success('User created successfully');
      setIsUserModalOpen(false);
      setFormData({});
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      full_name: formData.full_name,
      role: formData.role,
      leader_id: formData.role === 'member' ? (formData.leader_id || null) : null,
      bank_name: formData.bank_name || null,
      bank_number: formData.bank_number || null,
      base_salary: parseFloat(formData.base_salary) || 0
    }).eq('id', selectedUser.id);

    if (error) toast.error(error.message);
    else {
      setIsEditUserModalOpen(false);
      setFormData({});
      setSelectedUser(null);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const openEditUserModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || '',
      role: user.role,
      leader_id: user.leader_id || '',
      bank_name: user.bank_name || '',
      bank_number: user.bank_number || '',
      base_salary: user.base_salary || ''
    });
    setIsEditUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This cannot be undone.`)) return;
    setLoading(true);
    const result = await deleteUser(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('User deleted successfully');
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  const handleResetPassword = async (id: string, email: string) => {
    const newPassword = prompt(`Enter new password for ${email}:`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await resetUserPassword(id, newPassword);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Password reset successfully');
    }
    setLoading(false);
  };

  // Configuration handlers
  const handleCommissionChange = (id: string, field: string, value: string) => {
    setCommissionRates(prev => prev.map(rate =>
      rate.id === id ? { ...rate, [field]: parseFloat(value) || 0 } : rate
    ));
  };

  const handleSaveCommission = async () => {
    setLoading(true);
    const { error } = await supabase.from('commission_rates').upsert(commissionRates);
    if (error) {
      toast.error('Error updating commission rates: ' + error.message);
    } else {
      toast.success('Commission rates updated successfully!');
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  // Payroll handlers
  const handleGeneratePayroll = () => {
    setIsGeneratePayrollModalOpen(true);
  };

  const handleBulkGenerateSubmit = async (standardDays: number, userDays: Record<string, number>) => {
    setLoading(true);
    const result = await generatePayroll(payrollMonth, standardDays, userDays);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Payroll generated for ${payrollMonth}`);
      setRefresh(prev => prev + 1);
      setIsGeneratePayrollModalOpen(false);
    }
    setLoading(false);
  };

  const openEditPayrollModal = (record: PayrollRecord) => {
    setSelectedPayrollRecord(record);
    setIsPayrollModalOpen(true);
  };

  const handleUpdatePayrollSubmit = async (data: any) => {
    if (!selectedPayrollRecord) return;
    setLoading(true);
    const result = await updatePayrollRecord(selectedPayrollRecord.id, {
      standard_work_days: data.standard_work_days,
      actual_work_days: data.actual_work_days,
      bonus: data.bonus,
      total_salary: data.total_salary,
      status: data.status
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Payroll record updated');
      setIsPayrollModalOpen(false);
      setSelectedPayrollRecord(null);
      setRefresh(prev => prev + 1);
    }
    setLoading(false);
  };

  if (authLoading) {
    return <LoadingIndicator label="Loading admin data…" />;
  }

  return (
    <div>
      <h1 className={styles.pageHeader}>
        Admin Control Center
      </h1>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <Card>
        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            onAddProduct={() => setIsProductModalOpen(true)}
            onEditProduct={openEditProductModal}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            users={users}
            profiles={profiles}
            canEditUser={canEditUser}
            onAddUser={() => setIsUserModalOpen(true)}
            onEditUser={openEditUserModal}
            onResetPassword={handleResetPassword}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {activeTab === 'fees' && (
          <FeesTab
            fees={fees}
            profiles={profiles}
            feeFilter={feeFilter}
            ownerFilter={ownerFilter}
            dateRange={dateRange}
            totalFeePrice={totalFeePrice}
            onAddFee={openFeeModal}
            onEditFee={openEditFeeModal}
            onDeleteFee={handleDeleteFee}
            onFeeFilterChange={setFeeFilter}
            onOwnerFilterChange={setOwnerFilter}
            onDateRangeChange={setDateRange}
          />
        )}

        {activeTab === 'configuration' && (
          <ConfigurationTab
            commissionRates={commissionRates}
            loading={loading}
            onCommissionChange={handleCommissionChange}
            onSave={handleSaveCommission}
          />
        )}

        {activeTab === 'payroll' && (
          <PayrollTab
            payrollRecords={payrollRecords}
            users={users} // pass users if needed for extra info, though records have user relation
            loading={dataLoading}
            month={payrollMonth}
            onMonthChange={setPayrollMonth}
            onGenerate={handleGeneratePayroll}
            onEdit={openEditPayrollModal}
          />
        )}
      </Card>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        formData={formData}
        profiles={profiles}
        loading={loading}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={handleProductSubmit}
        onChange={handleInputChange}
      />

      <ProductModal
        isOpen={isEditProductModalOpen}
        isEdit
        formData={formData}
        profiles={profiles}
        loading={loading}
        onClose={() => setIsEditProductModalOpen(false)}
        onSubmit={handleUpdateProductSubmit}
        onChange={handleInputChange}
      />

      <FeeModal
        isOpen={isFeeModalOpen}
        formData={formData}
        profiles={profiles}
        loading={loading}
        today={today}
        onClose={() => setIsFeeModalOpen(false)}
        onSubmit={handleFeeSubmit}
        onChange={handleInputChange}
      />

      <FeeModal
        isOpen={isEditFeeModalOpen}
        isEdit
        formData={formData}
        profiles={profiles}
        loading={loading}
        today={today}
        onClose={() => setIsEditFeeModalOpen(false)}
        onSubmit={handleUpdateFeeSubmit}
        onChange={handleInputChange}
      />

      <UserModal
        isOpen={isUserModalOpen}
        formData={formData}
        profiles={profiles}
        loading={loading}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleUserSubmit}
        onChange={handleInputChange}
      />

      <UserModal
        isOpen={isEditUserModalOpen}
        isEdit
        formData={formData}
        profiles={profiles}
        loading={loading}
        selectedUser={selectedUser}
        onClose={() => setIsEditUserModalOpen(false)}
        onSubmit={handleUpdateUserSubmit}
        onChange={handleInputChange}
      />

      <GeneratePayrollModal
        isOpen={isGeneratePayrollModalOpen}
        users={users}
        existingRecords={payrollRecords}
        month={payrollMonth}
        loading={loading}
        onClose={() => setIsGeneratePayrollModalOpen(false)}
        onSubmit={handleBulkGenerateSubmit}
      />

      <PayrollModal
        isOpen={isPayrollModalOpen}
        record={selectedPayrollRecord}
        user={selectedPayrollRecord?.user ? {
          id: selectedPayrollRecord.user_id,
          full_name: selectedPayrollRecord.user.full_name,
          base_salary: selectedPayrollRecord.user.base_salary,
          bank_name: selectedPayrollRecord.user.bank_name,
          bank_number: selectedPayrollRecord.user.bank_number
        } : null}
        month={payrollMonth}
        loading={loading}
        onClose={() => setIsPayrollModalOpen(false)}
        onSubmit={handleUpdatePayrollSubmit}
      />

      <AdminTableStyles />
    </div>
  );
}
