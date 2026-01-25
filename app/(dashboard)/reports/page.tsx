'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { useSupabase } from '@/contexts/SupabaseContext';
import { formatCurrency } from '@/utils/formatters';
import { layouts, cards, tables, filters } from '@/styles/modules';

type FilterType = 'daily' | 'weekly' | 'monthly';

interface Profile {
    id: string;
    full_name: string | null;
    email: string;
}

interface Shop {
    name: string;
    owner_id: string;
}

interface SalesRecord {
    id: string;
    date: string;
    revenue: number;
    profit: number;
    status?: string;
    shops: Shop | Shop[] | null; // Supabase can return array with !inner join
}

export default function ReportsPage() {
    const [sales, setSales] = useState<SalesRecord[]>([]);
    const [filter, setFilter] = useState<FilterType>('monthly');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [userRole, setUserRole] = useState<string>('member');

    const supabase = useSupabase();

    // Fetch Profiles for Filter
    useEffect(() => {
        const fetchProfiles = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const role = profile?.role || 'member';
            setUserRole(role);

            if (role === 'admin') {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .neq('role', 'admin')
                    .order('full_name');
                if (data) setProfiles(data);
            } else if (role === 'leader') {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .or(`id.eq.${user.id},leader_id.eq.${user.id}`)
                    .order('full_name');
                if (data) setProfiles(data);
            }
        };
        fetchProfiles();
    }, []); // Removed supabase - it's stable from context

    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Determine start date based on filter
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0); // Start of today

            if (filter === 'weekly') {
                // This Week (Monday start)
                const day = startDate.getDay();
                const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
                startDate.setDate(diff);
            } else if (filter === 'monthly') {
                // This Month
                startDate.setDate(1);
            }

            const dateStr = startDate.toISOString().split('T')[0];

            let query = supabase
                .from('sales_records')
                .select(`
                id, date, revenue, profit, status,
                shops!inner (name, owner_id)
            `)
                .gte('date', dateStr)
                .order('date', { ascending: false });

            // Apply User Filter (if specific user selected)
            if (userFilter !== 'all') {
                query = query.eq('shops.owner_id', userFilter);
            } else {
                // Apply Role Logic if 'all' is selected (or restricted by default)
                if (userRole === 'admin') {
                    // Admin sees all (no extra filter needed)
                } else if (userRole === 'leader') {
                    const { data: members } = await supabase.from('profiles').select('id').eq('leader_id', user.id);
                    const teamIds = [user.id, ...(members?.map(m => m.id) || [])];
                    query = query.in('shops.owner_id', teamIds);
                } else {
                    // Member sees self
                    query = query.eq('shops.owner_id', user.id);
                }
            }

            const { data, error } = await query;
            if (error) console.error('Error fetching report sales:', error);
            if (data) setSales(data as SalesRecord[]);
            setLoading(false);
        };

        // Only fetch if userRole is determined (or default member handles it, 
        // but better to wait for profile fetch to know if we can show filter)
        // Actually, userRole 'member' default is safe, it just restricts.
        fetchSales();
    }, [filter, userFilter, userRole]); // Removed supabase - it's stable from context

    const getFilterLabel = () => {
        switch (filter) {
            case 'daily': return 'Today';
            case 'weekly': return 'This Week';
            case 'monthly': return 'This Month';
            default: return '';
        }
    };

    return (
        <div>
            <div className={cards.cardGridTwoCol}>
                <StatCard
                    label={`Total Profit (${getFilterLabel()})`}
                    value={loading ? '...' : formatCurrency(sales.reduce((acc, curr) => acc + (curr.profit || 0), 0))}
                    subtext={`${sales.length} records`}
                    variant="success"
                />
                <Card className={cards.statCard}>
                    <div className={cards.statLabel}>Recent Activity</div>
                    <div className={cards.statValue}>{sales[0]?.date || 'N/A'}</div>
                    <div className={cards.statChange}>
                        <span>Last Entry</span>
                    </div>
                </Card>
            </div>

            <div className={layouts.spacingY}></div>

            <div className={filters.filterControls}>
                {['admin', 'leader'].includes(userRole) && (
                    <div className={filters.filterField}>
                        <label className={filters.filterLabel}>Filter by User</label>
                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className={filters.filterSelect}
                        >
                            <option value="all">All Users</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className={filters.filterGroup}>
                    <label className={filters.filterLabel}>Period</label>
                    <div className={filters.filterButtons}>
                        <Button
                            variant={filter === 'daily' ? 'primary' : 'secondary'}
                            onClick={() => setFilter('daily')}
                        >
                            Daily
                        </Button>
                        <Button
                            variant={filter === 'weekly' ? 'primary' : 'secondary'}
                            onClick={() => setFilter('weekly')}
                        >
                            Weekly
                        </Button>
                        <Button
                            variant={filter === 'monthly' ? 'primary' : 'secondary'}
                            onClick={() => setFilter('monthly')}
                        >
                            Monthly
                        </Button>
                    </div>
                </div>
            </div>

            <div className={layouts.spacingYLarge}></div>

            <div>
                <h3 className={layouts.sectionHeader}>Sales Records ({getFilterLabel()})</h3>
                <div className={tables.tableWrapper}>
                    <table className={tables.table}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Shop</th>
                                <th>Revenue</th>
                                <th>Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.length === 0 ? (
                                <tr><td colSpan={4} className={layouts.textCenter} style={{ padding: '2rem' }}>
                                    {loading ? 'Loading...' : 'No records found for this period'}
                                </td></tr>
                            ) : (
                                sales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td data-label="Date">{sale.date}</td>
                                        <td data-label="Shop">
                                            {Array.isArray(sale.shops)
                                                ? sale.shops[0]?.name || 'Unknown Shop'
                                                : sale.shops?.name || 'Unknown Shop'}
                                        </td>
                                        <td data-label="Revenue">${Number(sale.revenue).toLocaleString()}</td>
                                        <td data-label="Profit" style={{ color: sale.profit > 0 ? '#10b981' : '#f87171' }}>
                                            {sale.profit > 0 ? '+' : ''}${Number(sale.profit).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
