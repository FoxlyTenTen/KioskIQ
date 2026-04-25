import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

export async function POST() {
  const supabase = createServiceClient();
  const docs: { source_table: string; source_id: string; content: string; metadata: object }[] = [];

  // inventory_stock — include location so RAG answers are location-aware
  const { data: stock } = await supabase
    .from('inventory_stock')
    .select('id, item_name, current_qty, threshold_qty, status, unit, location_id');

  for (const row of stock ?? []) {
    docs.push({
      source_table: 'inventory_stock',
      source_id: row.id,
      content: `[Location: ${row.location_id ?? 'N/A'}] Item: ${row.item_name}. Current quantity: ${row.current_qty} ${row.unit}. Threshold: ${row.threshold_qty} ${row.unit}. Status: ${row.status}.`,
      metadata: row,
    });
  }

  // inventory_expiry
  const { data: expiry } = await supabase
    .from('inventory_expiry')
    .select('id, item_name, quantity, expiry_date, days_to_expiry, location_id');

  for (const row of expiry ?? []) {
    docs.push({
      source_table: 'inventory_expiry',
      source_id: row.id,
      content: `[Location: ${row.location_id ?? 'N/A'}] Item: ${row.item_name}. Quantity: ${row.quantity}. Expiry date: ${row.expiry_date}. Days to expiry: ${row.days_to_expiry}.`,
      metadata: row,
    });
  }

  // pos_orders (last 30 days)
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: orders } = await supabase
    .from('pos_orders')
    .select('id, order_id, ordered_at, total_amount, outlet_id')
    .gte('ordered_at', since);

  for (const row of orders ?? []) {
    docs.push({
      source_table: 'pos_orders',
      source_id: row.id,
      content: `[Location: ${row.outlet_id ?? 'N/A'}] Order ID: ${row.order_id}. Date: ${row.ordered_at}. Total: RM ${row.total_amount}.`,
      metadata: row,
    });
  }

  // pos_order_items
  const orderIds = (orders ?? []).map((o) => o.order_id);
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('pos_order_items')
      .select('id, order_id, item_name, qty, line_total')
      .in('order_id', orderIds);

    // Build outlet lookup for order items
    const outletByOrder = Object.fromEntries(
      (orders ?? []).map((o) => [o.order_id, o.outlet_id ?? 'N/A'])
    );

    for (const row of items ?? []) {
      docs.push({
        source_table: 'pos_order_items',
        source_id: row.id,
        content: `[Location: ${outletByOrder[row.order_id] ?? 'N/A'}] Order ${row.order_id} — Item: ${row.item_name}, Qty: ${row.qty}, Total: RM ${row.line_total}.`,
        metadata: row,
      });
    }
  }

  // pos_orders_daily (demand trends)
  const { data: daily } = await supabase
    .from('pos_orders_daily')
    .select('id, business_date, actual_orders, predicted_orders, location_id')
    .order('business_date', { ascending: false })
    .limit(90);

  for (const row of daily ?? []) {
    docs.push({
      source_table: 'pos_orders_daily',
      source_id: row.id,
      content: `[Location: ${row.location_id ?? 'N/A'}] Date: ${row.business_date}. Actual orders: ${row.actual_orders ?? 'N/A'}. Predicted orders: ${row.predicted_orders ?? 'N/A'}.`,
      metadata: row,
    });
  }

  // Generate embeddings in batches of 20
  let embedded = 0;
  const batchSize = 20;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const embeddings = await Promise.all(batch.map((d) => embed(d.content)));

    const rows = batch.map((doc, j) => ({
      source_table: doc.source_table,
      source_id: doc.source_id,
      content: doc.content,
      metadata: doc.metadata,
      embedding: embeddings[j],
    }));

    const { error } = await supabase
      .from('rag_documents')
      .upsert(rows, { onConflict: 'source_table,source_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    embedded += batch.length;
  }

  return NextResponse.json({ success: true, embedded });
}
