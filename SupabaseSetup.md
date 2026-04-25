# Supabase Setup — KioskIQ

Complete setup reference for the KioskIQ Supabase database.

---

## 1. Prerequisites

- A Supabase project created at [supabase.com](https://supabase.com)
- Access to **SQL Editor** in the Supabase Dashboard

---

## 2. Enable Extensions

Run this **first** before any schema SQL.

```sql
create extension if not exists pgcrypto;
create extension if not exists vector;
```

> `pgcrypto` — enables `gen_random_uuid()` for primary keys.  
> `vector` — enables pgvector for RAG embedding columns.

---

## 3. Schema

### 3.0 Locations (Multi-Location Support)

> Run this **before** the other tables so foreign key references resolve.

```sql
create table if not exists public.locations (
  location_id text primary key,
  location_name text not null,
  address text,
  created_at timestamptz not null default now()
);

alter table public.locations enable row level security;
drop policy if exists "locations_all" on public.locations;
create policy "locations_all" on public.locations
  for all to anon, authenticated using (true) with check (true);
```

### 3.1 Daily Orders Trend

```sql
create table if not exists public.pos_orders_daily (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  location_id text references public.locations(location_id) default 'outlet-1',
  actual_orders integer,
  predicted_orders integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pos_orders_daily_business_date_location_key unique (business_date, location_id),
  constraint pos_orders_daily_actual_non_negative
    check (actual_orders is null or actual_orders >= 0),
  constraint pos_orders_daily_predicted_non_negative
    check (predicted_orders is null or predicted_orders >= 0)
);

create index if not exists idx_pos_orders_daily_business_date
  on public.pos_orders_daily (business_date desc);
```

### 3.2 Inventory Stock

```sql
create table if not exists public.inventory_stock (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  location_id text references public.locations(location_id) default 'outlet-1',
  current_qty numeric(12,2) not null default 0,
  threshold_qty numeric(12,2) not null default 0,
  status text not null default 'ok',
  unit text not null default 'units',
  updated_at timestamptz not null default now(),
  constraint inventory_stock_status_valid
    check (status in ('critical', 'warning', 'ok')),
  constraint inventory_stock_current_non_negative
    check (current_qty >= 0),
  constraint inventory_stock_threshold_non_negative
    check (threshold_qty >= 0)
);

create index if not exists idx_inventory_stock_status
  on public.inventory_stock (status);
```

### 3.3 Inventory Expiry

```sql
create table if not exists public.inventory_expiry (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  location_id text references public.locations(location_id) default 'outlet-1',
  quantity numeric(12,2) not null default 0,
  expiry_date date not null,
  days_to_expiry integer,
  updated_at timestamptz not null default now(),
  constraint inventory_expiry_quantity_non_negative
    check (quantity >= 0)
);

create index if not exists idx_inventory_expiry_date
  on public.inventory_expiry (expiry_date asc);
```

### 3.4 AI Insights Panel

```sql
create table if not exists public.dashboard_ai_insights (
  id uuid primary key default gen_random_uuid(),
  insight_text text not null,
  priority integer not null default 100,
  is_active boolean not null default true,
  generated_at timestamptz not null default now()
);

create index if not exists idx_dashboard_ai_insights_active_priority
  on public.dashboard_ai_insights (is_active, priority);
```

### 3.5 POS Orders Header

```sql
create table if not exists public.pos_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  ordered_at timestamptz not null,
  total_amount numeric(12,2) not null,
  outlet_id text,
  created_at timestamptz not null default now(),
  constraint pos_orders_total_non_negative
    check (total_amount >= 0)
);

create index if not exists idx_pos_orders_ordered_at
  on public.pos_orders (ordered_at desc);
```

### 3.6 POS Order Line Items

```sql
create table if not exists public.pos_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.pos_orders(order_id) on delete cascade,
  item_name text not null,
  qty integer not null,
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint pos_order_items_qty_positive
    check (qty > 0),
  constraint pos_order_items_line_total_non_negative
    check (line_total >= 0)
);

create index if not exists idx_pos_order_items_order_id
  on public.pos_order_items (order_id);

create index if not exists idx_pos_order_items_item_name
  on public.pos_order_items (item_name);
```

---

## 4. Row Level Security (RLS)

Prototype-friendly open policies — tighten before production.

```sql
alter table public.pos_orders_daily enable row level security;
alter table public.inventory_stock enable row level security;
alter table public.inventory_expiry enable row level security;
alter table public.dashboard_ai_insights enable row level security;
alter table public.pos_orders enable row level security;
alter table public.pos_order_items enable row level security;

drop policy if exists "pos_orders_daily_all" on public.pos_orders_daily;
create policy "pos_orders_daily_all" on public.pos_orders_daily
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "inventory_stock_all" on public.inventory_stock;
create policy "inventory_stock_all" on public.inventory_stock
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "inventory_expiry_all" on public.inventory_expiry;
create policy "inventory_expiry_all" on public.inventory_expiry
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "dashboard_ai_insights_all" on public.dashboard_ai_insights;
create policy "dashboard_ai_insights_all" on public.dashboard_ai_insights
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "pos_orders_all" on public.pos_orders;
create policy "pos_orders_all" on public.pos_orders
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "pos_order_items_all" on public.pos_order_items;
create policy "pos_order_items_all" on public.pos_order_items
  for all to anon, authenticated using (true) with check (true);
```

---

## 5. Vector Embedding Columns (RAG)

### 5.1 Inline embedding columns (legacy — optional)

These add `embedding vector(1536)` columns directly to source tables. You can skip this section if using the dedicated `rag_documents` table (section 5.2).

```sql
alter table public.inventory_stock   add column if not exists embedding vector(1536);
alter table public.inventory_expiry  add column if not exists embedding vector(1536);
alter table public.pos_orders        add column if not exists embedding vector(1536);
alter table public.pos_order_items   add column if not exists embedding vector(1536);

create index if not exists idx_inventory_stock_embedding   on public.inventory_stock   using hnsw (embedding vector_cosine_ops);
create index if not exists idx_inventory_expiry_embedding  on public.inventory_expiry  using hnsw (embedding vector_cosine_ops);
create index if not exists idx_pos_orders_embedding        on public.pos_orders        using hnsw (embedding vector_cosine_ops);
create index if not exists idx_pos_order_items_embedding   on public.pos_order_items   using hnsw (embedding vector_cosine_ops);
```

### 5.2 `rag_documents` — central vector store (required for Sync button)

A single document table that holds embeddings for all source tables. The Sync button in the dashboard upserts into this table — duplicates are replaced via `(source_table, source_id)`.

```sql
create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id text not null,
  content text not null,
  metadata jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rag_documents_source_unique unique (source_table, source_id)
);

create index if not exists idx_rag_documents_embedding
  on public.rag_documents using hnsw (embedding vector_cosine_ops);

create index if not exists idx_rag_documents_source
  on public.rag_documents (source_table, source_id);

alter table public.rag_documents enable row level security;
drop policy if exists "rag_documents_all" on public.rag_documents;
create policy "rag_documents_all" on public.rag_documents
  for all to anon, authenticated using (true) with check (true);
```

### 5.3 `match_rag_documents` — vector similarity search function

Called by the RAG chat API to retrieve the top-k relevant chunks.

```sql
create or replace function public.match_rag_documents(
  query_embedding vector(1536),
  match_count int default 6,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  source_table text,
  source_id text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    source_table,
    source_id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from public.rag_documents
  where embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

---

## 6. Seed Data

Run in SQL Editor to populate all tables with realistic sample data.

```sql
-- locations (run first — other tables reference this)
insert into public.locations (location_id, location_name, address) values
  ('outlet-1', 'Mid Valley Food Court',  'Mid Valley Megamall, KL'),
  ('outlet-2', 'Sunway Pyramid Kiosk',   'Sunway Pyramid, Subang Jaya'),
  ('outlet-3', 'KLCC Food Corner',       'Suria KLCC, KL')
on conflict (location_id) do nothing;

-- pos_orders_daily (last 10 days, all 3 locations)
insert into public.pos_orders_daily (business_date, actual_orders, predicted_orders, location_id) values
  (current_date - 9, 198, 210, 'outlet-1'), (current_date - 8, 223, 215, 'outlet-1'),
  (current_date - 7, 187, 200, 'outlet-1'), (current_date - 6, 241, 225, 'outlet-1'),
  (current_date - 5, 265, 250, 'outlet-1'), (current_date - 4, 210, 220, 'outlet-1'),
  (current_date - 3, 195, 205, 'outlet-1'), (current_date - 2, 230, 220, 'outlet-1'),
  (current_date - 1, 218, 225, 'outlet-1'), (current_date,  null, 230, 'outlet-1'),
  (current_date - 9,  88,  95, 'outlet-2'), (current_date - 8, 102, 98, 'outlet-2'),
  (current_date - 7,  79,  90, 'outlet-2'), (current_date - 6, 115, 105,'outlet-2'),
  (current_date - 5, 121, 115, 'outlet-2'), (current_date - 4,  95, 100,'outlet-2'),
  (current_date - 3,  88,  95, 'outlet-2'), (current_date - 2, 107, 100,'outlet-2'),
  (current_date - 1,  98, 105, 'outlet-2'), (current_date,  null, 110, 'outlet-2'),
  (current_date - 9, 145, 155, 'outlet-3'), (current_date - 8, 162, 158,'outlet-3'),
  (current_date - 7, 138, 148, 'outlet-3'), (current_date - 6, 178, 165,'outlet-3'),
  (current_date - 5, 195, 185, 'outlet-3'), (current_date - 4, 155, 160,'outlet-3'),
  (current_date - 3, 143, 150, 'outlet-3'), (current_date - 2, 168, 158,'outlet-3'),
  (current_date - 1, 161, 165, 'outlet-3'), (current_date,  null, 170, 'outlet-3')
on conflict (business_date, location_id) do nothing;

-- inventory_stock (outlet-1)
insert into public.inventory_stock (item_name, current_qty, threshold_qty, status, unit, location_id) values
  ('Fresh Tomatoes',  2.5,  5.0, 'critical', 'kg',   'outlet-1'),
  ('Mozzarella',      1.2,  3.0, 'critical', 'kg',   'outlet-1'),
  ('Lettuce',         3.0,  4.0, 'warning',  'kg',   'outlet-1'),
  ('Chicken Breast',  4.5,  5.0, 'warning',  'kg',   'outlet-1'),
  ('Iced Latte Mix', 12.0, 10.0, 'ok',       'kg',   'outlet-1'),
  ('Rice',           25.0, 10.0, 'ok',       'kg',   'outlet-1')
on conflict do nothing;

-- inventory_stock (outlet-2)
insert into public.inventory_stock (item_name, current_qty, threshold_qty, status, unit, location_id) values
  ('Noodles',        3.0,  5.0, 'critical', 'kg',   'outlet-2'),
  ('Shrimp',         2.0,  4.0, 'critical', 'kg',   'outlet-2'),
  ('Soy Sauce',     15.0,  5.0, 'ok',       'L',    'outlet-2'),
  ('Rice',          20.0, 10.0, 'ok',       'kg',   'outlet-2'),
  ('Tofu',           8.0, 10.0, 'warning',  'pcs',  'outlet-2'),
  ('Sesame Oil',     2.0,  3.0, 'warning',  'L',    'outlet-2')
on conflict do nothing;

-- inventory_stock (outlet-3)
insert into public.inventory_stock (item_name, current_qty, threshold_qty, status, unit, location_id) values
  ('Chicken Breast', 3.0,  5.0, 'critical', 'kg',   'outlet-3'),
  ('Mozzarella',     2.0,  3.0, 'warning',  'kg',   'outlet-3'),
  ('Lettuce',        5.0,  4.0, 'ok',       'kg',   'outlet-3'),
  ('Burger Buns',    1.0,  5.0, 'critical', 'pcs',  'outlet-3'),
  ('Ketchup',       10.0,  3.0, 'ok',       'L',    'outlet-3'),
  ('Ground Beef',    2.5,  4.0, 'critical', 'kg',   'outlet-3')
on conflict do nothing;

-- inventory_expiry
insert into public.inventory_expiry (item_name, quantity, expiry_date, days_to_expiry, location_id) values
  ('Milk',           10.0, current_date + 2, 2, 'outlet-1'),
  ('Ground Beef',     5.0, current_date + 4, 4, 'outlet-1'),
  ('Fresh Basil',     2.0, current_date + 6, 6, 'outlet-1'),
  ('Shrimp',          3.0, current_date + 1, 1, 'outlet-2'),
  ('Tofu',            8.0, current_date + 3, 3, 'outlet-2'),
  ('Chicken Breast',  3.0, current_date + 2, 2, 'outlet-3'),
  ('Burger Buns',     1.0, current_date + 5, 5, 'outlet-3'),
  ('Ground Beef',     2.5, current_date + 1, 1, 'outlet-3')
on conflict do nothing;

-- dashboard_ai_insights
insert into public.dashboard_ai_insights (insight_text, priority) values
  ('Peak hours 12–2 PM — consider adding 2 extra staff on weekdays.', 1),
  ('Mozzarella and Fresh Tomatoes critically low. Reorder before weekend rush.', 2),
  ('Weekend orders are 18% higher — pre-prepare top 3 items on Friday evening.', 3),
  ('outlet-2: Noodles and Shrimp are critically low — reorder before lunch peak.', 4),
  ('outlet-3: Burger Buns critically low. Weekend traffic expected to increase 20%.', 5)
on conflict do nothing;

-- pos_orders (today, outlet-1)
insert into public.pos_orders (order_id, ordered_at, total_amount, outlet_id) values
  ('ORD-T01', now() - interval '2 hours', 42.50, 'outlet-1'),
  ('ORD-T02', now() - interval '3 hours', 21.00, 'outlet-1'),
  ('ORD-T03', now() - interval '4 hours', 63.00, 'outlet-1'),
  ('ORD-T04', now() - interval '5 hours', 18.50, 'outlet-1'),
  ('ORD-T05', now() - interval '6 hours', 35.00, 'outlet-1')
on conflict (order_id) do nothing;

-- pos_orders (today, outlet-2 & outlet-3)
insert into public.pos_orders (order_id, ordered_at, total_amount, outlet_id) values
  ('ORD-2-T01', now() - interval '1 hour',  32.00, 'outlet-2'),
  ('ORD-2-T02', now() - interval '2 hours', 18.50, 'outlet-2'),
  ('ORD-2-T03', now() - interval '3 hours', 45.00, 'outlet-2'),
  ('ORD-3-T01', now() - interval '1 hour',  55.00, 'outlet-3'),
  ('ORD-3-T02', now() - interval '2 hours', 27.00, 'outlet-3'),
  ('ORD-3-T03', now() - interval '3 hours', 38.50, 'outlet-3')
on conflict (order_id) do nothing;

-- pos_order_items
insert into public.pos_order_items (order_id, item_name, qty, line_total) values
  ('ORD-T01', 'Chicken Rice Bowl', 2, 28.00),
  ('ORD-T01', 'Iced Latte',        1, 14.50),
  ('ORD-T02', 'Nasi Lemak Set',    1, 21.00),
  ('ORD-T03', 'Classic Burger',    3, 63.00),
  ('ORD-T04', 'Caesar Salad',      1, 18.50),
  ('ORD-T05', 'Chicken Rice Bowl', 1, 14.00),
  ('ORD-T05', 'Iced Latte',        1, 14.50),
  ('ORD-T05', 'Fresh Basil Tea',   1,  6.50),
  ('ORD-2-T01', 'Noodle Soup',        2, 32.00),
  ('ORD-2-T02', 'Tofu Bowl',          1, 18.50),
  ('ORD-2-T03', 'Shrimp Fried Rice',  2, 45.00),
  ('ORD-3-T01', 'Classic Burger',     2, 42.00),
  ('ORD-3-T01', 'Iced Latte',         1, 13.00),
  ('ORD-3-T02', 'Caesar Salad',       1, 27.00),
  ('ORD-3-T03', 'Chicken Burger',     2, 38.50)
on conflict do nothing;
```

---

## 7. Next.js Client Setup

### Install

```bash
npm install @supabase/supabase-js
```

### Client utility — `lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-only — never import in client components
export function createServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
```

### Environment variables — `.env`

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Find these values in: **Supabase Dashboard → Project Settings → API**

> `SUPABASE_SERVICE_ROLE_KEY` is for server-side operations (embedding writes, admin queries). Never expose it to the browser.

---

## 8. Verification

Run these in SQL Editor to confirm everything is set up correctly.

```sql
-- Confirm all 7 tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'locations', 'pos_orders_daily', 'inventory_stock', 'inventory_expiry',
    'dashboard_ai_insights', 'pos_orders', 'pos_order_items'
  );

