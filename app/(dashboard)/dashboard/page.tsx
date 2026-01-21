'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todaySales: 0,
    monthlyRevenue: 0,
    targetKPI: 150000,
    currentKPI: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            
            if (!profile) return;

            // Fetch data from start of current month OR 30 days ago, whichever is earlier
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startDate = thirtyDaysAgo < startOfMonth ? thirtyDaysAgo : startOfMonth;
            const dateStr = startDate.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];

            let query = supabase
                .from('sales_records')
                .select(`
                    date, 
                    revenue, 
                    profit, 
                    items_sold, 
                    shop:shops!inner(
                        owner_id, 
                        owner:profiles!owner_id(full_name)
                    )
                `)
                .gte('date', dateStr);

            if (profile.role === 'admin') {
                // No filters
            } else if (profile.role === 'leader') {
                const { data: members } = await supabase.from('profiles').select('id').eq('leader_id', user.id);
                const memberIds = members?.map(m => m.id) || [];
                query = query.in('shop.owner_id', [user.id, ...memberIds]);
            } else {
                query = query.eq('shop.owner_id', user.id);
            }

            const { data: salesData, error } = await query.order('date', { ascending: true });
            if (error) throw error;
            
            if (salesData) {
                // Today's Stats
                const todayRecords = salesData.filter(r => r.date === todayStr);
                const todayRev = todayRecords.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);
                const todayItems = todayRecords.reduce((acc, curr) => acc + (Number(curr.items_sold) || 0), 0);

                // Monthly KPI Stats (from 1st of current month)
                const monthlyRecords = salesData.filter(r => new Date(r.date) >= startOfMonth);
                const monthlyRev = monthlyRecords.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);
                
                setStats(prev => ({
                    ...prev,
                    todayRevenue: todayRev,
                    todaySales: todayItems,
                    monthlyRevenue: monthlyRev,
                    currentKPI: monthlyRev // Month-to-date revenue for KPI
                }));

                // Process Chart Data (30-day trend context)
                const membersSet = new Set<string>();
                const groupedData = salesData.reduce((acc: any, curr: any) => {
                    const date = curr.date;
                    const name = curr.shop?.owner?.full_name || 'Unknown';
                    const qty = Number(curr.items_sold) || 0;
                    const rev = Number(curr.revenue) || 0;
                    membersSet.add(name);

                    if (!acc[date]) {
                        acc[date] = { date, totalQty: 0 };
                    }
                    acc[date][name] = (acc[date][name] || 0) + rev;
                    acc[date].totalQty += qty;
                    return acc;
                }, {});

                const chartArray = Object.values(groupedData).sort((a: any, b: any) => 
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );
                
                setChartData(chartArray);
                setMemberNames(Array.from(membersSet));
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };
    fetchStats();
  }, [supabase]);

  const progress = Math.min((stats.currentKPI / stats.targetKPI) * 100, 100);

  // Helper for generating colors for multiple areas
  const getAreaColor = (index: number) => {
    const colors = [
      'var(--primary)', // #6366f1
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#06b6d4', // Cyan
    ];
    return colors[index % colors.length];
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Dashboard...</div>;

  return (
    <div>
      <h1 className={styles.sectionTitle}>Today's Overview</h1>
      
      <div className={styles.grid}>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>Today's Sales</span>
          <span className={styles.statValue}>{stats.todaySales.toLocaleString()} items</span>
          <span className={`${styles.statTrend} ${styles.trendUp}`}>Units Sold Today</span>
        </Card>

        <Card className={styles.statCard}>
          <span className={styles.statLabel}>Today's Revenue</span>
          <span className={styles.statValue}>${stats.todayRevenue.toLocaleString()}</span>
          <span className={styles.statTrend}>Gross Revenue Today</span>
        </Card>
        
        <Card className={styles.statCard}>
            <span className={styles.statLabel}>Monthly KPI Progress</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className={styles.statValue}>{progress.toFixed(1)}%</span>
                <span style={{ color: 'var(--muted-foreground)' }}>Target: ${stats.targetKPI.toLocaleString()}</span>
            </div>
            <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.5rem', display: 'block' }}>
                MTD: ${stats.monthlyRevenue.toLocaleString()}
            </span>
        </Card>
      </div>

      <div className={styles.grid} style={{ gridTemplateColumns: '1fr' }}>
        <Card className={styles.chartContainer} style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Analytics: Revenue vs Volume</h2>
             <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Last 30 Days</span>
           </div>
           
           <div style={{ width: '100%', height: '450px' }}>
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                   <defs>
                     {memberNames.map((name, index) => (
                       <linearGradient key={`grad-${name}`} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor={getAreaColor(index)} stopOpacity={0.2}/>
                         <stop offset="95%" stopColor={getAreaColor(index)} stopOpacity={0}/>
                       </linearGradient>
                     ))}
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis 
                     dataKey="date" 
                     stroke="var(--muted-foreground)" 
                     fontSize={11}
                     tickLine={false}
                     axisLine={false}
                     tickFormatter={(str) => {
                       const date = new Date(str);
                       return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                     }}
                   />
                   <YAxis 
                     yAxisId="left"
                     stroke="var(--muted-foreground)" 
                     fontSize={11}
                     tickLine={false}
                     axisLine={false}
                     tickFormatter={(value) => `$${value}`}
                   />
                   <YAxis 
                     yAxisId="right"
                     orientation="right"
                     stroke="#94a3b8" 
                     fontSize={11}
                     tickLine={false}
                     axisLine={false}
                     tickFormatter={(value) => `${value} Qty`}
                   />
                   <Tooltip 
                     contentStyle={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                     itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                     labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary)' }}
                     formatter={(value: any, name?: string) => {
                       if (name === 'Total Sold QTY') return [`${value.toLocaleString()} units`, name];
                       return [`$${Number(value || 0).toLocaleString()}`, name || 'Revenue'];
                     }}
                   />
                   <Legend verticalAlign="top" height={40} iconType="circle" />
                   {memberNames.map((name, index) => (
                     <Area 
                       key={name}
                       yAxisId="left"
                       type="monotone" 
                       dataKey={name} 
                       name={name}
                       stroke={getAreaColor(index)} 
                       fillOpacity={1} 
                       fill={`url(#color-${index})`} 
                       strokeWidth={2}
                       stackId="1"
                     />
                   ))}
                   <Line
                     yAxisId="right"
                     type="monotone"
                     dataKey="totalQty"
                     name="Total Sold QTY"
                     stroke="#94a3b8"
                     strokeWidth={2}
                     dot={{ r: 3, fill: '#94a3b8' }}
                     activeDot={{ r: 5 }}
                   />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
                 No sales performance data found for this period.
               </div>
             )}
           </div>
        </Card>
      </div>
    </div>
  );
}


