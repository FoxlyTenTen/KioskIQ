"use client";

import { ShoppingCart, TrendingUp, AlertTriangle, Wallet, BarChart3 } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { AIInsightPanel } from '@/components/AIInsightPanel';
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

const ordersData = [
  { date: 'Apr 15', actual: 120, predicted: 125 },
  { date: 'Apr 16', actual: 145, predicted: 142 },
  { date: 'Apr 17', actual: 168, predicted: 165 },
  { date: 'Apr 18', actual: 190, predicted: 188 },
  { date: 'Apr 19', actual: 210, predicted: 205 },
  { date: 'Apr 20', actual: 198, predicted: 195 },
  { date: 'Apr 21', actual: 215, predicted: null },
  { date: 'Apr 22', actual: null, predicted: 230 },
  { date: 'Apr 23', actual: null, predicted: 245 },
];

const lowStockItems = [
  {
    item: 'Fresh Tomatoes',
    current: 15,
    threshold: 50,
    status: 'critical',
    image:
      'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    item: 'Mozzarella Cheese',
    current: 8,
    threshold: 20,
    status: 'critical',
    image:
      'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    item: 'Lettuce',
    current: 25,
    threshold: 40,
    status: 'warning',
    image:
      'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    item: 'Chicken Breast',
    current: 30,
    threshold: 50,
    status: 'warning',
    image:
      'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=120&h=120&q=80',
  },
];

const expiryItems = [
  {
    item: 'Milk (2L)',
    expiry: '2 days',
    quantity: 12,
    image:
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    item: 'Ground Beef',
    expiry: '3 days',
    quantity: 8,
    image:
      'https://picsum.photos/seed/ground-beef/120/120',
  },
  {
    item: 'Fresh Basil',
    expiry: '1 day',
    quantity: 5,
    image:
      'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=120&h=120&q=80',
  },
];

const topSellingItems = [
  {
    item: 'Chicken Rice Bowl',
    sold: 86,
    revenue: 1032,
    image:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    item: 'Iced Latte',
    sold: 74,
    revenue: 888,
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    item: 'Nasi Lemak Set',
    sold: 69,
    revenue: 1035,
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    item: 'Classic Burger',
    sold: 57,
    revenue: 969,
    image:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    item: 'Caesar Salad',
    sold: 41,
    revenue: 615,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=120&h=120&q=80',
  },
];

const todaysRevenue = 4539;
const todaysOrders = 215;
const averageOrderValue = todaysRevenue / todaysOrders;

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">
          Real-time insights and AI-powered recommendations for your business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          title="Today's Orders"
          value={todaysOrders}
          icon={ShoppingCart}
          trend={{ value: '+8.5% from yesterday', positive: true }}
        />
        <KPICard
          title="Today's Revenue"
          value={`RM ${todaysRevenue.toLocaleString()}`}
          icon={Wallet}
          trend={{ value: '+12.2% from yesterday', positive: true }}
        />
        <KPICard
          title="Average Order Value"
          value={`RM ${averageOrderValue.toFixed(2)}`}
          icon={BarChart3}
          description="Revenue per completed order"
        />
        <KPICard
          title="Predicted Tomorrow"
          value={230}
          icon={TrendingUp}
          description="Expected orders for Apr 22"
        />
        <KPICard
          title="Low Stock Alerts"
          value={4}
          icon={AlertTriangle}
          trend={{ value: '2 critical items', positive: false }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Orders Trend (Actual vs Predicted)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ordersData}>
                <CartesianGrid key="grid-orders" strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  key="xaxis-orders"
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis key="yaxis-orders" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  key="tooltip-orders"
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend key="legend-orders" />
                <Line
                  key="actual-orders"
                  type="monotone"
                  dataKey="actual"
                  stroke="#010507"
                  strokeWidth={2}
                  name="Actual Orders"
                  dot={{ fill: '#010507' }}
                />
                <Line
                  key="predicted-orders"
                  type="monotone"
                  dataKey="predicted"
                  stroke="#BEC2FF"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Predicted Orders"
                  dot={{ fill: '#BEC2FF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <AIInsightPanel
          insights={[
            'Tomorrow lunch peak is expected to increase by 15%. Recommend scheduling 2 additional staff members.',
            'Fresh Tomatoes and Mozzarella are running critically low. Suggest immediate restock to avoid menu disruptions.',
            'Weekend demand pattern shows 20% higher orders on Saturdays. Consider early prep on Friday evenings.',
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Top-Selling Items (Today)</span>
              <Badge variant="secondary">Top 5</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellingItems.map((item, idx) => (
                <div key={item.item} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{idx + 1}</Badge>
                    <img
                      src={item.image}
                      alt={item.item}
                      className="h-10 w-10 rounded-md object-cover border"
                      loading="lazy"
                    />
                    <div>
                      <p className="text-sm font-medium">{item.item}</p>
                      <p className="text-xs text-muted-foreground">{item.sold} sold</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">RM {item.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Low Stock Alerts</span>
              <Badge variant="destructive">{lowStockItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.item}
                      className="h-10 w-10 rounded-md object-cover border"
                      loading="lazy"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.item}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.current} / {item.threshold} units
                      </p>
                    </div>
                  </div>
                  <Badge variant={item.status === 'critical' ? 'destructive' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items Near Expiry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiryItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.item}
                      className="h-10 w-10 rounded-md object-cover border"
                      loading="lazy"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.item}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} units</p>
                    </div>
                  </div>
                  <Badge variant="outline">{item.expiry}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