-- Confirm pgvector extension is enabled
select * from pg_extension where extname = 'vector';

-- Confirm embedding columns exist
select table_name, column_name, data_type
from information_schema.columns
where column_name = 'embedding'
  and table_schema = 'public';

-- Confirm seed data loaded
select 'locations'           as tbl, count(*) from public.locations
union all
select 'pos_orders_daily',          count(*) from public.pos_orders_daily
union all
select 'inventory_stock',           count(*) from public.inventory_stock
union all
select 'inventory_expiry',          count(*) from public.inventory_expiry
union all
select 'dashboard_ai_insights',     count(*) from public.dashboard_ai_insights
union all
select 'pos_orders',                count(*) from public.pos_orders
union all
select 'pos_order_items',           count(*) from public.pos_order_items;
```

---

## 9. Table Summary

| Table | Purpose | Multi-location | RAG-ready |
|---|---|---|---|
| `locations` | Outlet/kiosk registry | — | No |
| `pos_orders_daily` | Daily actual vs predicted order counts per location | `location_id` | No |
| `inventory_stock` | Current stock levels + low stock status per location | `location_id` | Yes |
| `inventory_expiry` | Near-expiry items per location | `location_id` | Yes |
| `dashboard_ai_insights` | AI-generated insight text for dashboard panel | — | No |
| `pos_orders` | POS order headers — revenue, AOV | `outlet_id` | Yes |
| `pos_order_items` | POS line items — top-selling items | via `pos_orders` | Yes |
| `rag_documents` | Central vector store — upserted by Sync button, queried by RAG chat | — | Core |

---

## 10. Multi-Location Migration (existing databases)

If you already have the 6-table schema and need to add multi-location support, run `supabase_multi_location.sql` (in the project root) in Supabase SQL Editor. It:
- Creates the `locations` table
- Adds `location_id` column to `inventory_stock`, `inventory_expiry`, `pos_orders_daily`
- Migrates existing rows to `outlet-1`
- Fixes the `pos_orders_daily` unique constraint to `(business_date, location_id)`
- Seeds outlet-2 and outlet-3 with inventory and order data
