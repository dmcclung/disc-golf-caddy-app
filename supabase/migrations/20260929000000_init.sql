-- DG Caddy initial schema
-- Profiles (onboarding answers), entitlements (written only by the server),
-- throws (one row per analyzed video), and a private storage bucket for frames.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  skill_level text check (skill_level in ('new', 'casual', 'league', 'advanced', 'pro')),
  handedness text check (handedness in ('right', 'left')) default 'right',
  primary_throw text check (primary_throw in ('backhand', 'forehand', 'both')) default 'backhand',
  goals text[] not null default '{}',
  typical_distance_ft int,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Pro status mirrored from RevenueCat. Clients may read their own row but never write it.
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_pro boolean not null default false,
  product_id text,
  expires_at timestamptz,
  -- Lifetime analyses, counted server-side so deleting throws doesn't reset the free tier.
  analyses_used int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

create policy "entitlements: read own" on public.entitlements
  for select using (auth.uid() = user_id);

create table public.throws (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  throw_type text not null check (throw_type in ('backhand', 'forehand', 'putt', 'approach')),
  camera_angle text not null check (camera_angle in ('side', 'behind', 'front')),
  disc text,
  notes text,
  overall_score int not null,
  scores jsonb not null,       -- { footwork, reach_back, power_pocket, weight_shift, release, follow_through } each 1-10
  headline text not null,
  summary text not null,
  strengths text[] not null default '{}',
  faults jsonb not null default '[]',   -- [{ title, detail, severity, frame }]
  drills jsonb not null default '[]',   -- [{ name, how, reps }]
  focus_cue text not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  filming_tip text,
  frame_count int not null default 0,  -- frames stored at <user_id>/<throw_id>/<nn>.jpg
  key_frame int not null default 0,
  model text not null
);

create index throws_user_created_idx on public.throws (user_id, created_at desc);

alter table public.throws enable row level security;

-- Rows are created by the analyze-throw edge function (service role).
create policy "throws: read own" on public.throws
  for select using (auth.uid() = user_id);
create policy "throws: delete own" on public.throws
  for delete using (auth.uid() = user_id);

-- Create a profile row for every new user (including anonymous users).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.entitlements (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- Called by the analyze-throw edge function after a successful analysis.
create function public.increment_analyses(uid uuid)
returns int
language sql
security definer set search_path = ''
as $$
  insert into public.entitlements (user_id, analyses_used) values (uid, 1)
  on conflict (user_id) do update set analyses_used = public.entitlements.analyses_used + 1
  returning analyses_used;
$$;

revoke execute on function public.increment_analyses(uuid) from public, anon, authenticated;
grant execute on function public.increment_analyses(uuid) to service_role;

-- Explicit Data API grants. The project does not auto-expose new tables, so each role
-- gets only what it needs; RLS policies above still limit rows to the signed-in user.
-- Anonymous sign-ins use the `authenticated` role, so `anon` gets nothing.
grant usage on schema public to authenticated, service_role;
grant select, update on public.profiles to authenticated;
grant select on public.entitlements to authenticated;
grant select, delete on public.throws to authenticated;
grant all on public.profiles, public.entitlements, public.throws to service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Private bucket for sampled throw frames, laid out as <user_id>/<throw_id>/<nn>.jpg
insert into storage.buckets (id, name, public)
values ('throw-frames', 'throw-frames', false)
on conflict (id) do nothing;

create policy "throw-frames: read own" on storage.objects
  for select using (
    bucket_id = 'throw-frames' and (storage.foldername(name))[1] = auth.uid()::text
  );
