-- ============================================================
-- KioskIQ — Multi-Location + RAG Vector Store Migration
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- RAG: rag_documents table + match function
-- ============================================================

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

-- 1. Locations table
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

-- 2. Seed locations
insert into public.locations (location_id, location_name, address) values
  ('outlet-1', 'Mid Valley Food Court',  'Mid Valley Megamall, KL'),
  ('outlet-2', 'Sunway Pyramid Kiosk',   'Sunway Pyramid, Subang Jaya'),
  ('outlet-3', 'KLCC Food Corner',       'Suria KLCC, KL')
on conflict (location_id) do nothing;

-- 3. Add location_id to inventory_stock
alter table public.inventory_stock
  add column if not exists location_id text references public.locations(location_id) default 'outlet-1';
update public.inventory_stock set location_id = 'outlet-1' where location_id is null;

-- 4. Add location_id to inventory_expiry
alter table public.inventory_expiry
  add column if not exists location_id text references public.locations(location_id) default 'outlet-1';
update public.inventory_expiry set location_id = 'outlet-1' where location_id is null;

-- 5. Fix pos_orders_daily unique constraint to include location
--    (drop old unique constraint, add composite one)
alter table public.pos_orders_daily
  add column if not exists location_id text references public.locations(location_id) default 'outlet-1';
update public.pos_orders_daily set location_id = 'outlet-1' where location_id is null;

-- Drop old single-column unique constraint if it exists and add composite
do $$
begin
  begin
    alter table public.pos_orders_daily drop constraint pos_orders_daily_business_date_key;
  exception when others then null;
  end;
  begin
    alter table public.pos_orders_daily
      add constraint pos_orders_daily_business_date_location_key
      unique (business_date, location_id);
  exception when others then null;
  end;
end $$;

-- 6. Seed inventory_stock for outlet-2 and outlet-3
insert into public.inventory_stock (item_name, current_qty, threshold_qty, status, unit, location_id) values
  ('Noodles',        3.0,  5.0, 'critical', 'kg',   'outlet-2'),
  ('Shrimp',         2.0,  4.0, 'critical', 'kg',   'outlet-2'),
  ('Soy Sauce',     15.0,  5.0, 'ok',       'L',    'outlet-2'),
  ('Rice',          20.0, 10.0, 'ok',       'kg',   'outlet-2'),
  ('Tofu',           8.0, 10.0, 'warning',  'pcs',  'outlet-2'),
  ('Sesame Oil',     2.0,  3.0, 'warning',  'L',    'outlet-2'),
  ('Chicken Breast', 3.0,  5.0, 'critical', 'kg',   'outlet-3'),
  ('Mozzarella',     2.0,  3.0, 'warning',  'kg',   'outlet-3'),
  ('Lettuce',        5.0,  4.0, 'ok',       'kg',   'outlet-3'),
  ('Burger Buns',    1.0,  5.0, 'critical', 'pcs',  'outlet-3'),
  ('Ketchup',       10.0,  3.0, 'ok',       'L',    'outlet-3'),
  ('Ground Beef',    2.5,  4.0, 'critical', 'kg',   'outlet-3')
on conflict do nothing;

-- 7. Seed inventory_expiry for outlet-2 and outlet-3
insert into public.inventory_expiry (item_name, quantity, expiry_date, days_to_expiry, location_id) values
  ('Shrimp',         3.0, current_date + 1, 1, 'outlet-2'),
  ('Tofu',           8.0, current_date + 3, 3, 'outlet-2'),
  ('Chicken Breast', 3.0, current_date + 2, 2, 'outlet-3'),
  ('Burger Buns',    1.0, current_date + 5, 5, 'outlet-3'),
  ('Ground Beef',    2.5, current_date + 1, 1, 'outlet-3')
on conflict do nothing;

-- 8. Seed pos_orders_daily for outlet-2 and outlet-3
insert into public.pos_orders_daily (business_date, actual_orders, predicted_orders, location_id) values
  (current_date - 9, 88,  95,  'outlet-2'),
  (current_date - 8, 102, 98,  'outlet-2'),
  (current_date - 7, 79,  90,  'outlet-2'),
  (current_date - 6, 115, 105, 'outlet-2'),
  (current_date - 5, 121, 115, 'outlet-2'),
  (current_date - 4, 95,  100, 'outlet-2'),
  (current_date - 3, 88,  95,  'outlet-2'),
  (current_date - 2, 107, 100, 'outlet-2'),
  (current_date - 1, 98,  105, 'outlet-2'),
  (current_date,     null, 110, 'outlet-2'),
  (current_date - 9, 145, 155, 'outlet-3'),
  (current_date - 8, 162, 158, 'outlet-3'),
  (current_date - 7, 138, 148, 'outlet-3'),
  (current_date - 6, 178, 165, 'outlet-3'),
  (current_date - 5, 195, 185, 'outlet-3'),
  (current_date - 4, 155, 160, 'outlet-3'),
  (current_date - 3, 143, 150, 'outlet-3'),
  (current_date - 2, 168, 158, 'outlet-3'),
  (current_date - 1, 161, 165, 'outlet-3'),
  (current_date,     null, 170, 'outlet-3')
on conflict do nothing;

-- 9. Seed pos_orders for outlet-2 and outlet-3 (today)
insert into public.pos_orders (order_id, ordered_at, total_amount, outlet_id) values
  ('ORD-2-T01', now() - interval '1 hour',  32.00, 'outlet-2'),
  ('ORD-2-T02', now() - interval '2 hours', 18.50, 'outlet-2'),
  ('ORD-2-T03', now() - interval '3 hours', 45.00, 'outlet-2'),
  ('ORD-3-T01', now() - interval '1 hour',  55.00, 'outlet-3'),
  ('ORD-3-T02', now() - interval '2 hours', 27.00, 'outlet-3'),
  ('ORD-3-T03', now() - interval '3 hours', 38.50, 'outlet-3')
on conflict (order_id) do nothing;

insert into public.pos_order_items (order_id, item_name, qty, line_total) values
  ('ORD-2-T01', 'Noodle Soup',    2, 32.00),
  ('ORD-2-T02', 'Tofu Bowl',      1, 18.50),
  ('ORD-2-T03', 'Shrimp Fried Rice', 2, 45.00),
  ('ORD-3-T01', 'Classic Burger', 2, 42.00),
  ('ORD-3-T01', 'Iced Latte',     1, 13.00),
  ('ORD-3-T02', 'Caesar Salad',   1, 27.00),
  ('ORD-3-T03', 'Chicken Burger', 2, 38.50)
on conflict do nothing;

-- 10. Seed AI insights per location
insert into public.dashboard_ai_insights (insight_text, priority, is_active) values
  ('outlet-2: Noodles and Shrimp are critically low — reorder before lunch peak.', 4, true),
  ('outlet-3: Burger Buns are critically low. Weekend traffic expected to increase 20%.', 5, true)
on conflict do nothing;

-- Verify
select 'locations' as tbl, count(*) from public.locations
union all
select 'inventory_stock', count(*) from public.inventory_stock
union all
select 'inventory_expiry', count(*) from public.inventory_expiry
union all
select 'pos_orders_daily', count(*) from public.pos_orders_daily
union all
select 'pos_orders', count(*) from public.pos_orders
union all
select 'pos_order_items', count(*) from public.pos_order_items;
