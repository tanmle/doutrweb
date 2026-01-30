'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { StatCard } from '@/components/ui/StatCard';
import { RoleBadge } from '@/components/ui/RoleBadge';
import type { UserRole } from '@/components/ui/RoleBadge';
import { useSupabase } from '@/contexts/SupabaseContext';
import { formatCurrency } from '@/utils/formatters';
import { AREA_COLORS } from '@/constants/app';
import { cards, layouts, filters, dashboard } from '@/styles/modules';
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
import { useRealtime } from '@/hooks/useRealtime';

// --- Types ---
type DashboardStats = {
  todayRevenue: number;
  todaySales: number;
  monthlyRevenue: number;
  monthlyProfit: number;
};

type SalesRecord = {
  created_at?: string;
  date: string;
  revenue: number | string | null;
  profit: number | string | null;
  items_sold: number | string | null;
  shop?: {
    owner_id?: string | null;
    owner?: {
      full_name?: string | null;
      role?: string | null;
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

// --- Helpers ---
const getAreaColor = (index: number) => AREA_COLORS[index % AREA_COLORS.length];

// Robustly formatting local date as YYYY-MM-DD
const getLocalYYYYMMDD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Component ---
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todaySales: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
  });
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChartFilter>('month');
  const [memberFilter, setMemberFilter] = useState('all');
  const [role, setRole] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });

  const supabase = useSupabase();

  // Real-time: Refresh on sales record changes
  useRealtime({
    table: 'sales_records',
    onData: () => {
      setVersion(v => v + 1);
    }
  });

  const [version, setVersion] = useState(0);

  const fetchStats = useCallback(async () => {
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
      // Use local time for date calculation to avoid UTC mismatches
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Start of month in local time
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const startDate = thirtyDaysAgo < startOfMonth ? thirtyDaysAgo : startOfMonth;
      // Format as YYYY-MM-DD in local time
      const dateStr = getLocalYYYYMMDD(startDate);

      let query = supabase
        .from('sales_records')
        .select(`
                    created_at,
                    date, 
                    revenue, 
                    profit, 
                    items_sold, 
                    shop:shops!inner(
                        owner_id, 
                        owner:profiles!owner_id(full_name, role)
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
        // Monthly Stats - Local comparison
        const currentMonthPrefix = getLocalYYYYMMDD(new Date()).substring(0, 7); // YYYY-MM

        const monthlyRecords = salesRows.filter(r => r.date && r.date.startsWith(currentMonthPrefix));

        const monthlyRev = monthlyRecords.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);
        const monthlyItems = monthlyRecords.reduce((acc, curr) => acc + (Number(curr.items_sold) || 0), 0);
        const monthlyProfitVal = monthlyRecords.reduce((acc, curr) => acc + (Number(curr.profit) || 0), 0);

        setStats({
          todayRevenue: monthlyRev, // repurposing "todayRevenue" key for "displayed revenue" which is now monthly
          todaySales: monthlyItems,
          monthlyRevenue: monthlyRev,
          monthlyProfit: monthlyProfitVal,
        });

        // Process Chart Data
        const membersSet = new Set<string>();
        const rolesMap: Record<string, UserRole> = {};

        const groupedData = salesRows.reduce<Record<string, ChartPoint>>((acc, curr) => {
          const owner = curr.shop?.owner;

          // Use 'date' field directly for charting
          const dateKey = curr.date;

          const name = owner?.full_name || 'Unknown';
          const rev = Number(curr.revenue) || 0;
          membersSet.add(name);

          // Capture role
          if (owner?.role && (owner.role === 'leader' || owner.role === 'member')) {
            rolesMap[name] = owner.role as UserRole;
          }

          if (!acc[dateKey]) {
            acc[dateKey] = { date: dateKey };
          }

          const val = acc[dateKey][name];
          const existingValue = typeof val === 'number' ? val : 0;
          acc[dateKey][name] = existingValue + rev;
          return acc;
        }, {});

        const chartArray = Object.values(groupedData).sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        setChartData(chartArray);
        setMemberNames(Array.from(membersSet));
        setMemberRoles(rolesMap);
      } else {
        // Reset stats if no data
        setStats({
          todayRevenue: 0,
          todaySales: 0,
          monthlyRevenue: 0,
          monthlyProfit: 0
        });
        setChartData([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [version, fetchStats]);

  /* Filters Logic with Local Time alignment */
  const filteredChartData = useMemo(() => {
    if (chartData.length === 0) return chartData;

    const now = new Date();
    const todayKey = getLocalYYYYMMDD(now);

    // Helper to compare "YYYY-MM-DD" strings directly
    const isWithinRange = (dateStr: string, startStr: string, endStr: string) => {
      return dateStr >= startStr && dateStr <= endStr;
    };

    if (filter === 'today') {
      return chartData.filter((item) => item.date === todayKey);
    }

    if (filter === 'week') {
      // Calculate start of week (Sunday) in Local Time
      const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
      const diff = dayOfWeek; // Days to subtract to get to Sunday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diff);
      const startStr = getLocalYYYYMMDD(startOfWeek);
      return chartData.filter((item) => isWithinRange(item.date, startStr, todayKey));
    }

    if (filter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = getLocalYYYYMMDD(startOfMonth);
      return chartData.filter((item) => isWithinRange(item.date, startOfMonthStr, todayKey));
    }

    if (filter === 'last-month') {
      // Logic for last month
      const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayLastMonth = new Date(firstDayCurrentMonth);
      lastDayLastMonth.setDate(0); // Go back one day to end of prev month
      const firstDayLastMonth = new Date(lastDayLastMonth.getFullYear(), lastDayLastMonth.getMonth(), 1);

      const startStr = getLocalYYYYMMDD(firstDayLastMonth);
      const endStr = getLocalYYYYMMDD(lastDayLastMonth);

      return chartData.filter((item) => isWithinRange(item.date, startStr, endStr));
    }

    if (filter === 'range') {
      if (!dateRange.start || !dateRange.end) return chartData;
      return chartData.filter((item) => isWithinRange(item.date, dateRange.start, dateRange.end));
    }

    return chartData;
  }, [chartData, dateRange.end, dateRange.start, filter]);

  const memberOptions = useMemo(() => ['all', ...memberNames], [memberNames]);

  const memberNamesToRender = useMemo(() => {
    if (memberFilter === 'all') return memberNames;
    return memberNames.filter((name) => name === memberFilter);
  }, [memberFilter, memberNames]);

  if (loading) return <LoadingIndicator label="Loading dashboard…" />;

  return (
    <div>
      <h1 className={layouts.sectionHeader}>This Month's Overview</h1>

      <div className={cards.cardGridTwoCol}>
        <StatCard
          label="This Month's Sales"
          value={stats.todaySales}
          subtext="Items Sold This Month"
          variant="warning"
        />

        <StatCard
          label="This Month's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          subtext="Gross Revenue This Month"
          variant="success"
        />
      </div>

      <div className={layouts.spacingYLarge}></div>

      <div className={layouts.grid}>
        <Card className={dashboard.chartCard}>
          <div className={`${layouts.flexRowSpaced} ${dashboard.chartHeader}`}>
            <h2 className={`${layouts.sectionHeader} ${dashboard.chartTitle}`}>Analytics: Revenue</h2>

            <div className={`${filters.filterControls} ${dashboard.filterContainer}`}>
              <div className={filters.filterButtons}>
                <select
                  aria-label="Filter chart by date"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as ChartFilter)}
                  className={`${filters.filterSelect} ${dashboard.filterSelect}`}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="range">Date Range</option>
                </select>

                {role !== 'member' && (
                  <select
                    aria-label="Filter chart by member"
                    value={memberFilter}
                    onChange={(event) => setMemberFilter(event.target.value)}
                    className={`${filters.filterSelect} ${dashboard.filterSelect}`}
                  >
                    {memberOptions.map((member) => (
                      <option key={member} value={member}>
                        {member === 'all' ? 'All Members' : member}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {filter === 'range' && (
                <div className={filters.dateRangeContainer}>
                  <input
                    aria-label="Start date"
                    type="date"
                    value={dateRange.start}
                    onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className={`${filters.filterInput} ${dashboard.filterDateInput}`}
                  />
                  <span className={layouts.textMuted}>to</span>
                  <input
                    aria-label="End date"
                    type="date"
                    value={dateRange.end}
                    onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className={`${filters.filterInput} ${dashboard.filterDateInput}`}
                  />
                </div>
              )}
            </div>
          </div>

          <div className={dashboard.chartContainer}>
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
                    formatter={(value: any, name?: string) => [formatCurrency(Number(value || 0)), name || 'Revenue']}
                  />
                  <Legend
                    verticalAlign="top"
                    height={40}
                    iconType="circle"
                    content={(props) => {
                      const { payload } = props;
                      return (
                        <div className={dashboard.chartLegend}>
                          {payload?.map((entry: any, index: number) => (
                            <div key={`legend-${index}`} className={dashboard.chartLegendItem}>
                              <div className={dashboard.chartLegendDot} style={{ backgroundColor: entry.color }} />
                              <span className={dashboard.chartLegendLabel}>
                                {entry.value}
                                {memberRoles[entry.value] && <RoleBadge role={memberRoles[entry.value]} />}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
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
              <div className={dashboard.emptyState}>
                No sales performance data found for this period.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
