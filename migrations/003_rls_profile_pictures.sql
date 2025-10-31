begin;

-- 0) Ensure the bucket exists (public read; change to false if you want private)
insert into storage.buckets (id, name, public)
values ('profile_pictures', 'profile_pictures', true)
on conflict (id) do nothing;

-- 1) READ: allow anyone to read objects from this bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'pp_read_any'
  ) then
    create policy "pp_read_any"
      on storage.objects
      for select
      using (bucket_id = 'profile_pictures');
  end if;
end$$;

-- 2) INSERT: only allow the authenticated user to upload to a folder named with their uid
--    e.g., path "00000000-0000-0000-0000-000000000000/filename.png"
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'pp_insert_own_folder'
  ) then
    create policy "pp_insert_own_folder"
      on storage.objects
      for insert
      with check (
        bucket_id = 'profile_pictures'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end$$;

-- 3) UPDATE: only if the user owns the object (and keeps it in their own folder)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'pp_update_own'
  ) then
    create policy "pp_update_own"
      on storage.objects
      for update
      using (
        bucket_id = 'profile_pictures'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'profile_pictures'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end$$;

-- 4) DELETE: only if the user owns the object
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'pp_delete_own'
  ) then
    create policy "pp_delete_own"
      on storage.objects
      for delete
      using (
        bucket_id = 'profile_pictures'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end$$;

commit;
