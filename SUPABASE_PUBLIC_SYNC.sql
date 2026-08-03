-- 경고: 이 앱 주소를 아는 모든 사람이 기록과 첨부 파일을 읽고 수정·삭제할 수 있게 됩니다.
-- Supabase SQL Editor에서 한 번 실행하세요.

alter table public.records drop constraint if exists records_user_id_fkey;
alter table public.records alter column user_id drop not null;
alter table public.records disable row level security;

drop policy if exists "Users read only their records" on public.records;
drop policy if exists "Users add only their records" on public.records;
drop policy if exists "Users update only their records" on public.records;
drop policy if exists "Users delete only their records" on public.records;

update storage.buckets set public = true where id = 'record-files';
drop policy if exists "Users upload only their files" on storage.objects;
drop policy if exists "Users read only their files" on storage.objects;
drop policy if exists "Users delete only their files" on storage.objects;

create policy "Public uploads" on storage.objects for insert to anon with check (bucket_id = 'record-files');
create policy "Public reads" on storage.objects for select to anon using (bucket_id = 'record-files');
create policy "Public deletes" on storage.objects for delete to anon using (bucket_id = 'record-files');
