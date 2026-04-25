import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ILMU uses OpenAI-compatible format
const glm = new OpenAI({
  apiKey: process.env.ILMU_API_KEY,
  baseURL: 'https://api.ilmu.ai/v1',
});

const OUTLET_IDS = ['outlet-1', 'outlet-2', 'outlet-3'];
const OUTLET_NAMES: Record<string, string> = {
  'outlet-1': 'Mid Valley Food Court',
  'outlet-2': 'Sunway Pyramid Kiosk',
  'outlet-3': 'KLCC Food Corner',
};

async function fetchLiveSummary(supabase: ReturnType<typeof createServiceClient>): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

  const [ordersRes, stockRes, expiryRes] = await Promise.all([
    supabase
      .from('pos_orders')
      .select('order_id, total_amount, outlet_id')
      .gte('ordered_at', `${today}T00:00:00`)
      .lt('ordered_at', `${tomorrow}T00:00:00`),
    supabase
      .from('inventory_stock')
      .select('item_name, current_qty, threshold_qty, status, unit, location_id'),
    supabase
      .from('inventory_expiry')
      .select('item_name, days_to_expiry, location_id')
      .lte('days_to_expiry', 5)
      .order('days_to_expiry', { ascending: true }),
  ]);

  const orders = ordersRes.data ?? [];
  const stock  = stockRes.data  ?? [];
  const expiry = expiryRes.data ?? [];

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const totalOrders  = orders.length;

  let lines = [
    `=== LIVE DASHBOARD SUMMARY (${today}) ===`,
    `All Outlets Combined:`,
    `  Today's orders: ${totalOrders}`,
    `  Today's revenue: RM ${totalRevenue.toFixed(2)}`,
    `  Avg order value: RM ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}`,
    '',
    'Per-Outlet Breakdown:',
  ];

  for (const id of OUTLET_IDS) {
    const outletOrders  = orders.filter(o => o.outlet_id === id);
    const outletRevenue = outletOrders.reduce((s, o) => s + Number(o.total_amount), 0);
    const critical      = stock.filter(s => s.location_id === id && s.status === 'critical');
    const warning       = stock.filter(s => s.location_id === id && s.status === 'warning');
    lines.push(
      `  ${OUTLET_NAMES[id]}:`,
      `    Orders: ${outletOrders.length}  Revenue: RM ${outletRevenue.toFixed(2)}`,
      `    Critical stock: ${critical.length} items${critical.length > 0 ? ' (' + critical.map(i => i.item_name).join(', ') + ')' : ''}`,
      `    Warning stock:  ${warning.length} items`,
    );
  }

  if (expiry.length > 0) {
    lines.push('', 'Expiring Soon:');
    for (const e of expiry) {
      lines.push(`  ${e.item_name} (${OUTLET_NAMES[e.location_id] ?? e.location_id}): ${e.days_to_expiry} day(s) left`);
    }
  }

  lines.push('=== END LIVE SUMMARY ===');
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  const supabase = createServiceClient();

  // 1. Fetch live KPI summary + embed query in parallel
  const [liveSummary, embeddingRes] = await Promise.all([
    fetchLiveSummary(supabase),
    openai.embeddings.create({ model: 'text-embedding-3-small', input: message }),
  ]);

  const queryEmbedding = embeddingRes.data[0].embedding;

  // 2. Retrieve relevant chunks via Supabase vector search
  const { data: chunks, error } = await supabase.rpc('match_rag_documents', {
    query_embedding: queryEmbedding,
    match_count: 6,
    match_threshold: 0.3,
  });

  if (error) {
    return new Response(`Error retrieving context: ${error.message}`, { status: 500 });
  }

  const context = (chunks ?? [])
    .map((c: { content: string; source_table: string }) => `[${c.source_table}] ${c.content}`)
    .join('\n');

  const systemPrompt = `You are KioskIQ's AI assistant helping F&B kiosk operators at Malaysian malls.

## Live data (fetched directly from database — always accurate)
${liveSummary}

## Additional context (from semantic search)
${context || 'No additional context found.'}

## Rules
- For ALL financial figures (revenue, order counts, averages): quote ONLY the exact numbers from the live data above. Never estimate.
- For stock quantities and expiry countdowns: use ONLY the live data above. Never guess.
- For general business overview, insights, or narrative questions: use the additional context.
- Keep answers short and action-oriented — owners are busy.
- Always use RM for Malaysian Ringgit amounts.`;

  // 3. Stream response from GLM via ILMU OpenAI-compatible endpoint
  const stream = await glm.chat.completions.create({
    model: 'ilmu-glm-5.1',
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
