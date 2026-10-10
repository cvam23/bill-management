begin;
select plan(21);

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.test'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger@example.test');

insert into public.authorized_users (user_id)
values ('00000000-0000-0000-0000-000000000001');

-- Scratch space shared between roles inside this transaction (dropped on rollback).
create temp table test_ctx (k text primary key, v text);
grant all on test_ctx to public;

-- 1. anonymous cannot read services
set local role anon;
select throws_ok(
  $$select * from public.services$$,
  '42501',
  null,
  'anon cannot select from services'
);

-- 2. anonymous cannot call create_master_item
select throws_ok(
  $$select public.create_master_item('Needle', null, 'spare_part', 10)$$,
  '42501',
  null,
  'anon cannot execute create_master_item'
);
reset role;

-- 3. authenticated stranger is rejected
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_like(
  $$select public.create_master_item('Needle', null, 'spare_part', 10)$$,
  'not_authorized:%',
  'stranger gets not_authorized'
);
reset role;

-- 4. owner creates a spare part and a service with the same name; numbers differ
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into test_ctx
select 'spare_number', (public.create_master_item('Needle Set', null, 'spare_part', 10)).item_number;
insert into test_ctx
select 'service_number', (public.create_master_item('Needle Set', null, 'service', 20)).item_number;
select isnt(
  (select v from test_ctx where k = 'spare_number'),
  (select v from test_ctx where k = 'service_number'),
  'spare part and service with the same name get distinct item numbers'
);

-- 5. duplicate name within the same type (case and whitespace insensitive)
select throws_like(
  $$select public.create_master_item(' needle set ', null, 'spare_part', 10)$$,
  'duplicate_name:%',
  'duplicate spare part name is rejected'
);

-- 6. negative default price
select throws_like(
  $$select public.create_master_item('Negative Price', null, 'service', -1)$$,
  'invalid_price:%',
  'negative default price is rejected'
);

-- 7. inactive item cannot be billed and no bill is saved
insert into test_ctx
select 'item_id', (public.create_master_item('Hemming', null, 'service', 50)).id::text;
do $$
begin
  perform public.set_master_item_active((select v::uuid from test_ctx where k = 'item_id'), false);
  begin
    perform * from public.create_bill(
      '10000000-0000-0000-0000-000000000001'::uuid,
      date '2026-10-10',
      null,
      null,
      jsonb_build_array(jsonb_build_object(
        'service_id', (select v from test_ctx where k = 'item_id'),
        'quantity', 1,
        'unit_price', 50.00
      ))
    );
    insert into test_ctx values ('inactive_msg', 'NO ERROR');
  exception when others then
    insert into test_ctx values ('inactive_msg', sqlerrm);
  end;
end;
$$;
select ok(
  (select v from test_ctx where k = 'inactive_msg') like 'item_inactive:%'
    and (select count(*) from public.bills) = 0,
  'inactive item is rejected with item_inactive and no bill is saved'
);

-- 8. snapshots survive later master-item edits
do $$
declare
  item uuid := (select v::uuid from test_ctx where k = 'item_id');
  created record;
  snap_before record;
  snap_after record;
  bill_rows integer;
begin
  perform public.set_master_item_active(item, true);

  select * into created from public.create_bill(
    '10000000-0000-0000-0000-000000000002'::uuid,
    date '2026-10-10',
    null,
    null,
    jsonb_build_array(jsonb_build_object(
      'service_id', item::text,
      'quantity', 1,
      'unit_price', 50.00
    ))
  );
  insert into test_ctx values ('bill1_id', created.id::text);
  insert into test_ctx values ('bill1_number', created.bill_number);
  insert into test_ctx values ('bill1_total', created.grand_total::text);

  select item_name, unit_price into snap_before from public.bill_items where bill_id = created.id;

  perform public.update_master_item(item, 'Hemming Renamed', null, 'service', 99.00);
  perform public.set_master_item_active(item, false);

  select item_name, unit_price into snap_after from public.bill_items where bill_id = created.id;
  select count(*) into bill_rows from public.bills where id = created.id;

  insert into test_ctx values (
    'snapshot_ok',
    (
      created.bill_number like 'B-%'
      and snap_before.item_name = 'Hemming'
      and snap_before.unit_price = 50.00
      and snap_after.item_name = 'Hemming'
      and snap_after.unit_price = 50.00
      and bill_rows = 1
    )::text
  );
end;
$$;
select ok(
  (select v from test_ctx where k = 'snapshot_ok')::boolean,
  'bill number is B-%, and bill_items snapshot is unchanged after master item edit and deactivation'
);

-- 9. idempotent retry returns the original bill
do $$
declare
  retry record;
  item uuid := (select v::uuid from test_ctx where k = 'item_id');
begin
  select * into retry from public.create_bill(
    '10000000-0000-0000-0000-000000000002'::uuid,
    date '2026-10-10',
    null,
    null,
    jsonb_build_array(jsonb_build_object(
      'service_id', item::text,
      'quantity', 1,
      'unit_price', 75.00
    ))
  );
  insert into test_ctx values (
    'idempotent_ok',
    (
      retry.id::text = (select v from test_ctx where k = 'bill1_id')
      and retry.grand_total = (select v::numeric from test_ctx where k = 'bill1_total')
      and (select count(*) from public.bills) = 1
    )::text
  );
