"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { ShoppingCart, TrendingUp, AlertTriangle, Wallet, BarChart3 } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { AIInsightPanel } from '@/components/AIInsightPanel';
import { LocationSelector } from '@/components/inventory/LocationSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DashboardData {
  kpis: {
    todaysOrders: number;
    todaysRevenue: number;
    averageOrderValue: number;
    predictedTomorrow: number | null;
    lowStockCount: number;
    criticalCount: number;
  };
  chartData: { date: string; actual: number | null; predicted: number | null }[];
  insights: string[];
  topSellingItems: { item: string; sold: number; revenue: number }[];
  lowStockItems: { item_name: string; current_qty: number; threshold_qty: number; status: string; unit: string }[];
  expiryItems: { item_name: string; quantity: number; expiry_date: string; days_to_expiry: number }[];
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Dashboard API error: ${r.status}`);
  return r.json();
};

export default function DashboardOverview() {
  const [selectedLocation, setSelectedLocation] = useState('outlet-1');
  const { data, isLoading: loading, error } = useSWR<DashboardData>(
    `/api/dashboard?location=${selectedLocation}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load dashboard data</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <p className="text-xs text-muted-foreground">Check the terminal for Supabase error details</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const aov = kpis?.averageOrderValue ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights and AI-powered recommendations for your business
          </p>
        </div>
        <LocationSelector
          selectedLocation={selectedLocation}
          onSelect={setSelectedLocation}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          title="Today's Orders"
          value={loading ? '—' : (kpis?.todaysOrders ?? 0)}
          icon={ShoppingCart}
          trend={{ value: 'Live from POS', positive: true }}
        />
        <KPICard
          title="Today's Revenue"
          value={loading ? '—' : `RM ${(kpis?.todaysRevenue ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Wallet}
          trend={{ value: 'Live from POS', positive: true }}
        />
        <KPICard
          title="Average Order Value"
          value={loading ? '—' : `RM ${aov.toFixed(2)}`}
          icon={BarChart3}
          description="Revenue per completed order"
        />
        <KPICard
          title="Predicted Tomorrow"
          value={loading ? '—' : (kpis?.predictedTomorrow ?? 'N/A')}
          icon={TrendingUp}
          description="Expected orders tomorrow"
        />
        <KPICard
          title="Low Stock Alerts"
          value={loading ? '—' : (kpis?.lowStockCount ?? 0)}
          icon={AlertTriangle}
          trend={{ value: `${kpis?.criticalCount ?? 0} critical`, positive: false }}
        />
      </div>

      {/* Chart + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Orders Trend (Actual vs Predicted)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Loading chart data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.chartData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#010507"
                    strokeWidth={2}
                    name="Actual Orders"
                    dot={{ fill: '#010507' }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#BEC2FF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Predicted Orders"
                    dot={{ fill: '#BEC2FF' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <AIInsightPanel insights={loading ? ['Loading insights...'] : (data?.insights ?? [])} />
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Top-Selling Items (Today)</span>
              <Badge variant="secondary">Top {data?.topSellingItems.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (data?.topSellingItems.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded today yet.</p>
            ) : (
              <div className="space-y-3">
                {data!.topSellingItems.map((item, idx) => (
                  <div key={item.item} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{idx + 1}</Badge>
                      <div>
                        <p className="text-sm font-medium">{item.item}</p>
                        <p className="text-xs text-muted-foreground">{item.sold} sold</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">RM {item.revenue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Low Stock Alerts</span>
              <Badge variant="destructive">{data?.lowStockItems.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (data?.lowStockItems.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">All stock levels are healthy.</p>
            ) : (
              <div className="space-y-3">
                {data!.lowStockItems.map((item) => (
                  <div key={item.item_name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.current_qty} / {item.threshold_qty} {item.unit}
                      </p>
                    </div>
                    <Badge variant={item.status === 'critical' ? 'destructive' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Near Expiry */}
        <Card>
          <CardHeader>
            <CardTitle>Items Near Expiry</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (data?.expiryItems.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No items near expiry.</p>
            ) : (
              <div className="space-y-3">
                {data!.expiryItems.map((item) => (
                  <div key={item.item_name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} units</p>
                    </div>
                    <Badge variant="outline">
                      {item.days_to_expiry != null
                        ? `${item.days_to_expiry} day${item.days_to_expiry !== 1 ? 's' : ''}`
                        : new Date(item.expiry_date).toLocaleDateString('en-MY')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
