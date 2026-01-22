'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

type DashboardStats = {
  todayRevenue: number;
  todaySales: number;
  monthlyRevenue: number;
  targetKPI: number;
  currentKPI: number;
};

type SalesRecord = {
  date: string;
  revenue: number | string | null;
  profit: number | string | null;
  items_sold: number | string | null;
  shop?: {
    owner_id?: string | null;
    owner?: {
      full_name?: string | null;
    } | null;
  } | null;
};

type ChartPoint = {
  date: string;
  [key: string]: number | string;
};

type ChartFilter = 'today' | 'week' | 'month' | 'last-month' | 'range';

type DateRange = {
  start: string;
  end: string;
};

const AREA_COLORS = [
  'var(--primary)',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

const getAreaColor = (index: number) => AREA_COLORS[index % AREA_COLORS.length];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todaySales: 0,
    monthlyRevenue: 0,
    targetKPI: 150000,
    currentKPI: 0
  });
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChartFilter>('today');
  const [memberFilter, setMemberFilter] = useState('all');
  const [role, setRole] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });

  const supabase = useMemo(() => createClient(), []);

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
        setRole(profile.role ?? null);

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

        const salesRows = (salesData ?? []) as SalesRecord[];

        if (salesRows.length > 0) {
          // Today's Stats
          const todayRecords = salesRows.filter(r => r.date === todayStr);
          const todayRev = todayRecords.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);
          const todayItems = todayRecords.reduce((acc, curr) => acc + (Number(curr.items_sold) || 0), 0);

          // Monthly KPI Stats (from 1st of current month)
          const monthlyRecords = salesRows.filter(r => new Date(r.date) >= startOfMonth);
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
          const groupedData = salesRows.reduce<Record<string, ChartPoint>>((acc, curr) => {
            const date = curr.date;
            const name = curr.shop?.owner?.full_name || 'Unknown';
            const rev = Number(curr.revenue) || 0;
            membersSet.add(name);

            if (!acc[date]) {
              acc[date] = { date };
            }
            const existingValue = typeof acc[date][name] === 'number' ? acc[date][name] : 0;
            acc[date][name] = existingValue + rev;
            return acc;
          }, {});

          const chartArray = Object.values(groupedData).sort((a, b) =>
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

  const filteredChartData = useMemo(() => {
    if (chartData.length === 0) return chartData;

    const today = new Date();
    const todayKey = formatDateKey(today);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const isWithinRange = (dateKey: string, start: Date, end: Date) => {
      const date = parseDateKey(dateKey);
      return date >= start && date <= end;
    };

    if (filter === 'today') {
      return chartData.filter((item) => item.date === todayKey);
    }

    if (filter === 'week') {
      const weekday = startOfToday.getDay();
      const diff = (weekday + 6) % 7;
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - diff);
      return chartData.filter((item) => isWithinRange(item.date, startOfWeek, startOfToday));
    }

    if (filter === 'month') {
      const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
      return chartData.filter((item) => isWithinRange(item.date, startOfMonth, startOfToday));
    }

    if (filter === 'last-month') {
      const startOfLastMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 1, 1);
      const endOfLastMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 0);
      return chartData.filter((item) => isWithinRange(item.date, startOfLastMonth, endOfLastMonth));
    }

    if (filter === 'range') {
      if (!dateRange.start || !dateRange.end) return chartData;
      const start = parseDateKey(dateRange.start);
      const end = parseDateKey(dateRange.end);
      return chartData.filter((item) => isWithinRange(item.date, start, end));
    }

    return chartData;
  }, [chartData, dateRange.end, dateRange.start, filter]);

  const memberOptions = useMemo(() => ['all', ...memberNames], [memberNames]);

  const memberNamesToRender = useMemo(() => {
    if (memberFilter === 'all') return memberNames;
    return memberNames.filter((name) => name === memberFilter);
  }, [memberFilter, memberNames]);

  const filterLabel = useMemo(() => {
    if (filter === 'today') return 'Today';
    if (filter === 'week') return 'This Week';
    if (filter === 'month') return 'This Month';
    if (filter === 'last-month') return 'Last Month';
    return dateRange.start && dateRange.end ? `${dateRange.start} → ${dateRange.end}` : 'Date Range';
  }, [dateRange.end, dateRange.start, filter]);

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Analytics: Revenue</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as ChartFilter)}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="range">Date Range</option>
              </select>
              {role !== 'member' && (
                <select
                  value={memberFilter}
                  onChange={(event) => setMemberFilter(event.target.value)}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.875rem'
                  }}
                >
                  {memberOptions.map((member) => (
                    <option key={member} value={member}>
                      {member === 'all' ? 'All Members' : member}
                    </option>
                  ))}
                </select>
              )}
              {filter === 'range' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                  <span style={{ color: 'var(--muted-foreground)' }}>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ width: '100%', height: '450px' }}>
            {filteredChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>

                  <defs>
                    {memberNamesToRender.map((name, index) => (
                      <linearGradient key={`grad-${name}`} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getAreaColor(index)} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={getAreaColor(index)} stopOpacity={0} />
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
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                    itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary)' }}
                    formatter={(value: any, name?: string) => [`$${Number(value || 0).toLocaleString()}`, name || 'Revenue']}
                  />
                  <Legend verticalAlign="top" height={40} iconType="circle" />
                  {memberNamesToRender.map((name, index) => (
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


