-- Supabase 대시보드의 SQL Editor에 이 전체 내용을 붙여 넣고 Run을 누르세요.
create table if not exists public.records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.records enable row level security;

create policy "Users read only their records"
on public.records for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users add only their records"
on public.records for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update only their records"
on public.records for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete only their records"
on public.records for delete to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('record-files', 'record-files', false)
on conflict (id) do nothing;

create policy "Users upload only their files"
on storage.objects for insert to authenticated
with check (bucket_id = 'record-files' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users read only their files"
on storage.objects for select to authenticated
using (bucket_id = 'record-files' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users delete only their files"
on storage.objects for delete to authenticated
using (bucket_id = 'record-files' and (storage.foldername(name))[1] = (select auth.uid()::text));

alter publication supabase_realtime add table public.records;