end;
$$;
select ok(
  (select v from test_ctx where k = 'idempotent_ok')::boolean,
  'retry with same idempotency key returns original id and grand_total; only one bill exists'
);

-- 10. further bills receive distinct numbers
do $$
declare
  a record;
  b record;
  item uuid;
begin
  item := (public.create_master_item('Buttons', null, 'spare_part', 5)).id;
  select * into a from public.create_bill(
    '10000000-0000-0000-0000-000000000003'::uuid,
    date '2026-10-10',
    null,
    null,
    jsonb_build_array(jsonb_build_object('service_id', item::text, 'quantity', 2, 'unit_price', 5.00))
  );
  select * into b from public.create_bill(
    '10000000-0000-0000-0000-000000000004'::uuid,
    date '2026-10-10',
    null,
    null,
    jsonb_build_array(jsonb_build_object('service_id', item::text, 'quantity', 3, 'unit_price', 5.00))
  );
  insert into test_ctx values (
    'numbers_ok',
    (
      a.bill_number <> b.bill_number
      and a.bill_number <> (select v from test_ctx where k = 'bill1_number')
      and b.bill_number <> (select v from test_ctx where k = 'bill1_number')
    )::text
  );
end;
$$;
select ok(
  (select v from test_ctx where k = 'numbers_ok')::boolean,
  'successive bills receive different bill numbers'
);

-- 11. empty lines
select throws_like(
  $$select * from public.create_bill(
    '10000000-0000-0000-0000-000000000005'::uuid,
    date '2026-10-10',
    null,
    null,
    '[]'::jsonb
  )$$,
  'no_line_items:%',
  'empty bill is rejected'
);

-- 12. bill numbers come from the sequence, not max()
select ok(
  pg_get_functiondef('public.create_bill(uuid,date,text,text,jsonb)'::regprocedure) like '%nextval(''public.bill_number_seq''%'
    and pg_get_functiondef('public.create_bill(uuid,date,text,text,jsonb)'::regprocedure) not like '%max(%',
  'create_bill uses bill_number_seq and does not use max()'
);

-- 13. zero quantity is rejected
insert into test_ctx
select 'probe_id', (public.create_master_item('Quantity Probe', null, 'service', 5)).id::text;
select throws_like(
  $$select * from public.create_bill(
    '10000000-0000-0000-0000-000000000006'::uuid,
    date '2026-10-10',
    null,
    null,
    jsonb_build_array(jsonb_build_object(
      'service_id', (select v from test_ctx where k = 'probe_id'),
      'quantity', 0,
      'unit_price', 5.00
    ))
  )$$,
  'invalid_quantity:%',
  'zero quantity is rejected with invalid_quantity'
);

-- 14. unknown service_id is rejected and no bill is left behind
select throws_like(
  $$select * from public.create_bill(
    '10000000-0000-0000-0000-000000000007'::uuid,
    date '2026-10-10',
    null,
    null,
    jsonb_build_array(jsonb_build_object(
      'service_id', '20000000-0000-0000-0000-000000000099',
      'quantity', 1,
      'unit_price', 5.00
    ))
  )$$,
  'item_not_found:%',
  'unknown service_id is rejected with item_not_found'
);
select is(
  (select count(*) from public.bills where idempotency_key = '10000000-0000-0000-0000-000000000007'),
  0::bigint,
  'unknown service_id leaves no bill row'
);

-- The balance triggers are deferred. Every create_bill call above that saves a bill has
-- finished, so fire the pending checks now (this runs after the failing create_bill cases,
-- because immediate checking would hide their real error behind bill_total_mismatch).
set constraints all immediate;

-- 15. direct writes to bill tables are denied for authenticated users
select throws_ok(
  $$insert into public.bills (bill_number, bill_date, grand_total, idempotency_key)
    values ('B-DIRECT', date '2026-10-10', 0, '10000000-0000-0000-0000-000000000008')$$,
  '42501',
  null,
  'authenticated user cannot insert directly into bills'
);

-- 16. anonymous users cannot read bill tables or execute write functions
reset role;
set local role anon;
select throws_ok(
  $$select * from public.bills$$,
  '42501',
  null,
  'anon cannot select from bills'
);
select throws_ok(
  $$select * from public.bill_items$$,
  '42501',
  null,
  'anon cannot select from bill_items'
);
select throws_ok(
  $$select * from public.create_bill(
    '10000000-0000-0000-0000-000000000009'::uuid,
    date '2026-10-10',
    null,
    null,
    '[]'::jsonb
  )$$,
  '42501',
  null,
  'anon cannot execute create_bill'
);
select throws_ok(
  $$select public.update_master_item('20000000-0000-0000-0000-000000000099'::uuid, 'Nope', null, 'service', 1)$$,
  '42501',
  null,
  'anon cannot execute update_master_item'
);
select throws_ok(
  $$select public.set_master_item_active('20000000-0000-0000-0000-000000000099'::uuid, false)$$,
  '42501',
  null,
  'anon cannot execute set_master_item_active'
);

reset role;
select * from finish();
rollback;
