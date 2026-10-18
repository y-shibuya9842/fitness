-- 一時的なユーザーと記録で RLS を検証し、最後にすべてロールバックする。
begin;
insert into auth.users (id) values
  ('0e06cd66-f526-459b-88c0-a272095d1671'),
  ('70537784-66d7-4199-bfe8-0e2c168a9ae3');
set local role authenticated;
select set_config('request.jwt.claim.sub', '0e06cd66-f526-459b-88c0-a272095d1671', true);
insert into public.training_records (user_id,id,data) values
  ('0e06cd66-f526-459b-88c0-a272095d1671','rls-test','{"id":"rls-test"}');
select public.import_legacy_data('[{"id":"rls-test"}]'::jsonb, '[]'::jsonb, null);
do $$
begin
  if (select count(*) from public.training_records where id='rls-test') <> 1 then
    raise exception 'Own record not visible or duplicate import';
  end if;
  begin
    insert into public.training_records (user_id,id,data) values
      ('70537784-66d7-4199-bfe8-0e2c168a9ae3','cross-user-test','{}');
    raise exception 'Cross-user insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '70537784-66d7-4199-bfe8-0e2c168a9ae3', true);
do $$
begin
  if exists (select 1 from public.training_records where id='rls-test') then
    raise exception 'Other user can read record';
  end if;
end $$;
rollback;
