create extension if not exists pgcrypto;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{5,63}$'),
  title text not null check (char_length(title) between 1 and 120),
  bpm numeric(6,2) not null default 120 check (bpm between 20 and 400),
  bar_offset_seconds numeric(10,3) not null default 0 check (bar_offset_seconds between -3600 and 3600),
  created_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  storage_path text not null unique,
  mime_type text not null check (mime_type like 'audio/%'),
  duration_seconds numeric(12,3) not null check (duration_seconds > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position_seconds numeric(12,3) not null check (position_seconds >= 0),
  author_name text not null check (char_length(author_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index tracks_project_sort_idx on public.tracks(project_id, sort_order, created_at);
create index comments_project_position_idx on public.comments(project_id, position_seconds, created_at);

alter table public.projects enable row level security;
alter table public.tracks enable row level security;
alter table public.comments enable row level security;

create policy "public can read projects" on public.projects for select to anon, authenticated using (true);
create policy "public can create projects" on public.projects for insert to anon, authenticated with check (true);
create policy "public can update project timing" on public.projects for update to anon, authenticated using (true) with check (true);
create policy "public can read tracks" on public.tracks for select to anon, authenticated using (true);
create policy "public can add tracks" on public.tracks for insert to anon, authenticated with check (true);
create policy "public can read comments" on public.comments for select to anon, authenticated using (true);
create policy "public can add comments" on public.comments for insert to anon, authenticated with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-tracks',
  'audio-tracks',
  true,
  52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-flac']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public can read audio" on storage.objects for select to anon, authenticated using (bucket_id = 'audio-tracks');
create policy "public can upload audio" on storage.objects for insert to anon, authenticated
with check (bucket_id = 'audio-tracks' and (storage.foldername(name))[1] is not null);

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tracks;
alter publication supabase_realtime add table public.comments;
