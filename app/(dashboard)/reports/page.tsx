'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/utils/supabase/client';
import { layouts, cards, tables, filters } from '@/styles/modules';

export default function ReportsPage() {
    const [sales, setSales] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchSales = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (!profile) return;

            let query = supabase
                .from('sales_records')
                .select(`
                id, date, revenue, profit, status,
                shops!inner (name, owner_id)
            `)
                .order('date', { ascending: false })
                .limit(20);

            if (profile.role === 'admin') {
                // Admin sees all
            } else if (profile.role === 'leader') {
                const { data: members } = await supabase.from('profiles').select('id').eq('leader_id', user.id);
                const teamIds = [user.id, ...(members?.map(m => m.id) || [])];
                query = query.in('shops.owner_id', teamIds);
            } else {
                // Member
                query = query.eq('shops.owner_id', user.id);
            }

            const { data, error } = await query;
            if (error) console.error('Error fetching report sales:', error);
            if (data) setSales(data);
        };
        fetchSales();
    }, [supabase]);

    return (
        <div className={layouts.pageContainer}>
            <div className={layouts.pageHeaderWithActions}>
                <h1 className={layouts.pageHeader} style={{ margin: 0 }}>Performance Reports</h1>
                <div className={filters.filterButtons}>
                    <Button variant="secondary">Daily</Button>
                    <Button variant="secondary">Weekly</Button>
                    <Button variant="primary">Monthly</Button>
                </div>
            </div>

            <div className={cards.cardGridTwoCol}>
                <Card className={cards.statCard}>
                    <div className={cards.statLabel}>Team Leader View</div>
                    <div className={cards.statValue}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sales.reduce((acc, curr) => acc + (curr.profit || 0), 0))}</div>
                    <div className={cards.statChange}>
                        <span className={cards.statChangePositive}>Total Profit (All Time)</span>
                    </div>
                </Card>
                <Card className={cards.statCard}>
                    <div className={cards.statLabel}>Recent Activity</div>
                    <div className={cards.statValue}>{sales[0]?.date || 'N/A'}</div>
                    <div className={cards.statChange}>
                        <span>Last Entry</span>
                    </div>
                </Card>
            </div>

            <div className={layouts.spacingYLarge}></div>

            <Card>
                <h3 className={layouts.sectionHeader}>Recent Sales Records (Real-time)</h3>
                <div className={tables.tableWrapper}>
                    <table className={tables.table}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Shop</th>
                                <th>Revenue</th>
                                <th>Profit</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.length === 0 ? (
                                <tr><td colSpan={5} className={layouts.textCenter} style={{ padding: '2rem' }}>No records found</td></tr>
                            ) : (
                                sales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td data-label="Date">{sale.date}</td>
                                        <td data-label="Shop">{sale.shops?.name || 'Unknown Shop'}</td>
                                        <td data-label="Revenue">${sale.revenue.toLocaleString()}</td>
                                        <td data-label="Profit" style={{ color: sale.profit > 0 ? '#10b981' : '#f87171' }}>
                                            {sale.profit > 0 ? '+' : ''}${sale.profit.toLocaleString()}
                                        </td>
                                        <td data-label="Status" style={{ textTransform: 'capitalize' }}>{sale.status}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
