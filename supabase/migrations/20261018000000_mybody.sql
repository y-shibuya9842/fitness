-- Supabase SQL Editor で実行。各ユーザーが自分のデータだけを操作できる。
create table if not exists public.training_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  primary key (user_id, id)
);
create table if not exists public.custom_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  primary key (user_id, id)
);
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  thresholds jsonb not null
);

alter table public.training_records enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.user_settings enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.training_records, public.custom_exercises, public.user_settings to authenticated;

drop policy if exists "own data" on public.training_records;
create policy "own data" on public.training_records for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own data" on public.custom_exercises;
create policy "own data" on public.custom_exercises for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own data" on public.user_settings;
create policy "own data" on public.user_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 旧データを一括移行。途中で失敗した場合はすべてロールバックされる。
create or replace function public.import_legacy_data(records jsonb, exercises jsonb, old_thresholds jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.training_records (user_id, id, data)
    select auth.uid(), item->>'id', item from jsonb_array_elements(records) item
    on conflict (user_id, id) do nothing;
  insert into public.custom_exercises (user_id, id, data)
    select auth.uid(), item->>'id', item from jsonb_array_elements(exercises) item
    on conflict (user_id, id) do nothing;
  if old_thresholds is not null and old_thresholds <> 'null'::jsonb then
    insert into public.user_settings (user_id, thresholds) values (auth.uid(), old_thresholds)
      on conflict (user_id) do nothing;
  end if;
end;
$$;
revoke all on function public.import_legacy_data(jsonb, jsonb, jsonb) from public;
grant execute on function public.import_legacy_data(jsonb, jsonb, jsonb) to authenticated;
