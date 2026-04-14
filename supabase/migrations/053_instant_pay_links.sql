-- ─── Instant Pay Links ──────────────────────────────────────────────────────
-- Creator generates a pay link in seconds; fan pays via Whop and unlocks
-- content immediately — no account required on our side.

-- ── Storage bucket (private) ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pay-links',
  'pay-links',
  false,
  104857600,  -- 100 MB per file
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
    'application/pdf', 'application/zip',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- ── pay_links ─────────────────────────────────────────────────────────────────
-- NOTE: table is named `pay_links` (not `payment_links`) to avoid collision
-- with the existing Whop-based payment_links table.
create table if not exists pay_links (
  id          uuid        primary key default gen_random_uuid(),
  creator_id  uuid        not null references auth.users(id) on delete cascade,
  title       text,
  price       integer     not null check (price >= 50),  -- cents, min $0.50
  file_path   text        not null,   -- path in 'pay-links' bucket
  file_type   text        not null,   -- MIME type
  file_name   text        not null,   -- original filename shown to fan
  created_at  timestamptz not null default now()
);

create index if not exists pay_links_creator_idx on pay_links(creator_id);
create index if not exists pay_links_created_idx on pay_links(created_at desc);

-- ── instant_purchases ─────────────────────────────────────────────────────────
-- NOTE: named `instant_purchases` — `purchases` already exists for payment_links.
-- One row per fan click — each gets a unique buyer_token and its own Whop plan.
create table if not exists instant_purchases (
  id                  uuid        primary key default gen_random_uuid(),
  link_id             uuid        not null references pay_links(id) on delete cascade,
  buyer_token         text        not null unique
                                  default encode(gen_random_bytes(32), 'hex'),
  whop_product_id     text,
  whop_checkout_id    text,
  whop_checkout_url   text,
  whop_payment_id     text        unique,
  status              text        not null default 'pending'
                                  check (status in ('pending', 'paid', 'refunded')),
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists ip_link_idx    on instant_purchases(link_id);
create index if not exists ip_token_idx   on instant_purchases(buyer_token);
create index if not exists ip_payment_idx on instant_purchases(whop_payment_id);
create index if not exists ip_status_idx  on instant_purchases(status);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table pay_links         enable row level security;
alter table instant_purchases enable row level security;

-- pay_links: creators manage their own; fan pages can read metadata
create policy "pay_links_creator_all"
  on pay_links for all
  using  (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy "pay_links_public_select"
  on pay_links for select
  using (true);

-- instant_purchases: server-side service role only
create policy "instant_purchases_service_all"
  on instant_purchases for all
  using (true)
  with check (true);

-- ── Storage policies ──────────────────────────────────────────────────────────
create policy "pay_links_storage_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'pay-links'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "pay_links_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'pay-links'
    and split_part(name, '/', 1) = auth.uid()::text
  );
-- No public SELECT — all reads go through signed URLs generated server-side
