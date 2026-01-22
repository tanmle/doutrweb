'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/utils/supabase/client';

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
    <div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Performance Reports</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary">Daily</Button>
            <Button variant="secondary">Weekly</Button>
            <Button variant="primary">Monthly</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <Card>
              <h3>Team Leader View</h3>
                <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    Total Profit (All Time): <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sales.reduce((acc, curr) => acc + (curr.profit || 0), 0))}
                    </span>
                </p>

          </Card>
           <Card>
              <h3>Recent Activity</h3>
              <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  Last Entry: <span style={{ color: 'var(--foreground)' }}>{sales[0]?.date || 'N/A'}</span>
              </p>
          </Card>
      </div>

      <Card>
          <h3 style={{ marginBottom: '1rem' }}>Recent Sales Records (Real-time)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                        <th style={{ padding: '0.75rem' }}>Date</th>
                        <th style={{ padding: '0.75rem' }}>Shop</th>
                        <th style={{ padding: '0.75rem' }}>Revenue</th>
                        <th style={{ padding: '0.75rem' }}>Profit</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No records found</td></tr>
                    ) : (
                        sales.map((sale) => (
                            <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '0.75rem' }}>{sale.date}</td>
                                <td style={{ padding: '0.75rem' }}>{sale.shops?.name || 'Unknown Shop'}</td>
                                <td style={{ padding: '0.75rem' }}>${sale.revenue.toLocaleString()}</td>
                                <td style={{ padding: '0.75rem', color: sale.profit > 0 ? '#10b981' : '#f87171' }}>
                                    {sale.profit > 0 ? '+' : ''}${sale.profit.toLocaleString()}
                                </td>
                                <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{sale.status}</td>
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


