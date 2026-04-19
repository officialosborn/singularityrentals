-- ================================================================
--  SINGULARITY RENTALS — RUN THIS IN SUPABASE SQL EDITOR
--  Project: vkmsoseapbofplpegnku.supabase.co
--  Paste everything and click RUN
-- ================================================================

-- PROFILES: one row per user, auto-created on signup
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text default '',
  phone         text default '',
  role          text not null default 'tenant' check (role in ('landlord','tenant')),
  is_verified   boolean default false,
  is_admin      boolean default false,
  profile_photo text default null,
  created_at    timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- TRIGGER: auto-create profile when user registers
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'tenant')
  ) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- LISTINGS: properties posted by landlords
create table if not exists public.listings (
  id                uuid primary key default gen_random_uuid(),
  landlord_id       uuid not null references public.profiles(id) on delete cascade,
  title             text not null default '',
  description       text default '',
  type              text default '',
  address           text default '',
  neighbourhood     text default '',
  landmark          text default '',
  beds              int default 1,
  baths             int default 1,
  price             int not null default 0,
  advance_payment   int default 0,
  extra_fees        text default '',
  furnished         text default 'Unfurnished',
  availability_date text default 'Available Now',
  status            text default 'available' check (status in ('available','occupied','pending')),
  is_sold           boolean default false,
  photos            text[] default '{}',
  features          text[] default '{}',
  emoji             text default '🏠',
  contact_phone     text default '',
  contact_whatsapp  text default '',
  contact_email     text default '',
  lat               float default null,
  lng               float default null,
  created_at        timestamptz default now()
);
alter table public.listings enable row level security;
create policy "listings_select" on public.listings for select using (true);
create policy "listings_insert" on public.listings for insert with check (auth.uid() = landlord_id);
create policy "listings_update" on public.listings for update using (auth.uid() = landlord_id);
create policy "listings_delete" on public.listings for delete using (auth.uid() = landlord_id);

-- RENTAL REQUESTS: tenant requests a room, landlord approves/rejects
create table if not exists public.rental_requests (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  tenant_id      uuid not null references public.profiles(id) on delete cascade,
  landlord_id    uuid not null references public.profiles(id) on delete cascade,
  status         text default 'pending' check (status in ('pending','approved','rejected')),
  message        text default '',
  move_in_date   date default null,
  lease_duration text default '',
  created_at     timestamptz default now()
);
alter table public.rental_requests enable row level security;
create policy "requests_tenant_select"   on public.rental_requests for select using (auth.uid() = tenant_id);
create policy "requests_landlord_select" on public.rental_requests for select using (auth.uid() = landlord_id);
create policy "requests_tenant_insert"   on public.rental_requests for insert  with check (auth.uid() = tenant_id);
create policy "requests_landlord_update" on public.rental_requests for update  using (auth.uid() = landlord_id);

-- PAYMENTS: recorded each time a tenant pays rent
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid references public.profiles(id) on delete set null,
  listing_id  uuid references public.listings(id) on delete set null,
  amount      int not null default 0,
  fee         int default 0,
  total       int not null default 0,
  method      text default '',
  period      text default '',
  status      text default 'paid' check (status in ('paid','pending','failed')),
  txn_id      text default '',
  created_at  timestamptz default now()
);
alter table public.payments enable row level security;
create policy "payments_tenant_select"   on public.payments for select using (auth.uid() = tenant_id);
create policy "payments_landlord_select" on public.payments for select using (auth.uid() = landlord_id);
create policy "payments_insert"          on public.payments for insert  with check (auth.uid() = tenant_id);

-- MAINTENANCE REQUESTS: tenant reports issues, landlord resolves
create table if not exists public.maintenance_requests (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references public.listings(id) on delete cascade,
  tenant_id   uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  title       text not null default '',
  description text default '',
  category    text default 'Other' check (category in ('Plumbing','Electrical','Structural','Appliance','Security','Other')),
  priority    text default 'medium' check (priority in ('low','medium','high')),
  status      text default 'open' check (status in ('open','progress','resolved','closed')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.maintenance_requests enable row level security;
create policy "maint_tenant_select"   on public.maintenance_requests for select using (auth.uid() = tenant_id);
create policy "maint_landlord_select" on public.maintenance_requests for select using (auth.uid() = landlord_id);
create policy "maint_tenant_insert"   on public.maintenance_requests for insert  with check (auth.uid() = tenant_id);
create policy "maint_landlord_update" on public.maintenance_requests for update  using (auth.uid() = landlord_id);
create policy "maint_tenant_update"   on public.maintenance_requests for update  using (auth.uid() = tenant_id);

-- RATINGS: tenants rate landlords
create table if not exists public.ratings (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.profiles(id) on delete cascade,
  landlord_id         uuid not null references public.profiles(id) on delete cascade,
  listing_id          uuid references public.listings(id) on delete set null,
  overall_score       float default 0,
  score_payment       int default 0 check (score_payment between 0 and 5),
  score_care          int default 0 check (score_care between 0 and 5),
  score_communication int default 0 check (score_communication between 0 and 5),
  score_neighbours    int default 0 check (score_neighbours between 0 and 5),
  score_compliance    int default 0 check (score_compliance between 0 and 5),
  review_text         text default '',
  recommend           boolean default false,
  created_at          timestamptz default now()
);
alter table public.ratings enable row level security;
create policy "ratings_select" on public.ratings for select using (true);
create policy "ratings_insert" on public.ratings for insert  with check (auth.uid() = tenant_id);
create policy "ratings_update" on public.ratings for update  using (auth.uid() = tenant_id);

-- NOTIFICATIONS: in-app alerts for all users
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null default '',
  message    text not null default '',
  type       text default 'info' check (type in ('info','success','warning','payment','maintenance','request')),
  is_read    boolean default false,
  link       text default null,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "notif_select" on public.notifications for select using (auth.uid() = user_id);
create policy "notif_update" on public.notifications for update using (auth.uid() = user_id);
create policy "notif_insert" on public.notifications for insert  with check (true);

-- VERIFICATIONS: ID verification submissions
create table if not exists public.verifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  id_type      text default '',
  id_number    text default '',
  id_photo_url text default null,
  selfie_url   text default null,
  status       text default 'pending' check (status in ('pending','verified','rejected')),
  submitted_at timestamptz default now()
);
alter table public.verifications enable row level security;
create policy "verif_select" on public.verifications for select using (auth.uid() = user_id);
create policy "verif_insert" on public.verifications for insert  with check (auth.uid() = user_id);
create policy "verif_update" on public.verifications for update  using (true);

-- STORAGE BUCKET: stores all uploaded photos
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;
create policy "storage_read"   on storage.objects for select using (bucket_id = 'listings');
create policy "storage_insert" on storage.objects for insert with check (bucket_id = 'listings' and auth.role() = 'authenticated');
create policy "storage_update" on storage.objects for update using (bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage_delete" on storage.objects for delete using (bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]);

-- VERIFY EVERYTHING WAS CREATED
select
  (select count(*) from public.profiles)             as profiles,
  (select count(*) from public.listings)             as listings,
  (select count(*) from public.rental_requests)      as rental_requests,
  (select count(*) from public.payments)             as payments,
  (select count(*) from public.maintenance_requests) as maintenance,
  (select count(*) from public.ratings)              as ratings,
  (select count(*) from public.notifications)        as notifications,
  (select count(*) from public.verifications)        as verifications,
  '✅ All 8 tables created' as result;
