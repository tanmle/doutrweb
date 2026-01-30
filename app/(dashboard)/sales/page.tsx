'use client';
import * as XLSX from 'xlsx';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/ToastProvider';
import { useSupabase } from '@/contexts/SupabaseContext';
import { formatCurrency } from '@/utils/formatters';
import { getDateRange } from '@/utils/dateHelpers';
import { ITEMS_PER_PAGE, CSV_COLUMNS, ERROR_MESSAGES } from '@/constants/sales';
import { SalesTable } from './components';
import { forms, layouts, filters, cards } from '@/styles/modules';
import type { Shop, SalesRecordWithRelations, DateFilterType, DateRange, Profile } from './types';


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
  const [filteredTotals, setFilteredTotals] = useState({ quantity: 0, revenue: 0 }); // New state for totals
  const [shops, setShops] = useState<Shop[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

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

  // Fetch Initial Data - Parallelized
  useEffect(() => {
    const fetchContext = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get User Role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const role = profile?.role || 'member';
      setUserRole(role);

      // Parallel fetch: shops, profiles (if needed), and products
      const promises = [
        supabase.from('shops').select('id, name, owner_id').order('name'),
        supabase.from('products').select('*').order('name')
      ];

      // Only fetch profiles for admin/leader
      if (['admin', 'leader'].includes(role)) {
        promises.push(
          supabase.from('profiles').select('id, full_name, email, role').order('full_name')
        );
      }

      const results = await Promise.all(promises);
      const shopsRes = results[0];
      const productsRes = results[1];
      const profilesRes = results[2] as unknown as { data: Profile[] } | undefined;

      if (shopsRes.data) {
        setShops(shopsRes.data);
        if (shopsRes.data.length > 0) setSelectedShopId(shopsRes.data[0].id);
      }

      if (productsRes.data) {
        setProducts(productsRes.data);
      }

      if (profilesRes?.data) {
        setProfiles(profilesRes.data as Profile[]);
      }

      setLoading(false);
    };
    fetchContext();
  }, [supabase]);

  // Update date range when filter type changes
  useEffect(() => {
    if (dateFilter !== 'range') {
      const newRange = getDateRange(dateFilter);
      setDateRange(newRange);
      // Reset page when date filter type creates a new range
      if (newRange.start !== dateRange.start || newRange.end !== dateRange.end) {
        setCurrentPage(1);
      }
    }
  }, [dateFilter]);

  // Fetch records when filters change - Memoized with useCallback
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Data Query (for table & pagination)
    let query = supabase
      .from('sales_records')
      .select(`
        *,
        shop:shops!inner(id, name, owner_id, profiles:owner_id(full_name, email)),
        product:products(id, name, sku)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // 2. Totals Query (for stats cards - specific columns only)
    let totalsQuery = supabase
      .from('sales_records')
      .select(`
        items_sold,
        revenue,
        shop:shops!inner(owner_id)
      `);

    // Helper to apply filters to any query object
    const applyFilters = (q: any) => {
      // Filter by 'date' column instead of 'created_at'
      if (dateRange.start) q = q.gte('date', dateRange.start);
      if (dateRange.end) q = q.lte('date', dateRange.end);

      if (['admin', 'leader'].includes(userRole)) {
        if (ownerFilter) {
          q = q.eq('shop.owner_id', ownerFilter);
        }
      } else {
        q = q.eq('shop.owner_id', user.id);
      }

      if (shopFilter !== 'all') {
        q = q.eq('shop_id', shopFilter);
      }
      if (orderStatusFilter !== 'all') {
        q = q.eq('order_status', orderStatusFilter);
      }
      return q;
    };

    // Apply filters to both queries
    query = applyFilters(query);
    totalsQuery = applyFilters(totalsQuery);

    // Filter Logic Done, now Paginating MAIN query
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Execute Parallel: Get Page Data AND Get Totals Data
    const [pageRes, totalsRes] = await Promise.all([
      query.range(from, to),
      totalsQuery
    ]);

    const { data: pageData, count } = pageRes;
    const { data: totalsData } = totalsRes;

    // Update Table & Pagination
    if (pageData) {
      setRecords(pageData as any);
      if (count !== null) {
        setTotalRecords(count);
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }
    }

    // Update Totals Stats
    if (totalsData) {
      const qty = totalsData.reduce((sum: number, r: any) => sum + (r.items_sold || 0), 0);
      const rev = totalsData.reduce((sum: number, r: any) => sum + (r.revenue || 0), 0);
      setFilteredTotals({ quantity: qty, revenue: rev });
    }
    setLoading(false);
  }, [supabase, dateRange, ownerFilter, shopFilter, orderStatusFilter, userRole, currentPage]);

  useEffect(() => {
    if (userRole) fetchRecords();
  }, [userRole, fetchRecords]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedShopId) {
      toast.error('Please select a shop and a file');
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        let headers: string[] = [];
        let dataRows: any[][] = [];

        const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

        if (isExcel) {
          const bstr = event.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          // Get data as array of arrays
          const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

          if (!rawData || rawData.length < 3) {
            throw new Error('File is empty or invalid (insufficient rows for header, note, and data)');
          }

          // Row 0 is header, Row 1 is note (skipped)
          headers = rawData[0].map((h: any) => String(h).toLowerCase().trim());
          dataRows = rawData.slice(2);

        } else {
          // CSV handling
          const text = event.target?.result as string;
          const lines = text.split('\n');
          if (lines.length < 2) {
            throw new Error('CSV file is empty or invalid');
          }
          const headerLine = lines[0];
          headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

          // Parse lines to arrays
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
              dataRows.push(parseCSVLine(line));
            }
          }
        }

        const idxOrderId = headers.indexOf('order id');
        // Flexible matching for status/substatus/sku
        const idxStatus = headers.findIndex(h => h === 'order status');
        const idxSubStatus = headers.findIndex(h => h === 'order substatus');
        const idxSkuId = headers.findIndex(h => h === 'sku id');
        const idxQuantity = headers.findIndex(h => h === 'quantity');
        const idxAmount = headers.findIndex(h => h === 'order amount');
        const idxSellerSku = headers.findIndex(h => h === 'seller sku');
        const idxCreatedTime = headers.findIndex(h => h === 'created time');
        const idxTrackingId = headers.findIndex(h => h === 'tracking id');

        if (idxOrderId === -1) throw new Error('Column "Order ID" not found in file');

        // Fetch products for SKU mapping
        const { data: productsData } = await supabase.from('products').select('id, sku');
        const productMap = new Map<string, string>(); // sku -> id
        if (productsData) {
          productsData.forEach(p => {
            if (p.sku) productMap.set(p.sku.toLowerCase().trim(), p.id);
          });
        }

        const newRecords = [];

        for (const cols of dataRows) {
          // Skip empty rows if they slipped through
          if (!cols || cols.length === 0) continue;

          // Basic length check (loose)
          if (cols.length < headers.length * 0.2) continue;

          // Resolve values safely
          const getVal = (idx: number) => (idx !== -1 && cols[idx] !== undefined) ? cols[idx] : '';
          const orderId = getVal(idxOrderId);
          if (!orderId) continue; // Skip if no order ID

          // Create raw_data object mapping headers to values
          const rawObj: any = {};
          headers.forEach((h, i) => {
            rawObj[h] = getVal(i);
          });

          const sellerSku = getVal(idxSellerSku);
          const csvSkuId = getVal(idxSkuId);
          let productId = productMap.get(String(sellerSku).toLowerCase().trim()) || null;

          // Parse Date
          let dateStr = new Date().toISOString().split('T')[0];
          const createdVal = getVal(idxCreatedTime);
          if (createdVal) {
            try {
              // Excel might return number (serial date) if not text
              if (typeof createdVal === 'number') {
                const d = new Date(Math.round((createdVal - 25569) * 86400 * 1000));
                dateStr = d.toISOString().split('T')[0];
              } else {
                const d = new Date(createdVal);
                if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
              }
            } catch (e) { }
          }

          const recordData = {
            shop_id: selectedShopId,
            order_id: String(orderId), // Ensure string
            order_status: getVal(idxStatus) || null,
            order_substatus: getVal(idxSubStatus) || null,
            sku_id: csvSkuId ? String(csvSkuId) : null,
            seller_sku: sellerSku ? String(sellerSku) : '',
            tracking_id: getVal(idxTrackingId) || null,
            items_sold: idxQuantity !== -1 ? (parseInt(getVal(idxQuantity)) || 0) : 0,
            revenue: idxAmount !== -1 ? (parseFloat(getVal(idxAmount)) || 0) : 0,
            date: dateStr,
            product_id: productId,
            raw_data: rawObj,
            status: ''
          };

          newRecords.push(recordData);
        }

        if (newRecords.length === 0) {
          throw new Error('No valid records found');
        }

        // --- Duplication & Mismatch Checks ---
        const missingSkus = new Set<string>();
        newRecords.forEach(r => {
          if (!r.product_id && r.seller_sku) {
            missingSkus.add(r.seller_sku as string);
          }
        });

        if (missingSkus.size > 0) {
          const skuList = Array.from(missingSkus).slice(0, 5).join(', ');
          const moreCount = missingSkus.size > 5 ? ` and ${missingSkus.size - 5} more` : '';
          throw new Error(`The following SKUs were not found in Products: ${skuList}${moreCount}. Import cancelled. Please add them to the Product list first.`);
        }

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
              // Check if we are actually "moving" logic implies strict order uniqueness.
              // If we allow multi-lines, checking "shop mismatch" via order_id is still valid
              // (an order can't belong to two shops).
              shopMismatchErrors.push(`Order ${existing.order_id} exists in "${shopName}"`);
            }
          });
        }

        if (shopMismatchErrors.length > 0) {
          const list = shopMismatchErrors.slice(0, 5).join(', ');
          throw new Error(`Cannot move orders between shops. ${list}${shopMismatchErrors.length > 5 ? '...' : ''}`);
        }

        // --- Insert ---
        const { data: { user } } = await supabase.auth.getUser();
        const recordsToInsert = newRecords.map(r => ({ ...r, created_by: user?.id || null }));

        // Upsert on (order_id, seller_sku) to allow multiple items per order
        const { error } = await supabase.from('sales_records').upsert(recordsToInsert, { onConflict: 'order_id, seller_sku' });
        if (error) throw error;

        toast.success(`Successfully imported ${newRecords.length} records`);
        setIsImportModalOpen(false);
        fetchRecords();

      } catch (err: any) {
        console.error(err);
        toast.error('Import failed: ' + err.message);
      } finally {
        setImporting(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    if (selectedFile.name.endsWith('.csv')) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsBinaryString(selectedFile);
    }
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

  const totalQty = filteredTotals.quantity;
  const totalRevenue = filteredTotals.revenue;

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
              onClick={() => { setDateFilter('today'); setCurrentPage(1); }}
              className={filters.filterButton}
            >
              Today
            </Button>
            <Button
              variant={dateFilter === 'this_month' ? 'primary' : 'secondary'}
              onClick={() => { setDateFilter('this_month'); setCurrentPage(1); }}
              className={filters.filterButton}
            >
              This Month
            </Button>
            <Button
              variant={dateFilter === 'last_month' ? 'primary' : 'secondary'}
              onClick={() => { setDateFilter('last_month'); setCurrentPage(1); }}
              className={filters.filterButton}
            >
              Last Month
            </Button>
            <Button
              variant={dateFilter === 'range' ? 'primary' : 'secondary'}
              onClick={() => {
                setDateFilter('range');
                setCurrentPage(1);
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
                onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setCurrentPage(1); }}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className={forms.formInput}
                style={{ width: 'auto' }}
              />
              <span className={layouts.textMuted}>-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setCurrentPage(1); }}
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
                onChange={(e) => { setOwnerFilter(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setShopFilter(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setOrderStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="To ship">To ship</option>
              <option value="Shipped">Shipped</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
        </div>

        <div>
          <Button onClick={() => setIsImportModalOpen(true)}>Import Sales</Button>
        </div>
      </div>

      <div className={layouts.spacingY}></div>

      <SalesTable
        records={records}
        loading={loading}
        onDelete={handleDelete}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
          <span className={layouts.textMuted} style={{ fontSize: '0.875rem' }}>
            Page {currentPage} of {totalPages} ({totalRecords.toLocaleString()} items)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Orders (CSV/XLSX)">
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
            <label className={forms.formLabel}>File (CSV/XLSX)</label>
            <div style={{ padding: '1rem', border: '2px dashed var(--border)', borderRadius: '8px', textAlign: 'center' }}>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="csv-upload"
                ref={fileInputRef}
              />
              <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'block' }}>
                {selectedFile ? (
                  <span style={{ color: 'var(--primary)' }}>{selectedFile.name}</span>
                ) : (
                  <span className={layouts.textMuted}>Click to upload CSV or XLSX</span>
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
