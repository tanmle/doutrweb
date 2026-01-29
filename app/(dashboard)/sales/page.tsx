'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/ToastProvider';
import { useSupabase } from '@/contexts/SupabaseContext';
import { formatCurrency } from '@/utils/formatters';
import { SalesTable } from './components';
import { forms, layouts, filters, cards } from '@/styles/modules';
import type { Shop, SalesRecordWithRelations, DateFilterType, DateRange, Profile } from './types';

// Date helpers
const getDateRange = (type: DateFilterType): DateRange => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  switch (type) {
    case 'today':
      return { start: today, end: today };
    case 'this_month':
      return { start: startOfMonth, end: today };
    case 'last_month':
      return { start: prevMonthStart, end: prevMonthEnd };
    case 'range':
      return { start: startOfMonth, end: today }; // Default range
    default:
      return { start: startOfMonth, end: today };
  }
};

// CSV Parsing Helper
const parseCSVLine = (text: string) => {
  const result = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  result.push(cell.trim());
  return result;
};

export default function SalesEntryPage() {
  const [loading, setLoading] = useState(true);

  const [records, setRecords] = useState<SalesRecordWithRelations[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  // Filters State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('this_month'));
  const [ownerFilter, setOwnerFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRole, setUserRole] = useState<string>('member'); // Default to member for security

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState('');

  // Edit/Delete State
  const [selectedRecord, setSelectedRecord] = useState<SalesRecordWithRelations | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]); // Need products for dropdown
  const [formData, setFormData] = useState({
    shopId: '',
    date: '',
    productId: '',
    quantity: '',
    price: '', // revenue
    status: ''
  });

  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = useSupabase();
  const toast = useToast();

  // Fetch Initial Data
  useEffect(() => {
    const fetchContext = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get User Role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const role = profile?.role || 'member';
      setUserRole(role);

      // Fetch shops the user has access to
      let query = supabase.from('shops').select('id, name, owner_id');
      // If member/leader, RLS should handle it, but we can also filter for clarity or if RLS is loose
      if (role !== 'admin' && role !== 'leader') { // Leaders might see their team's shops? Assuming standard role logic
        // For now rely on RLS or specific logic. Payouts used: if(role!==admin) filter.
      }
      const { data: shopsData } = await query.order('name');

      if (shopsData) {
        setShops(shopsData);
        if (shopsData.length > 0) setSelectedShopId(shopsData[0].id);
      }

      // Fetch Profiles for Owner Filter (Admin/Leader only)
      if (['admin', 'leader'].includes(role)) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email, role').order('full_name');
        if (profilesData) setProfiles(profilesData);
      }

      // Fetch Products for Edit Modal
      const { data: productsData } = await supabase.from('products').select('*').order('name');
      if (productsData) setProducts(productsData);

      setLoading(false);
    };
    fetchContext();
  }, []);

  // Update date range when filter type changes
  useEffect(() => {
    if (dateFilter !== 'range') {
      setDateRange(getDateRange(dateFilter));
    }
  }, [dateFilter]);

  // Fetch records when filters change
  useEffect(() => {
    if (userRole) fetchRecords();
  }, [dateRange, ownerFilter, shopFilter, orderStatusFilter, userRole, dateFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('sales_records')
      .select(`
        *,
        shop:shops!inner(id, name, owner_id, profiles:owner_id(full_name, email)),
        product:products(id, name, sku)
      `)
      .order('created_at', { ascending: false });

    // Apply Filters
    if (dateRange.start) query.gte('created_at', dateRange.start);
    if (dateRange.end) query.lte('created_at', dateRange.end + 'T23:59:59');

    // Filter by Shop Owner
    if (['admin', 'leader'].includes(userRole)) {
      if (ownerFilter) {
        query = query.eq('shop.owner_id', ownerFilter);
      }
    } else {
      // Members see only their own data
      query = query.eq('shop.owner_id', user.id);
    }

    if (shopFilter !== 'all') {
      query = query.eq('shop_id', shopFilter);
    }

    if (orderStatusFilter !== 'all') {
      query = query.eq('order_status', orderStatusFilter);
    }

    const { data } = await query.limit(100);

    if (data) {
      setRecords(data as any);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedShopId) {
      toast.error('Please select a shop and a CSV file');
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) {
          throw new Error('CSV file is empty or invalid');
        }

        // Parse Headers to find column indices
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

        const idxOrderId = headers.indexOf('order id');
        const idxStatus = headers.findIndex(h => h === 'order status');
        const idxSubStatus = headers.findIndex(h => h === 'order substatus');
        const idxSkuId = headers.findIndex(h => h === 'sku id');
        const idxQuantity = headers.findIndex(h => h === 'quantity');
        const idxAmount = headers.findIndex(h => h === 'order amount');

        const idxSellerSku = headers.findIndex(h => h === 'seller sku');
        const idxCreatedTime = headers.findIndex(h => h === 'created time');

        if (idxOrderId === -1) throw new Error('Column "Order ID" not found in CSV');

        // Fetch products for SKU mapping
        const { data: productsData } = await supabase.from('products').select('id, sku');
        const productMap = new Map<string, string>(); // sku -> id
        if (productsData) {
          productsData.forEach(p => {
            if (p.sku) productMap.set(p.sku.toLowerCase().trim(), p.id);
          });
        }

        const newRecords = [];
        // Start from line 1 (skip header)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = parseCSVLine(line);

          // Basic validation
          if (cols.length < headers.length * 0.5) continue; // Skip malformed lines

          // Create raw_data object
          const rawObj: any = {};
          headers.forEach((h, index) => {
            rawObj[h] = cols[index] || '';
          });

          // Resolve Product ID from SKU ID (ignoring Seller SKU as requested)
          const sellerSku = idxSellerSku !== -1 ? cols[idxSellerSku] : '';
          const csvSkuId = idxSkuId !== -1 ? cols[idxSkuId] : '';

          // Only use SKU ID for product resolution
          let productId = productMap.get(csvSkuId.toLowerCase().trim()) || null;

          // Parse Date (Created Time) - format: 01/25/2026 10:29:04 PM
          let dateStr = new Date().toISOString().split('T')[0];
          if (idxCreatedTime !== -1 && cols[idxCreatedTime]) {
            try {
              const d = new Date(cols[idxCreatedTime]);
              if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
            } catch (e) {
              // ignore date parse error
            }
          }

          const recordData = {
            shop_id: selectedShopId,
            order_id: cols[idxOrderId],
            order_status: idxStatus !== -1 ? cols[idxStatus] : null,
            order_substatus: idxSubStatus !== -1 ? cols[idxSubStatus] : null,
            sku_id: idxSkuId !== -1 ? cols[idxSkuId] : null,
            seller_sku: sellerSku,
            items_sold: idxQuantity !== -1 ? (parseInt(cols[idxQuantity]) || 0) : 0,
            revenue: idxAmount !== -1 ? (parseFloat(cols[idxAmount]) || 0) : 0,

            // Required fields for sales_records
            date: dateStr,
            product_id: productId, // Might be null if not found

            raw_data: rawObj,
            status: 'approved' // Auto-approve imported records
          };

          newRecords.push(recordData);
        }

        if (newRecords.length === 0) {
          throw new Error('No valid records found in CSV');
        }

        // Check for missing products (SKU exists in CSV but not found in DB)
        const missingSkus = new Set<string>();
        newRecords.forEach(r => {
          // Only check SKU ID
          if (!r.product_id && r.sku_id) {
            missingSkus.add(r.sku_id as string);
          }
        });

        if (missingSkus.size > 0) {
          const skuList = Array.from(missingSkus).slice(0, 5).join(', ');
          const moreCount = missingSkus.size > 5 ? ` and ${missingSkus.size - 5} more` : '';
          throw new Error(`The following SKUs were not found in Products: ${skuList}${moreCount}. Import cancelled. Please add them to the Product list first.`);
        }

        const { data: { user } } = await supabase.auth.getUser();

        // Check for existing records preventing shop transfer
        const orderIds = newRecords.map(r => r.order_id);
        const { data: existingRecords } = await supabase
          .from('sales_records')
          .select('order_id, shop_id, shop:shops(name)')
          .in('order_id', orderIds);

        const shopMismatchErrors: string[] = [];
        if (existingRecords && existingRecords.length > 0) {
          existingRecords.forEach(existing => {
            if (existing.shop_id !== selectedShopId) {
              const r = existing as any;
              const shopName = r.shop?.name || 'Unknown Shop';
              shopMismatchErrors.push(`Order ${existing.order_id} exists in "${shopName}"`);
            }
          });
        }

        if (shopMismatchErrors.length > 0) {
          const list = shopMismatchErrors.slice(0, 5).join(', ');
          throw new Error(`Cannot move orders between shops. ${list}${shopMismatchErrors.length > 5 ? '...' : ''}`);
        }

        // Add created_by to records
        const recordsToInsert = newRecords.map(r => ({ ...r, created_by: user?.id || null }));

        // Batch insert/upsert
        const { error } = await supabase.from('sales_records').upsert(recordsToInsert, { onConflict: 'order_id' });

        if (error) throw error;

        toast.success(`Successfully imported ${newRecords.length} records`);

        setIsImportModalOpen(false);
        fetchRecords();

      } catch (err: any) {
        console.error(err);
        toast.error('Import failed: ' + err.message);
      } finally {
        setImporting(false);
        // Reset file input
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(selectedFile);
  };

  const openEditModal = (record: SalesRecordWithRelations) => {
    setSelectedRecord(record);
    setFormData({
      shopId: record.shop_id,
      date: new Date(record.date).toISOString().split('T')[0],
      productId: record.product_id || record.product?.id || '',
      quantity: record.items_sold.toString(),
      price: record.revenue.toString(),
      status: record.order_status || record.status || 'pending'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setLoading(true);

    const quantity = parseInt(formData.quantity) || 0;
    const revenue = parseFloat(formData.price) || 0; // In this context, price is total revenue for the order line

    // Recalculate profit if product is selected
    let profit = 0;
    const product = products.find(p => p.id === formData.productId);
    if (product) {
      // if we have base_price, profit = revenue - (qty * base)
      // BUT complex logic might exist. For now simple:
      const cost = quantity * (product.base_price || 0);
      profit = revenue - cost;
    } else {
      // preserve old profit or 0? 
      // If no product linked, profit is abstract. Let's assume 0 cost if no product?
      // sales_records schema has profit column.
      profit = revenue; // worst case
    }

    const { error } = await supabase.from('sales_records').update({
      shop_id: formData.shopId,
      product_id: formData.productId || null,
      date: formData.date,
      items_sold: quantity,
      revenue: revenue,
      profit: profit,
      status: formData.status
    }).eq('id', selectedRecord.id);

    if (error) {
      toast.error('Error updating record: ' + error.message);
    } else {
      toast.success('Record updated successfully!');
      setIsEditModalOpen(false);
      fetchRecords();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (!record) return;

    if (!confirm(`Are you sure you want to delete this record?\n\nIMPORTANT: This will also delete the corresponding Payout Record for Order ID: ${record.order_id} (if it exists) as well as data sharing the same SKU/Qty.`)) return;

    setLoading(true);

    // Delete Sales Record (Cascade will handle Payout Records)
    const { error } = await supabase.from('sales_records').delete().eq('id', id);
    if (error) {
      toast.error('Error deleting record: ' + error.message);
    } else {
      toast.success('Record and linked payout data deleted');
      fetchRecords();
    }
    setLoading(false);
  };

  const totalQty = records.reduce((sum, r) => sum + (r.items_sold || 0), 0);
  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0);

  if (loading) return <LoadingIndicator label="Loading sales records..." />;

  return (
    <div>
      <div className={cards.cardGridTwoCol}>
        <StatCard
          label="Total Order Quantity"
          value={totalQty.toLocaleString()}
        />
        <StatCard
          label="Total Order Amount"
          value={formatCurrency(totalRevenue)}
          variant="success"
        />
      </div>

      <div className={layouts.spacingY}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={filters.filterButtons} style={{ marginBottom: 0 }}>
            <Button
              variant={dateFilter === 'today' ? 'primary' : 'secondary'}
              onClick={() => setDateFilter('today')}
              className={filters.filterButton}
            >
              Today
            </Button>
            <Button
              variant={dateFilter === 'this_month' ? 'primary' : 'secondary'}
              onClick={() => setDateFilter('this_month')}
              className={filters.filterButton}
            >
              This Month
            </Button>
            <Button
              variant={dateFilter === 'last_month' ? 'primary' : 'secondary'}
              onClick={() => setDateFilter('last_month')}
              className={filters.filterButton}
            >
              Last Month
            </Button>
            <Button
              variant={dateFilter === 'range' ? 'primary' : 'secondary'}
              onClick={() => {
                setDateFilter('range');
                // Allow state update then focus first input
                setTimeout(() => {
                  const inputs = document.querySelectorAll('input[type="date"]');
                  if (inputs.length > 0) (inputs[0] as HTMLInputElement).showPicker?.();
                }, 100);
              }}
              className={filters.filterButton}
            >
              Range
            </Button>
          </div>

          {dateFilter === 'range' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', animation: 'fadeIn 0.2s ease-in-out' }}>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className={forms.formInput}
                style={{ width: 'auto' }}
              />
              <span className={layouts.textMuted}>-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className={forms.formInput}
                style={{ width: 'auto' }}
              />
            </div>
          )}

          {['admin', 'leader'].includes(userRole) && (
            <div style={{ minWidth: '200px' }}>
              <label className={forms.formLabel} style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Filter by Owner</label>
              <select
                className={forms.formSelect}
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <option value="">All Owners</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ minWidth: '200px' }}>
            <label className={forms.formLabel} style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Filter by Shop</label>
            <select
              className={forms.formSelect}
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
            >
              <option value="all">All Shops</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <label className={forms.formLabel} style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Order Status</label>
            <select
              className={forms.formSelect}
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Paid">Paid</option>
              <option value="Process">Process</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Return">Return</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div>
          <Button onClick={() => setIsImportModalOpen(true)}>Import CSV</Button>
        </div>
      </div>

      <div className={layouts.spacingY}></div>

      <SalesTable
        records={records}
        loading={loading}
        onDelete={handleDelete}
      />

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Sales Record">
        <form onSubmit={handleUpdate} className={forms.form}>
          <div className={forms.formField}>
            <label className={forms.formLabel}>Shop</label>
            <select
              className={forms.formSelect}
              value={formData.shopId}
              onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
              required
            >
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={forms.formGridTwoCol}>
            <div className={forms.formField}>
              <label className={forms.formLabel}>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={forms.formInput}
                required
              />
            </div>
            <div className={forms.formField}>
              <label className={forms.formLabel}>Status</label>
              <input
                type="text"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={forms.formInput}
              />
            </div>
          </div>

          <div className={forms.formField}>
            <label className={forms.formLabel}>Product (Link to SKU)</label>
            <select
              className={forms.formSelect}
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            >
              <option value="">-- No Product Linked --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</option>
              ))}
            </select>
            <p className={layouts.textMuted} style={{ fontSize: '0.8rem' }}>
              Linking a product enables profit calculation.
            </p>
          </div>

          <div className={forms.formGridTwoCol}>
            <div className={forms.formField}>
              <label className={forms.formLabel}>Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className={forms.formInput}
                required
              />
            </div>
            <div className={forms.formField}>
              <label className={forms.formLabel}>Total Revenue ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className={forms.formInput}
                required
              />
            </div>
          </div>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Updating...' : 'Update Record'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Orders CSV">
        <form onSubmit={handleImport} className={forms.form}>
          <div className={forms.formField}>
            <label className={forms.formLabel}>Select Shop</label>
            <select
              className={forms.formSelect}
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              required
            >
              <option value="">-- Select Shop --</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={forms.formField}>
            <label className={forms.formLabel}>CSV File</label>
            <div style={{ padding: '1rem', border: '2px dashed var(--border)', borderRadius: '8px', textAlign: 'center' }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="csv-upload"
                ref={fileInputRef}
              />
              <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'block' }}>
                {selectedFile ? (
                  <span style={{ color: 'var(--primary)' }}>{selectedFile.name}</span>
                ) : (
                  <span className={layouts.textMuted}>Click to upload CSV</span>
                )}
              </label>
            </div>
            <p className={layouts.textMuted} style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Supported format: Order ID, Order Status, SKU ID, etc.
            </p>
          </div>

          <Button type="submit" fullWidth disabled={importing || !selectedFile || !selectedShopId}>
            {importing ? 'Importing...' : 'Start Import'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
