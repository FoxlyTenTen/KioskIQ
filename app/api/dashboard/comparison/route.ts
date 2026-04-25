import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

    // Fetch all reference data in parallel
    const [locationsRes, allOrdersRes, allStockRes, allExpiryRes] = await Promise.all([
      supabase.from('locations').select('location_id, location_name').order('location_name'),
      supabase
        .from('pos_orders')
        .select('order_id, total_amount, outlet_id')
        .gte('ordered_at', `${today}T00:00:00`)
        .lt('ordered_at', `${tomorrow}T00:00:00`),
      supabase
        .from('inventory_stock')
        .select('location_id, status'),
      supabase
        .from('inventory_expiry')
        .select('location_id, days_to_expiry')
        .lte('days_to_expiry', 3),
    ]);

    const locations = locationsRes.data ?? [];
    const allOrders = allOrdersRes.data ?? [];
    const allStock = allStockRes.data ?? [];
    const allExpiry = allExpiryRes.data ?? [];

    const table = locations.map((loc) => {
      const orders = allOrders.filter((o) => o.outlet_id === loc.location_id);
      const todaysRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
      const todaysOrders = orders.length;
      const avgOrderValue = todaysOrders > 0 ? todaysRevenue / todaysOrders : 0;

      const stock = allStock.filter((s) => s.location_id === loc.location_id);
      const criticalCount = stock.filter((s) => s.status === 'critical').length;
      const warningCount = stock.filter((s) => s.status === 'warning').length;

      const expiringCount = allExpiry.filter((e) => e.location_id === loc.location_id).length;

      return {
        locationId: loc.location_id,
        locationName: loc.location_name,
        todaysOrders,
        todaysRevenue,
        avgOrderValue,
        criticalCount,
        warningCount,
        expiringCount,
      };
    });

    return NextResponse.json({ table }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('[dashboard/comparison] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
