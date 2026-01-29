'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { useSupabase } from '@/contexts/SupabaseContext';
import { formatCurrency } from '@/utils/formatters';
import { layouts, cards, tables, filters, forms } from '@/styles/modules';
import { useToast } from '@/components/ui/ToastProvider';

import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Modal } from '@/components/ui/Modal';
import { PayoutsTable } from './components';
import { KPICard } from './components/KPICard';
import { APP_CONSTANTS } from '@/constants/app';

type FilterType = 'this_month' | 'last_month' | 'range';

interface Profile {
    id: string;
    full_name: string | null;
    email: string;
}

interface PayoutRecord {
    id: string;
    statement_date: string;
    created_at: string;
    status: string;
    order_id: string;
    sku_id: string;
    quantity: number;
    settlement_amount: number;
    shop_id: string;
    sales_record_id?: string; // Added field
    raw_data: any;
    order_created_date: string | null;
    shop?: {
        id: string;
        name: string;
        owner?: {
            full_name: string | null;
            email: string;
        }
    }
}

export default function PayoutReportsPage() {
    const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
    const [filter, setFilter] = useState<FilterType>('this_month');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [kpiStats, setKpiStats] = useState({
        targetKPI: 1500,
        currentKPI: 0,
        currentLevel: 0
    });
    const [userFilter, setUserFilter] = useState<string>('all');
    const [shopFilter, setShopFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [userRole, setUserRole] = useState<string>('member');

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedShopId, setSelectedShopId] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [shops, setShops] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabase = useSupabase();
    const toast = useToast();

    // Fetch Profiles and Shops
    useEffect(() => {
        const fetchContext = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const role = profile?.role || 'member';
            setUserRole(role);

            // Fetch Profiles for filter
            if (role === 'admin') {
                const { data } = await supabase.from('profiles').select('id, full_name, email').neq('role', 'admin').order('full_name');
                if (data) setProfiles(data);
            } else if (role === 'leader') {
                const { data } = await supabase.from('profiles').select('id, full_name, email').or(`id.eq.${user.id},leader_id.eq.${user.id}`).order('full_name');
                if (data) setProfiles(data);
            }

            // Fetch Shops for import selection and filter
            let shopQuery = supabase.from('shops').select('id, name');
            if (role !== 'admin') {
                shopQuery = shopQuery.eq('owner_id', user.id);
            }
            const { data: shopsData } = await shopQuery.order('name');
            if (shopsData) {
                setShops(shopsData);
                if (shopsData.length > 0) setSelectedShopId(shopsData[0].id);
            }
        };
        fetchContext();
    }, []);

    const fetchKPI = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const role = profile?.role || 'member';

        const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'base_kpi').maybeSingle();
        const baseKpi = settings ? parseFloat(settings.value) : APP_CONSTANTS.DEFAULT_BASE_KPI;

        const { data: rates } = await supabase.from('commission_rates').select('level, profit_threshold').eq('type', 'company').order('level', { ascending: true });

        const now = new Date();
        let kpiQuery = supabase.from('payout_records').select('settlement_amount, shop:shops!inner(owner_id)');

        if (filter === 'this_month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            kpiQuery = kpiQuery.gte('created_at', startOfMonth.toISOString());
        } else if (filter === 'last_month') {
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            kpiQuery = kpiQuery
                .gte('created_at', startOfLastMonth.toISOString())
                .lte('created_at', endOfLastMonth.toISOString());
        } else if (filter === 'range' && dateRange.start && dateRange.end) {
            kpiQuery = kpiQuery
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end + 'T23:59:59');
        }

        if (role !== 'admin') {
            if (role === 'leader') {
                const { data: members } = await supabase.from('profiles').select('id').eq('leader_id', user.id);
                const memberIds = members?.map(m => m.id) || [];
                kpiQuery = kpiQuery.in('shop.owner_id', [user.id, ...memberIds]);
            } else {
                kpiQuery = kpiQuery.eq('shop.owner_id', user.id);
            }
        }

        const { data: kpiData, error } = await kpiQuery;

        if (error) {
            console.error('KPI Fetch Error:', error);
            return;
        }

        const totalSettlement = (kpiData || []).reduce((acc: any, curr: any) => acc + (curr.settlement_amount || 0), 0);

        let currentLevel = 0;
        let nextThreshold = rates?.[0]?.profit_threshold || 1000;
        if (rates && rates.length > 0) {
            for (const r of rates) {
                if (totalSettlement >= r.profit_threshold) currentLevel = r.level;
                else { nextThreshold = r.profit_threshold; break; }
            }
            if (totalSettlement >= rates[rates.length - 1].profit_threshold) nextThreshold = rates[rates.length - 1].profit_threshold;
        }

        setKpiStats({
            currentKPI: totalSettlement,
            targetKPI: baseKpi + nextThreshold,
            currentLevel
        });
    };

    const fetchPayouts = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
            .from('payout_records')
            .select(`
                *,
                shop:shops!inner(
                    id, 
                    name, 
                    owner_id, 
                    owner:profiles!owner_id(full_name, email)
                )
            `)
            .order('statement_date', { ascending: false });

        if (shopFilter !== 'all') {
            query = query.eq('shop_id', shopFilter);
        }

        if (statusFilter !== 'all') {
            query = query.ilike('status', statusFilter);
        }

        if (userFilter !== 'all') {
            query = query.eq('shop.owner_id', userFilter);
        }

        if (userRole !== 'admin') {
            // Access control handled by RLS, or add specific member logic
        }

        /* Date Filtering Logic */
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (filter === 'this_month') {
            // From start of current month to now
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            query = query.gte('created_at', startOfMonth.toISOString());
        } else if (filter === 'last_month') {
            // From start of last month to end of last month
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            query = query
                .gte('created_at', startOfLastMonth.toISOString())
                .lte('created_at', endOfLastMonth.toISOString());
        } else if (filter === 'range' && dateRange.start && dateRange.end) {
            query = query
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end + 'T23:59:59');
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching payouts', error);
        } else {
            setPayouts(data as PayoutRecord[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPayouts();
        fetchKPI();
    }, [filter, dateRange, userFilter, shopFilter, statusFilter, userRole]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !selectedShopId) {
            toast.error('Please select a shop and a file');
            return;
        }

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // 1. Prepare Payout Records from XLSX
                const payoutRecords = data.map((row: any) => {
                    // Helper to parse date
                    const parseDate = (val: any) => {
                        if (!val) return null;
                        try {
                            if (typeof val === 'number') {
                                // Excel serial date
                                const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                                return date.toISOString(); // Return full ISO for timestamp
                            } else {
                                const date = new Date(val);
                                if (!isNaN(date.getTime())) {
                                    return date.toISOString();
                                }
                            }
                        } catch (e) { }
                        return null; // Return null if parse fails
                    };

                    const createdVal = parseDate(row['Created time'] || row['Created date']);
                    // default created_at to now if missing, because DB requires NOT NULL
                    const createdAt = createdVal || new Date().toISOString();

                    const orderCreatedVal = parseDate(row['Order created date'] || row['Order created time']);
                    // order_created_date is nullable DATE in DB.
                    const orderCreatedDate = orderCreatedVal ? orderCreatedVal.split('T')[0] : null;

                    const statementDateVal = parseDate(row['Statement date']);
                    const statementDate = statementDateVal ? statementDateVal.split('T')[0] : null;

                    return {
                        statement_date: statementDate,
                        created_at: createdAt,
                        order_created_date: orderCreatedDate,
                        status: row['Status'] || 'paid',
                        order_id: row['Order/adjustment ID'] || row['Order ID'] || '',
                        sku_id: row['SKU ID'] || row['SKU'] || '',
                        quantity: parseInt(row['Quantity'] || '0'),
                        settlement_amount: parseFloat(row['Total settlement amount'] || '0'),
                        shop_id: selectedShopId,
                        sales_record_id: undefined, // Initialize field
                        raw_data: row // Store full row
                    };
                }).filter(p => p.order_id);

                if (payoutRecords.length === 0) throw new Error('No valid records found in the file.');

                // 2. Check for Payout Shop Mismatch (Prevent existing payout in other shop)
                const orderIds = payoutRecords.map(p => p.order_id);

                // Check existing payout records
                const { data: existingPayouts } = await supabase
                    .from('payout_records')
                    .select('order_id, shop_id, shop:shops(name)')
                    .in('order_id', orderIds);

                if (existingPayouts && existingPayouts.length > 0) {
                    for (const existing of existingPayouts) {
                        if (existing.shop_id !== selectedShopId) {
                            const r = existing as any;
                            const shopName = r.shop?.name || 'Unknown Shop';
                            throw new Error(`Order ${existing.order_id} already exists in Payouts for shop "${shopName}". Cannot move to current shop.`);
                        }
                    }
                }

                // 3. Fetch Matching Sales Records
                const { data: salesRecords, error: fetchError } = await supabase
                    .from('sales_records')
                    .select('id, order_id, sku_id, date, status, order_status, shop_id')
                    .in('order_id', orderIds);

                if (fetchError) throw fetchError;

                // Create a map for composite key lookup: order_id + sku_id
                const salesMap = new Map<string, any>();
                salesRecords?.forEach(r => {
                    const key = `${r.order_id}_${(r.sku_id || '').trim().toLowerCase()}`;
                    salesMap.set(key, r);
                    // Also keep a fallback map for order_id only? 
                    // No, strict matching is safer to avoid cross-linking wrong items.
                    // But if SKU ID is missing or inconsistent, we might have issues.
                    // Let's assume strict matching first.
                });

                // 4. Validation Logic
                const errors: string[] = [];
                const validPayouts: any[] = [];
                const updatesToSales: any[] = [];

                for (const payout of payoutRecords) {
                    const payoutSku = (payout.sku_id || '').trim().toLowerCase();
                    const key = `${payout.order_id}_${payoutSku}`;

                    let salesRecord = salesMap.get(key);

                    // Fallback: If only one sales record exists for this orderId, and we failed match by SKU (maybe missing SKU in one side), use it?
                    // This is risky if there are multiple items.
                    // Let's stick to strict or intelligent fallback if needed. The user asked for "same approach", which implies supporting the granularity.

                    if (!salesRecord) {
                        // Try searching by just order_id if we can't find exact match, 
                        // but only if that order has only 1 sales record?
                        // Too complex for now. Report missing.
                        errors.push(`Order ID ${payout.order_id} (SKU: ${payout.sku_id}) not found in Sales (or SKU mismatch).`);
                        continue;
                    }

                    // Check Shop
                    if (salesRecord.shop_id !== selectedShopId) {
                        errors.push(`Shop mismatch for Order ${payout.order_id}: Selected shop does not match Sales Record shop.`);
                        continue;
                    }

                    // Link to Sales Record
                    payout.sales_record_id = salesRecord.id;

                    validPayouts.push(payout);

                    // Prepare Status Update (payout status -> sales_records.status)
                    if (salesRecord.status !== payout.status) {
                        updatesToSales.push({ id: salesRecord.id, status: payout.status });
                    }
                }

                if (errors.length > 0) {
                    const msg = `Validation failed for ${errors.length} records. First few errors:\n${errors.slice(0, 5).join('\n')}`;
                    throw new Error(msg);
                }

                // 5. Batch Insert Payouts
                // Upsert on (order_id, sku_id)
                const { error: insertError } = await supabase.from('payout_records').upsert(validPayouts, { onConflict: 'order_id, sku_id' });
                if (insertError) throw insertError;

                // 6. Update Sales Records Status
                // Deduplicate updates to avoid multiple updates to same ID?
                const uniqueUpdates = Array.from(new Map(updatesToSales.map(item => [item.id, item])).values());

                await Promise.all(uniqueUpdates.map((u: any) =>
                    supabase.from('sales_records').update({ status: u.status }).eq('id', u.id)
                ));


                toast.success(`Allocated ${validPayouts.length} payout records and updated statuses.`);
                setIsImportModalOpen(false);
                fetchPayouts();
                fetchKPI();

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
        reader.readAsBinaryString(selectedFile);
    };

    const totalSettlement = payouts.reduce((acc, curr) => acc + (curr.settlement_amount || 0), 0);

    if (loading) return <LoadingIndicator label="Loading payouts..." />;

    return (
        <div>
            <div className={cards.cardGridTwoCol}>
                <StatCard
                    label="Total Settlement"
                    value={formatCurrency(payouts.reduce((acc, curr) => acc + (curr.settlement_amount || 0), 0))}
                    subtext={`${payouts.length} records`}
                    variant="success"
                />

                <KPICard
                    currentKPI={kpiStats.currentKPI}
                    targetKPI={kpiStats.targetKPI}
                    monthlyProfit={kpiStats.currentKPI}
                    currentLevel={kpiStats.currentLevel}
                />
            </div>

            <div className={layouts.spacingY}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className={filters.filterButtons} style={{ marginBottom: 0 }}>
                        <Button
                            variant={filter === 'this_month' ? 'primary' : 'secondary'}
                            onClick={() => setFilter('this_month')}
                            className={filters.filterButton}
                        >
                            This Month
                        </Button>
                        <Button
                            variant={filter === 'last_month' ? 'primary' : 'secondary'}
                            onClick={() => setFilter('last_month')}
                            className={filters.filterButton}
                        >
                            Last Month
                        </Button>
                        <Button
                            variant={filter === 'range' ? 'primary' : 'secondary'}
                            onClick={() => {
                                setFilter('range');
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

                    {filter === 'range' && (
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
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                className={forms.formSelect}
                            >
                                <option value="all">All Owners</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ minWidth: '200px' }}>
                        <label className={forms.formLabel} style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Filter by Shop</label>
                        <select
                            value={shopFilter}
                            onChange={(e) => setShopFilter(e.target.value)}
                            className={forms.formSelect}
                        >
                            <option value="all">All Shops</option>
                            {shops.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ minWidth: '150px' }}>
                        <label className={forms.formLabel} style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Filter by Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={forms.formSelect}
                        >
                            <option value="all">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            {/* Add more statuses as found in data if needed */}
                        </select>
                    </div>
                </div>

                <div>
                    <Button onClick={() => setIsImportModalOpen(true)}>Import XLSX</Button>
                </div>
            </div>

            <div className={layouts.spacingY}></div>

            <PayoutsTable records={payouts} loading={loading} />

            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Payouts XLSX">
                <form onSubmit={handleImportSubmit} className={forms.form}>
                    <div className={forms.formField}>
                        <label className={forms.formLabel}>Select Shop</label>
                        <select
                            value={selectedShopId}
                            onChange={(e) => setSelectedShopId(e.target.value)}
                            className={forms.formSelect}
                            required
                        >
                            <option value="">-- Select Shop --</option>
                            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className={forms.formField}>
                        <label className={forms.formLabel}>XLSX File</label>
                        <div style={{ padding: '1rem', border: '2px dashed var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                id="xlsx-upload"
                                style={{ display: 'none' }}
                                ref={fileInputRef}
                            />
                            <label htmlFor="xlsx-upload" style={{ cursor: 'pointer', display: 'block' }}>
                                {selectedFile ? (
                                    <span style={{ color: 'var(--primary)' }}>{selectedFile.name}</span>
                                ) : (
                                    <span className={layouts.textMuted}>Click to upload XLSX</span>
                                )}
                            </label>
                        </div>
                    </div>

                    <Button type="submit" fullWidth disabled={importing || !selectedFile || !selectedShopId}>
                        {importing ? 'Importing...' : 'Start Import'}
                    </Button>
                </form>
            </Modal >
        </div >
    );
}
