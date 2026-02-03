'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { useSupabase } from '@/contexts/SupabaseContext';
import { formatCurrency, formatDateKey } from '@/utils/formatters';
import { layouts, cards, tables, filters, forms } from '@/styles/modules';
import { useToast } from '@/components/ui/ToastProvider';

import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Modal } from '@/components/ui/Modal';
import { PayoutsTable } from './components';
import { KPICard } from './components/KPICard';
import { APP_CONSTANTS } from '@/constants/app';
import { ITEMS_PER_PAGE } from '@/constants/sales'; // Reuse items per page constant

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
            id: string;
            full_name: string | null;
            email: string;
        }
    }
}

export default function PayoutReportsPage() {
    const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
    const [filteredTotalSettlement, setFilteredTotalSettlement] = useState(0); // New state for total
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
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [userRole, setUserRole] = useState<string>('member');

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedShopId, setSelectedShopId] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [shops, setShops] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<{ imported: number, total: number, errors: string[] } | null>(null);
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
                const { data } = await supabase.from('profiles').select('id, full_name, email').neq('role', 'admin').eq('status', 'active').order('full_name');
                if (data) setProfiles(data);
            } else if (role === 'leader') {
                const { data } = await supabase.from('profiles').select('id, full_name, email').or(`id.eq.${user.id},leader_id.eq.${user.id}`).eq('status', 'active').order('full_name');
                if (data) setProfiles(data);
            }

            // Fetch Shops for import selection and filter
            let shopQuery = supabase.from('shops').select('id, name, owner_id');
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
            kpiQuery = kpiQuery.gte('statement_date', formatDateKey(startOfMonth));
        } else if (filter === 'last_month') {
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            kpiQuery = kpiQuery
                .gte('statement_date', formatDateKey(startOfLastMonth))
                .lte('statement_date', formatDateKey(endOfLastMonth));
        } else if (filter === 'range' && dateRange.start && dateRange.end) {
            kpiQuery = kpiQuery
                .gte('statement_date', dateRange.start)
                .lte('statement_date', dateRange.end);
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
                    owner:profiles!owner_id(id, full_name, email)
                )
            `, { count: 'exact' })
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
            query = query.gte('statement_date', formatDateKey(startOfMonth));
        } else if (filter === 'last_month') {
            // From start of last month to end of last month
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            query = query
                .gte('statement_date', formatDateKey(startOfLastMonth))
                .lte('statement_date', formatDateKey(endOfLastMonth));
        } else if (filter === 'range' && dateRange.start && dateRange.end) {
            query = query
                .gte('statement_date', dateRange.start)
                .lte('statement_date', dateRange.end);
        }

        // Create explicit totals query
        let totalsQuery = supabase
            .from('payout_records')
            .select('settlement_amount, shop:shops!inner(owner_id)');

        // Apply same filters to totalsQuery
        if (shopFilter !== 'all') totalsQuery = totalsQuery.eq('shop_id', shopFilter);
        if (statusFilter !== 'all') totalsQuery = totalsQuery.ilike('status', statusFilter);
        if (userFilter !== 'all') totalsQuery = totalsQuery.eq('shop.owner_id', userFilter);

        if (filter === 'this_month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            totalsQuery = totalsQuery.gte('statement_date', formatDateKey(startOfMonth));
        } else if (filter === 'last_month') {
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            totalsQuery = totalsQuery
                .gte('statement_date', formatDateKey(startOfLastMonth))
                .lte('statement_date', formatDateKey(endOfLastMonth));
        } else if (filter === 'range' && dateRange.start && dateRange.end) {
            totalsQuery = totalsQuery
                .gte('statement_date', dateRange.start)
                .lte('statement_date', dateRange.end);
        }

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        // Execute in parallel
        const [pageRes, totalsRes] = await Promise.all([
            query.range(from, to).limit(ITEMS_PER_PAGE),
            totalsQuery
        ]);

        const { data, error, count } = pageRes;
        const { data: totalsData } = totalsRes;

        if (error) {
            console.error('Error fetching payouts', error);
        } else {
            setPayouts(data as PayoutRecord[]);
            if (count !== null) {
                setTotalRecords(count);
                setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
            }

            // Calculate total from all filtered records
            if (totalsData) {
                const total = totalsData.reduce((acc: number, curr: any) => acc + (curr.settlement_amount || 0), 0);
                setFilteredTotalSettlement(total);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPayouts();
        fetchKPI();
    }, [filter, dateRange, userFilter, shopFilter, statusFilter, userRole, currentPage]);

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
                const ab = evt.target?.result;
                const wb = XLSX.read(ab, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // FIX: Recalculate range to ensure we read ALL rows, ignoring broken metadata
                if (ws['!ref']) {
                    const range = XLSX.utils.decode_range(ws['!ref']);
                    // Iterate all keys to find the true max row
                    let maxRow = range.e.r;
                    let maxCol = range.e.c;
                    Object.keys(ws).forEach(key => {
                        if (key[0] === '!') return;
                        const cell = XLSX.utils.decode_cell(key);
                        if (cell.r > maxRow) maxRow = cell.r;
                        if (cell.c > maxCol) maxCol = cell.c;
                    });
                    ws['!ref'] = XLSX.utils.encode_range({ s: range.s, e: { r: maxRow, c: maxCol } });
                }

                // 1. Read entire sheet as Array of Arrays (AOA) to inspect all data
                const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as any[][];

                // 2. Find Header Row
                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(aoa.length, 50); i++) {
                    const rowStr = (aoa[i] || []).join(' ').toLowerCase();
                    if (rowStr.includes('order id') || rowStr.includes('order/adjustment id')) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    throw new Error("Could not find 'Order ID' header row in the first 50 rows.");
                }

                // 3. Extract Headers and Map Data
                const headers = (aoa[headerRowIndex] || []).map(h => String(h).trim().toLowerCase());
                const rawDataRows = aoa.slice(headerRowIndex + 1);

                let lastOrderId = '';
                let lastStatementDate: string | null = null;
                const validPayouts: any[] = [];
                const updatesToSales: any[] = [];
                const errors: string[] = [];
                let skippedCount = 0;
                let skippedReason = '';

                // Helper to get value from row by header name
                const getValue = (row: any[], headerName: string): any => {
                    const idx = headers.indexOf(headerName.toLowerCase());
                    if (idx === -1) return undefined;
                    return row[idx];
                }

                // First pass: Process all rows for fill-down and parsing
                const processedRows = rawDataRows.map((row, index) => {
                    // Optimized Date Parser
                    const parseDateClean = (val: any) => {
                        if (val === undefined || val === null) return null;
                        if (typeof val === 'number') {
                            const info = (XLSX as any).SSF.parse_date_code(val);
                            if (info) return `${info.y}-${String(info.m).padStart(2, '0')}-${String(info.d).padStart(2, '0')}`;
                        }
                        if (typeof val === 'string') {
                            const v = val.trim();
                            if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(v)) return v.replace(/\//g, '-');
                        }
                        try {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                        } catch (e) { }
                        return null;
                    };

                    const parseTimestamp = (val: any) => {
                        try {
                            if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString();
                            const d = new Date(val);
                            return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
                        } catch { return new Date().toISOString(); }
                    };

                    // Get Raw Values
                    let orderIdRaw = getValue(row, 'order/adjustment id') || getValue(row, 'order id');
                    let statementDateRaw = getValue(row, 'statement date');
                    let settlementAmountRaw = getValue(row, 'total settlement amount');
                    let quantityRaw = getValue(row, 'quantity');
                    let skuRaw = getValue(row, 'sku id') || getValue(row, 'sku');
                    let statusRaw = getValue(row, 'status');
                    let createdRaw = getValue(row, 'created time') || getValue(row, 'created date');
                    let orderCreatedRaw = getValue(row, 'order created date') || getValue(row, 'order created time');

                    // Fill Down Logic
                    let orderId = orderIdRaw ? String(orderIdRaw).trim() : '';

                    // If no order ID, but we have settlement amount or it looks like a continuation
                    if (!orderId && lastOrderId && (settlementAmountRaw !== undefined || skuRaw !== undefined)) {
                        orderId = lastOrderId;
                    }

                    if (orderId) lastOrderId = orderId;

                    let statementDate = parseDateClean(statementDateRaw);
                    if (!statementDate && lastStatementDate && orderId === lastOrderId) {
                        statementDate = lastStatementDate;
                    }
                    if (statementDate) lastStatementDate = statementDate;

                    if (!orderId) {
                        skippedCount++;
                        if (!skippedReason) skippedReason = 'Missing Order ID';
                        return null;
                    }

                    return {
                        statement_date: statementDate,
                        created_at: parseTimestamp(createdRaw),
                        order_created_date: parseDateClean(orderCreatedRaw),
                        status: statusRaw || 'paid',
                        order_id: orderId,
                        sku_id: String(skuRaw || '').trim(),
                        quantity: parseInt(quantityRaw || '0'),
                        settlement_amount: parseFloat(settlementAmountRaw || '0'),
                        shop_id: selectedShopId,
                        sales_record_id: undefined,
                        // row_index: index + headerRowIndex + 1 
                    };
                }).filter(r => r !== null); // Filter out nulls (gaps)

                if (processedRows.length === 0) throw new Error('No valid records found (checked ' + rawDataRows.length + ' rows).');

                // 2. Validation & Matching (Same as before)
                // Collect Order IDs
                const orderIds = processedRows.map(p => p.order_id);

                // Fetch Existing Payouts for Shop Check
                const { data: existingPayouts } = await supabase
                    .from('payout_records')
                    .select('order_id, shop_id, shop:shops(name)')
                    .in('order_id', orderIds);

                if (existingPayouts && existingPayouts.length > 0) {
                    for (const existing of existingPayouts) {
                        if (existing.shop_id !== selectedShopId) {
                            const r = existing as any;
                            // We might want to just skip or warn? For now strict as per previous logic.
                            // Actually, let's just log and skip instead of failing everything?
                            // User asked for "same approach". Previous code threw error.
                            const shopName = r.shop?.name || 'Unknown Shop';
                            // throw new Error(`Order ${existing.order_id} already exists in Payouts for shop "${shopName}".`);
                            // Let's NOT throw, just exclude?
                            // No, throwing is safer to prevent partial mess.
                            // But batch checking implies we might block valid ones. 
                            // Let's filter them out from "valid" list instead? 
                            // "throw" is cleaner for user to know THEY messed up shop selection.
                            if (existing.shop_id !== selectedShopId) {
                                throw new Error(`Order ${existing.order_id} exists in another shop (${shopName}). Check your file or shop selection.`);
                            }
                        }
                    }
                }

                // Fetch Sales
                const { data: salesRecords, error: fetchError } = await supabase
                    .from('sales_records')
                    .select('id, order_id, sku_id, date, status, order_status, shop_id')
                    .in('order_id', orderIds);

                if (fetchError) throw fetchError;

                const salesMap = new Map<string, any>();
                salesRecords?.forEach(r => {
                    const key = `${r.order_id}_${(r.sku_id || '').trim().toLowerCase()}`;
                    salesMap.set(key, r);
                });

                for (const payout of processedRows) {
                    const payoutSku = (payout.sku_id || '').trim().toLowerCase();
                    const key = `${payout.order_id}_${payoutSku}`;

                    let salesRecord = salesMap.get(key);

                    if (!salesRecord) {
                        // Loose match try: if only 1 sales record for this order?
                        // Skip for now, strict.
                        errors.push(`Order ${payout.order_id} (SKU: ${payout.sku_id}) not found in Sales.`);
                        continue;
                    }

                    if (salesRecord.shop_id !== selectedShopId) {
                        errors.push(`Shop mismatch for Order ${payout.order_id}`);
                        continue;
                    }

                    payout.sales_record_id = salesRecord.id;
                    validPayouts.push(payout);

                    if (salesRecord.status !== payout.status) {
                        updatesToSales.push({ id: salesRecord.id, status: payout.status });
                    }
                }

                if (validPayouts.length === 0) {
                    if (errors.length > 0) throw new Error(`All ${processedRows.length} records failed validation. See console for details.`);
                    throw new Error("No valid records to insert.");
                }

                // Upsert
                const { error: insertError } = await supabase.from('payout_records').upsert(validPayouts, { onConflict: 'order_id, sku_id' });
                if (insertError) throw insertError;

                // Update Sales Status
                const uniqueUpdates = Array.from(new Map(updatesToSales.map(item => [item.id, item])).values());
                await Promise.all(uniqueUpdates.map((u: any) =>
                    supabase.from('sales_records').update({ status: u.status }).eq('id', u.id)
                ));

                const totalRaw = rawDataRows.length;
                const totalFound = processedRows.length;

                if (errors.length > 0) {
                    console.error('Import Errors:', errors);
                    setImportResult({
                        imported: validPayouts.length,
                        total: totalFound,
                        errors
                    });
                } else {
                    toast.success(`Success! Found ${totalFound} records. Imported ${validPayouts.length} entries.`);
                }
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
        reader.readAsArrayBuffer(selectedFile);
    };

    const totalSettlement = filteredTotalSettlement;

    if (loading) return <LoadingIndicator label="Loading payouts..." />;

    return (
        <div>
            <div className={cards.cardGridTwoCol}>
                <StatCard
                    label="Total Settlement"
                    value={formatCurrency(filteredTotalSettlement)}
                    subtext={`${totalRecords} records`}
                    variant="success"
                />

                {/* Monthly KPI Card - Disabled */}
                {/* <KPICard
                    currentKPI={kpiStats.currentKPI}
                    targetKPI={kpiStats.targetKPI}
                    monthlyProfit={kpiStats.currentKPI}
                    currentLevel={kpiStats.currentLevel}
                /> */}
            </div>

            <div className={layouts.spacingY}></div>

            <div className={filters.responsiveFilterContainer}>
                <div className={filters.responsiveFilterControls}>
                    <div className={`${filters.filterButtons} ${filters.scrollableButtonGroup}`} style={{ marginBottom: 0 }}>
                        <Button
                            variant={filter === 'this_month' ? 'primary' : 'secondary'}
                            onClick={() => { setFilter('this_month'); setCurrentPage(1); }}
                            className={filters.filterButton}
                        >
                            This Month
                        </Button>
                        <Button
                            variant={filter === 'last_month' ? 'primary' : 'secondary'}
                            onClick={() => { setFilter('last_month'); setCurrentPage(1); }}
                            className={filters.filterButton}
                        >
                            Last Month
                        </Button>
                        <Button
                            variant={filter === 'range' ? 'primary' : 'secondary'}
                            onClick={() => {
                                setFilter('range');
                                setCurrentPage(1);
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
                        <div className={filters.dateRangeContainer} style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setCurrentPage(1); }}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className={forms.formInput}
                            />
                            <span className={layouts.textMuted} style={{ alignSelf: 'center' }}>-</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setCurrentPage(1); }}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className={forms.formInput}
                            />
                        </div>
                    )}

                    {['admin', 'leader'].includes(userRole) && (
                        <div className={filters.responsiveControlItem}>
                            <label className={forms.formLabel} style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Filter by Owner</label>
                            <select
                                value={userFilter}
                                onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1); }}
                                className={forms.formSelect}
                            >
                                <option value="all">All Owners</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={filters.responsiveControlItem}>
                        <label className={forms.formLabel} style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Filter by Shop</label>
                        <select
                            value={shopFilter}
                            onChange={(e) => { setShopFilter(e.target.value); setCurrentPage(1); }}
                            className={forms.formSelect}
                        >
                            <option value="all">All Shops</option>
                            {shops
                                .filter(s => userFilter === 'all' || !userFilter || s.owner_id === userFilter)
                                .map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                        </select>
                    </div>

                    <div className={filters.responsiveControlItem}>
                        <label className={forms.formLabel} style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Filter by Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className={forms.formSelect}
                        >
                            <option value="all">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>

                <div style={{ minWidth: '150px' }}>
                    <Button onClick={() => setIsImportModalOpen(true)} className={filters.responsiveControlFull}>Import XLSX</Button>
                </div>
            </div>


            <div className={layouts.spacingY}></div>

            <PayoutsTable records={payouts} loading={loading} />

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
            </Modal>

            {/* Import Result Modal */}
            <Modal isOpen={!!importResult} onClose={() => setImportResult(null)} title="Import Result">
                <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'grid', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className={layouts.textMuted}>Total Scanned:</span>
                            <span style={{ fontWeight: 600 }}>{importResult?.total}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className={layouts.textMuted}>Successfully Imported:</span>
                            <span style={{ fontWeight: 600, color: 'var(--success-color, #10b981)' }}>{importResult?.imported}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className={layouts.textMuted}>Failed / Skipped:</span>
                            <span style={{ fontWeight: 600, color: 'var(--danger-color, #ef4444)' }}>{importResult?.errors.length}</span>
                        </div>
                    </div>

                    {importResult && importResult.errors.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>Error Details:</h4>
                            <div style={{
                                maxHeight: '300px',
                                overflowY: 'auto',
                                background: 'var(--background-secondary, #f4f4f5)',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                fontSize: '0.85rem',
                                color: 'var(--danger-color, #ef4444)',
                                fontFamily: 'monospace'
                            }}>
                                {importResult.errors.map((err, i) => (
                                    <div key={i} style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-light, #e4e4e7)', paddingBottom: '0.25rem' }}>
                                        • {err}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setImportResult(null)}>Close</Button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}
