"use client";

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { type LucideIcon } from 'lucide-react';
import {
  ShoppingCart, TrendingUp, AlertTriangle, Wallet,
  RefreshCw, Clock, ChefHat, Thermometer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  kpis: {
    todaysOrders: number;
    todaysRevenue: number;
    averageOrderValue: number;
    predictedTomorrow: number | null;
    lowStockCount: number;
    criticalCount: number;
    expiringUrgent: number;
  };
  chartData: Record<string, string | number | null>[];
  insights: string[];
  topSellingItems: { item: string; sold: number; revenue: number }[];
  lowStockItems: { item_name: string; current_qty: number; threshold_qty: number; status: string; unit: string; location_id?: string }[];
  expiryItems: { item_name: string; quantity: number; expiry_date: string; days_to_expiry: number; location_id?: string }[];
  isAllLocations: boolean;
}

interface ComparisonRow {
  locationId: string;
  locationName: string;
  todaysOrders: number;
  todaysRevenue: number;
  avgOrderValue: number;
  criticalCount: number;
  warningCount: number;
  expiringCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OUTLET_LINES = [
  { key: 'midValley',       label: 'Mid Valley',     color: '#6366f1' },
  { key: 'sunway',          label: 'Sunway Pyramid', color: '#f97316' },
  { key: 'klcc',            label: 'KLCC',           color: '#22c55e' },
];

const LOCATION_NAMES: Record<string, string> = {
  'outlet-1': 'Mid Valley',
  'outlet-2': 'Sunway Pyramid',
  'outlet-3': 'KLCC',
};

const ALL_LOCATIONS = [
  { id: 'all',      name: 'All Outlets' },
  { id: 'outlet-1', name: 'Mid Valley' },
  { id: 'outlet-2', name: 'Sunway Pyramid' },
  { id: 'outlet-3', name: 'KLCC' },
];

const STATUS_COLORS = { ok: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };
const EXPIRY_COLOR = (days: number) =>
  days <= 1 ? '#ef4444' : days <= 3 ? '#f97316' : '#f59e0b';

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  title, value, sub, icon: Icon, accent,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent?: 'green' | 'red' | 'orange' | 'blue';
}) {
  const accentMap: Record<string, string> = {
    green:  'text-green-600',
    red:    'text-red-500',
    orange: 'text-orange-500',
    blue:   'text-indigo-500',
  };
  const accentClass = accentMap[accent ?? 'blue'];

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${accentClass}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted ${accentClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Color-code a cell value relative to the array of all values (higher = greener for orders/revenue, lower = greener for alerts)
function colorCell(val: number, all: number[], higherIsBetter: boolean) {
  const sorted = [...all].sort((a, b) => a - b);
  const rank = sorted.indexOf(val);
  const n = sorted.length;
  const normalized = rank / Math.max(n - 1, 1);
  const score = higherIsBetter ? normalized : 1 - normalized;
  if (score >= 0.66) return 'text-green-600 font-semibold';
  if (score >= 0.33) return 'text-yellow-600 font-semibold';
  return 'text-red-500 font-semibold';
}

function ComparisonTable({ rows, onSelectOutlet }: { rows: ComparisonRow[]; onSelectOutlet: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<keyof ComparisonRow>('todaysRevenue');
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() =>
    [...rows].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return asc ? av - bv : bv - av;
    }), [rows, sortKey, asc]);

  const toggle = (k: keyof ComparisonRow) => {
    if (k === sortKey) setAsc(!asc);
    else { setSortKey(k); setAsc(false); }
  };

  const allOrders  = rows.map(r => r.todaysOrders);
  const allRev     = rows.map(r => r.todaysRevenue);
  const allAov     = rows.map(r => r.avgOrderValue);
  const allCrit    = rows.map(r => r.criticalCount);
  const allExpiry  = rows.map(r => r.expiringCount);

  const TH = ({ label, k }: { label: string; k: keyof ComparisonRow }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => toggle(k)}
    >
      {label} {sortKey === k ? (asc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Outlet</th>
            <TH label="Orders Today" k="todaysOrders" />
            <TH label="Revenue (RM)" k="todaysRevenue" />
            <TH label="Avg Order" k="avgOrderValue" />
            <TH label="Critical Stock" k="criticalCount" />
            <TH label="Expiring Soon" k="expiringCount" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((row) => (
            <tr
              key={row.locationId}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onSelectOutlet(row.locationId)}
            >
              <td className="px-4 py-3 font-medium">{row.locationName}</td>
              <td className={`px-4 py-3 ${colorCell(row.todaysOrders, allOrders, true)}`}>{row.todaysOrders}</td>
              <td className={`px-4 py-3 ${colorCell(row.todaysRevenue, allRev, true)}`}>RM {row.todaysRevenue.toFixed(2)}</td>
              <td className={`px-4 py-3 ${colorCell(row.avgOrderValue, allAov, true)}`}>RM {row.avgOrderValue.toFixed(2)}</td>
              <td className={`px-4 py-3 ${colorCell(row.criticalCount, allCrit, false)}`}>{row.criticalCount}</td>
              <td className={`px-4 py-3 ${colorCell(row.expiringCount, allExpiry, false)}`}>{row.expiringCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const swrKey = `/api/dashboard?location=${selectedLocation}&_t=${Math.floor(lastRefresh.getTime() / 60_000)}`;
  const { data, isLoading, error, mutate } = useSWR<DashboardData>(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    refreshInterval: 60_000,
  });

  const { data: compData, mutate: mutateComp } = useSWR<{ table: ComparisonRow[] }>(
    '/api/dashboard/comparison',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000, refreshInterval: 60_000 },
  );

  const handleRefresh = () => {
    setLastRefresh(new Date());
    mutate();
    mutateComp();
  };

  const minutesAgo = Math.floor((Date.now() - lastRefresh.getTime()) / 60_000);

  // ── Derived chart data ──

  const stockDonutData = useMemo(() => {
    if (!data) return [];
    const stock = data.lowStockItems;
    const critical = stock.filter(i => i.status === 'critical').length;
    const warning  = stock.filter(i => i.status === 'warning').length;
    // "ok" items are not in lowStockItems — approximate from KPI
    const total = data.kpis.lowStockCount;
    const ok = Math.max(0, 10 - total); // fallback: assume 10 item types
    return [
      { name: 'Critical', value: critical, color: STATUS_COLORS.critical },
      { name: 'Warning',  value: warning,  color: STATUS_COLORS.warning },
      { name: 'OK',       value: ok > 0 ? ok : 1, color: STATUS_COLORS.ok },
    ].filter(d => d.value > 0);
  }, [data]);

  // Fetch full stock counts for the donut (we need ok items too)
  const { data: fullStockData } = useSWR<{ ok: number; warning: number; critical: number }>(
    selectedLocation !== 'all'
      ? `/api/dashboard/stock-status?location=${selectedLocation}`
      : null,
    fetcher,
  );

  const donutData = useMemo(() => {
    if (fullStockData) {
      return [
        { name: 'Critical', value: fullStockData.critical, color: STATUS_COLORS.critical },
        { name: 'Warning',  value: fullStockData.warning,  color: STATUS_COLORS.warning },
        { name: 'OK',       value: fullStockData.ok,       color: STATUS_COLORS.ok },
      ].filter(d => d.value > 0);
    }
    return stockDonutData;
  }, [fullStockData, stockDonutData]);

  const topMenuData = useMemo(() =>
    (data?.topSellingItems ?? []).map(i => ({ item: i.item, sold: i.sold }))
      .sort((a, b) => a.sold - b.sold), // ascending so longest bar is at top
    [data]);

  const expiryCountdownData = useMemo(() =>
    (data?.expiryItems ?? [])
      .filter(i => i.days_to_expiry != null && i.days_to_expiry <= 7)
      .slice(0, 8)
      .map(i => ({
        item: i.item_name,
        days: i.days_to_expiry,
        color: EXPIRY_COLOR(i.days_to_expiry),
        location: LOCATION_NAMES[i.location_id ?? ''] ?? '',
      })),
    [data]);

  // ── Alerts ──
  const alerts = useMemo(() => {
    type AlertSeverity = 'critical' | 'warning' | 'info';
  const result: { severity: AlertSeverity; title: string; message: string }[] = [];

    (data?.expiryItems ?? [])
      .filter(i => i.days_to_expiry != null && i.days_to_expiry <= 2)
      .slice(0, 3)
      .forEach(i => result.push({
        severity: 'critical',
        title: 'Expiry Urgent',
        message: `${i.item_name}${i.location_id ? ` (${LOCATION_NAMES[i.location_id]})` : ''} expires in ${i.days_to_expiry} day${i.days_to_expiry !== 1 ? 's' : ''} — use or discount now`,
      }));

    (data?.lowStockItems ?? [])
      .filter(i => i.status === 'critical')
      .slice(0, 3)
      .forEach(i => result.push({
        severity: 'critical',
        title: 'Critical Stock',
        message: `${i.item_name}${i.location_id ? ` (${LOCATION_NAMES[i.location_id]})` : ''}: only ${i.current_qty} ${i.unit} left (min ${i.threshold_qty} ${i.unit})`,
      }));

    (data?.lowStockItems ?? [])
      .filter(i => i.status === 'warning')
      .slice(0, 2)
      .forEach(i => result.push({
        severity: 'warning',
        title: 'Low Stock',
        message: `${i.item_name}${i.location_id ? ` (${LOCATION_NAMES[i.location_id]})` : ''}: ${i.current_qty} ${i.unit} — running low`,
      }));

    (data?.insights ?? []).slice(0, 2).forEach(text =>
      result.push({ severity: 'info', title: 'AI Insight', message: text }));

    return result.slice(0, 5);
  }, [data]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load dashboard data</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-indigo-500" />
            KioskIQ Command Centre
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time operations view for all your F&B outlets
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {/* Location selector */}
          <div className="flex flex-wrap gap-2">
            {ALL_LOCATIONS.map(loc => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedLocation === loc.id
                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
          {/* Refresh row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{minutesAgo === 0 ? 'Just refreshed' : `Refreshed ${minutesAgo}m ago`}</span>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleRefresh}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>
        </div>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Today's Orders"
          value={isLoading ? '—' : (kpis?.todaysOrders ?? 0)}
          sub={kpis?.predictedTomorrow ? `Tomorrow: ${kpis.predictedTomorrow} predicted` : 'Live from POS'}
          icon={ShoppingCart}
          accent="blue"
        />
        <KPICard
          title="Today's Revenue"
          value={isLoading ? '—' : `RM ${(kpis?.todaysRevenue ?? 0).toFixed(2)}`}
          sub={`Avg RM ${(kpis?.averageOrderValue ?? 0).toFixed(2)} / order`}
          icon={Wallet}
          accent="green"
        />
        <KPICard
          title="Stock Alerts"
          value={isLoading ? '—' : (kpis?.lowStockCount ?? 0)}
          sub={`${kpis?.criticalCount ?? 0} critical items`}
          icon={AlertTriangle}
          accent={(kpis?.criticalCount ?? 0) > 0 ? 'red' : 'orange'}
        />
        <KPICard
          title="Expiring ≤3 Days"
          value={isLoading ? '—' : (kpis?.expiringUrgent ?? 0)}
          sub="items need attention now"
          icon={Thermometer}
          accent={(kpis?.expiringUrgent ?? 0) > 0 ? 'red' : 'green'}
        />
      </div>

      {/* ── Row 2: Location Comparison Table (all outlets only) ── */}
      {selectedLocation === 'all' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Outlet Comparison
              <span className="text-xs font-normal text-muted-foreground">— click a row to drill in</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {compData?.table ? (
              <ComparisonTable
                rows={compData.table}
                onSelectOutlet={(id) => setSelectedLocation(id)}
              />
            ) : (
              <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">
                Loading comparison data…
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Row 3: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1 — Orders Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {selectedLocation === 'all' ? 'Orders Trend — All Outlets' : 'Orders Trend (Actual vs Predicted)'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Last 10 days • orders per day</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data?.chartData ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {selectedLocation === 'all' ? (
                    OUTLET_LINES.map(l => (
                      <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2}
                        name={l.label} dot={false} connectNulls={false} />
                    ))
                  ) : (
                    <>
                      <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} name="Actual" dot={{ fill: '#6366f1', r: 3 }} connectNulls={false} />
                      <Line type="monotone" dataKey="predicted" stroke="#a5b4fc" strokeWidth={1.5} strokeDasharray="5 5" name="Predicted" dot={false} connectNulls={false} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2 — Stock Status Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Stock Health Status</CardTitle>
            <p className="text-xs text-muted-foreground">Item count by stock level</p>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-[260px] w-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <ResponsiveContainer width="55%" height={240}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${v} items`]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 text-sm">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold ml-auto pl-4">{d.value}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-1 text-xs text-muted-foreground">
                    {(data?.kpis.criticalCount ?? 0) > 0
                      ? `⚠️ ${data?.kpis.criticalCount} items need restock`
                      : '✅ No critical items'}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Chart 3 — Top Menu Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Menu Items Sold Today</CardTitle>
            <p className="text-xs text-muted-foreground">Units sold per menu item</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : topMenuData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No orders recorded yet today
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topMenuData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                  <YAxis type="category" dataKey="item" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} width={110} />
                  <Tooltip
                    formatter={(v) => [`${v} units`, 'Sold']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="sold" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 4 — Expiry Countdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Expiry Countdown</CardTitle>
            <p className="text-xs text-muted-foreground">Days remaining — act before spoilage loss</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : expiryCountdownData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No items expiring within 7 days
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {expiryCountdownData.map((item) => (
                  <div key={`${item.item}-${item.location}`} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate max-w-[60%]">
                        {item.item}
                        {item.location && <span className="text-muted-foreground ml-1">({item.location})</span>}
                      </span>
                      <span style={{ color: item.color }} className="font-bold">
                        {item.days === 0 ? 'TODAY' : `${item.days}d`}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (item.days / 7) * 100)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  Red = expires today/tomorrow · Orange = 2–3 days · Yellow = 4–7 days
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Alerts ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alerts & Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading alerts…</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-green-600 font-medium">✅ All clear — no active alerts</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    a.severity === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' :
                    a.severity === 'warning'  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900' :
                    'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900'
                  }`}
                >
                  <span className="text-lg mt-0.5">
                    {a.severity === 'critical' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${
                      a.severity === 'critical' ? 'text-red-700 dark:text-red-400' :
                      a.severity === 'warning'  ? 'text-yellow-700 dark:text-yellow-400' :
                      'text-blue-700 dark:text-blue-400'
                    }`}>{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.message}</p>
                  </div>
                  <Badge
                    variant={a.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="flex-shrink-0 text-xs"
                  >
                    {a.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
        <span>
          Data from Supabase · Auto-refreshes every 60s
        </span>
        <span>
          {lastRefresh.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })} last sync
        </span>
      </div>

    </div>
  );
}
