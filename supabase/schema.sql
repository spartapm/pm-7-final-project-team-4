-- Pet Memory: 계정 1 = 반려동물 1, 리스트·기록은 계정에 귀속
-- Dashboard SQL Editor에 붙여넣고 Run 해도 됩니다.

create table if not exists public.accounts (
  id text primary key,
  login_at timestamptz,
  seeded_before boolean not null default false,
  seeded_after boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  account_id text primary key references public.accounts(id) on delete cascade,
  species text not null check (species in ('dog', 'cat')),
  name text not null,
  age int,
  photo text,
  journey text not null check (journey in ('before', 'after')),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_items (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  journey text not null check (journey in ('before', 'after')),
  title text not null,
  created_at timestamptz not null default now(),
  is_example boolean not null default false,
  draft jsonb
);

create index if not exists list_items_account_id_idx on public.list_items (account_id);

create table if not exists public.memories (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  item_id text not null,
  journey text not null check (journey in ('before', 'after')),
  title text not null,
  story text not null,
  date text not null,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_account_id_idx on public.memories (account_id);

alter table public.accounts enable row level security;
alter table public.pets enable row level security;
alter table public.list_items enable row level security;
alter table public.memories enable row level security;

drop policy if exists "accounts open" on public.accounts;
create policy "accounts open" on public.accounts for all using (true) with check (true);

drop policy if exists "pets open" on public.pets;
create policy "pets open" on public.pets for all using (true) with check (true);

drop policy if exists "list_items open" on public.list_items;
create policy "list_items open" on public.list_items for all using (true) with check (true);

drop policy if exists "memories open" on public.memories;
create policy "memories open" on public.memories for all using (true) with check (true);

grant all on public.accounts to anon, authenticated, service_role;
grant all on public.pets to anon, authenticated, service_role;
grant all on public.list_items to anon, authenticated, service_role;
grant all on public.memories to anon, authenticated, service_role;
