import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location') ?? 'outlet-1';

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('status')
      .eq('location_id', locationId);

    if (error) throw error;

    const items = data ?? [];
    return NextResponse.json({
      ok:       items.filter(i => i.status === 'ok').length,
      warning:  items.filter(i => i.status === 'warning').length,
      critical: items.filter(i => i.status === 'critical').length,
      total:    items.length,
    }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[stock-status] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
