create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table public.authorized_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.authorized_users enable row level security;

create or replace function public.is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.authorized_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_authorized() from public, anon;
grant execute on function public.is_authorized() to authenticated;

create sequence public.service_item_number_seq start with 1001;
create sequence public.bill_number_seq start with 1001;
revoke all on sequence public.service_item_number_seq from public, anon, authenticated;
revoke all on sequence public.bill_number_seq from public, anon, authenticated;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  item_number text not null unique,
  item_number_value bigint generated always as (item_number::bigint) stored,
  name text not null,
  description text,
  item_type text not null,
  default_price numeric(12,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_item_type_check check (item_type in ('service', 'spare_part')),
  constraint services_name_len check (char_length(name) between 1 and 100),
  constraint services_description_len check (description is null or char_length(description) <= 500),
  constraint services_price_check check (default_price >= 0)
);

create unique index services_type_name_unique
  on public.services (item_type, lower(btrim(name)));

create index services_item_number_trgm on public.services using gin (item_number gin_trgm_ops);
create index services_name_trgm on public.services using gin (name gin_trgm_ops);
create index services_description_trgm on public.services using gin (description gin_trgm_ops);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  bill_date date not null,
  customer_name text,
  customer_address text,
  grand_total numeric(12,2) not null,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  constraint bills_customer_name_len check (customer_name is null or char_length(customer_name) <= 120),
  constraint bills_customer_address_len check (customer_address is null or char_length(customer_address) <= 500),
  constraint bills_grand_total_check check (grand_total >= 0)
);

create index bills_bill_date_idx on public.bills (bill_date desc, created_at desc);
create index bills_bill_number_trgm on public.bills using gin (bill_number gin_trgm_ops);
create index bills_customer_name_trgm on public.bills using gin (customer_name gin_trgm_ops);

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  line_number integer not null,
  item_number text not null,
  item_name text not null,
  item_description text,
  item_type text not null,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  line_amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint bill_items_line_unique unique (bill_id, line_number),
  constraint bill_items_service_unique unique (bill_id, service_id),
  constraint bill_items_type_check check (item_type in ('service', 'spare_part')),
  constraint bill_items_quantity_check check (quantity >= 1 and quantity <= 9999),
  constraint bill_items_price_check check (unit_price >= 0 and line_amount >= 0),
  constraint bill_items_amount_check check (line_amount = quantity * unit_price)
);

create or replace function public.assert_bill_balanced()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target uuid;
  actual numeric(12,2);
  expected numeric(12,2);
  line_count integer;
begin
  if tg_table_name = 'bills' then
    target := new.id;
  else
    target := new.bill_id;
  end if;

  select grand_total into actual from public.bills where id = target;
  select coalesce(sum(line_amount), 0), count(*)
    into expected, line_count
  from public.bill_items
  where bill_id = target;

  if line_count < 1 or actual is distinct from expected then
    raise exception 'bill_total_mismatch: Saved bill total does not match its lines.';
  end if;
  return null;
end;
$$;

create constraint trigger bills_balanced
after insert on public.bills
deferrable initially deferred
for each row execute function public.assert_bill_balanced();

create constraint trigger bill_items_balanced
after insert on public.bill_items
deferrable initially deferred
for each row execute function public.assert_bill_balanced();

alter table public.services enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;

create policy services_select on public.services
  for select to authenticated
  using (public.is_authorized());

create policy bills_select on public.bills
  for select to authenticated
  using (public.is_authorized());

create policy bill_items_select on public.bill_items
  for select to authenticated
  using (public.is_authorized());

revoke all on public.authorized_users from public, anon, authenticated;
revoke all on public.services from public, anon, authenticated;
revoke all on public.bills from public, anon, authenticated;
revoke all on public.bill_items from public, anon, authenticated;
grant select on public.services, public.bills, public.bill_items to authenticated;

create or replace function public.require_authorized()
returns void
language plpgsql
set search_path = public
as $$
begin
  if not public.is_authorized() then
    raise exception 'not_authorized: You are not allowed to change this data.';
  end if;
end;
$$;

create or replace function public.clean_money(value numeric, code text)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
begin
  if value is null or value < 0 or value > 9999999999.99 or value <> round(value, 2) then
    raise exception '%', code || ': Enter a non-negative amount with at most two decimal places.';
  end if;
  return value;
end;
$$;

create or replace function public.clean_name(value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  cleaned text := btrim(coalesce(value, ''));
begin
  if cleaned = '' then
    raise exception 'name_required: Enter an item name.';
  end if;
  if char_length(cleaned) > 100 then
    raise exception 'name_too_long: Item name must be 100 characters or fewer.';
  end if;
  return cleaned;
end;
$$;

create or replace function public.clean_description(value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  cleaned text := nullif(btrim(coalesce(value, '')), '');
begin
  if cleaned is not null and char_length(cleaned) > 500 then
    raise exception 'description_too_long: Description must be 500 characters or fewer.';
  end if;
  return cleaned;
end;
$$;

create or replace function public.clean_item_type(value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if value is null or value not in ('service', 'spare_part') then
    raise exception 'invalid_item_type: Choose Service or Spare Part.';
  end if;
  return value;
end;
$$;

create or replace function public.create_master_item(
  p_name text,
  p_description text,
  p_item_type text,
  p_default_price numeric
)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_name text;
  cleaned_description text;
  cleaned_type text;
  cleaned_price numeric(12,2);
  created public.services;
begin
  perform public.require_authorized();
  cleaned_name := public.clean_name(p_name);
  cleaned_description := public.clean_description(p_description);
  cleaned_type := public.clean_item_type(p_item_type);
  cleaned_price := public.clean_money(p_default_price, 'invalid_price');

  insert into public.services (item_number, name, description, item_type, default_price)
  values (
    nextval('public.service_item_number_seq')::text,
    cleaned_name,
    cleaned_description,
    cleaned_type,
    cleaned_price
  )
  returning * into created;

  return created;
exception
  when unique_violation then
    raise exception 'duplicate_name: An item with this name already exists for this type.';
end;
$$;

create or replace function public.update_master_item(
  p_id uuid,
  p_name text,
  p_description text,
  p_item_type text,
  p_default_price numeric
)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_name text;
  cleaned_description text;
  cleaned_type text;
  cleaned_price numeric(12,2);
  updated public.services;
begin
  perform public.require_authorized();
  cleaned_name := public.clean_name(p_name);
  cleaned_description := public.clean_description(p_description);
  cleaned_type := public.clean_item_type(p_item_type);
  cleaned_price := public.clean_money(p_default_price, 'invalid_price');

  update public.services
  set name = cleaned_name,
      description = cleaned_description,
      item_type = cleaned_type,
      default_price = cleaned_price
  where id = p_id
  returning * into updated;

  if not found then
    raise exception 'item_not_found: That item no longer exists.';
  end if;

  return updated;
exception
  when unique_violation then
    raise exception 'duplicate_name: An item with this name already exists for this type.';
end;
$$;

create or replace function public.set_master_item_active(p_id uuid, p_is_active boolean)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.services;
begin
  perform public.require_authorized();

  update public.services
  set is_active = p_is_active
  where id = p_id
  returning * into updated;

  if not found then
    raise exception 'item_not_found: That item no longer exists.';
  end if;

  return updated;
end;
$$;

create or replace function public.create_bill(
  p_idempotency_key uuid,
  p_bill_date date,
  p_customer_name text,
  p_customer_address text,
  p_lines jsonb
)
returns table (
  id uuid,
  bill_number text,
  bill_date date,
  grand_total numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.bills;
  cleaned_customer_name text;
  cleaned_customer_address text;
  line jsonb;
  line_index integer := 0;
  line_service_id uuid;
  line_quantity numeric;
  line_unit_price numeric;
  line_amount numeric;
  service_row public.services;
  new_bill public.bills;
  computed_total numeric := 0;
  seen_service_ids uuid[] := '{}';
  max_money constant numeric := 9999999999.99;
begin
  perform public.require_authorized();

  select * into existing
  from public.bills
  where idempotency_key = p_idempotency_key;

  if found then
    id := existing.id;
    bill_number := existing.bill_number;
    bill_date := existing.bill_date;
    grand_total := existing.grand_total;
    return next;
    return;
  end if;

  if p_bill_date is null then
    raise exception 'bill_date_required: Choose a bill date.';
  end if;

  cleaned_customer_name := nullif(btrim(coalesce(p_customer_name, '')), '');
  cleaned_customer_address := nullif(btrim(coalesce(p_customer_address, '')), '');

  if cleaned_customer_name is not null and char_length(cleaned_customer_name) > 120 then
    raise exception 'customer_name_too_long: Customer name must be 120 characters or fewer.';
  end if;

  if cleaned_customer_address is not null and char_length(cleaned_customer_address) > 500 then
    raise exception 'customer_address_too_long: Customer address must be 500 characters or fewer.';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'no_line_items: Add at least one item.';
  end if;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    if nullif(btrim(coalesce(line->>'service_id', '')), '') is null then
      raise exception 'item_not_found: That item no longer exists.';
    end if;

    begin
      line_service_id := (line->>'service_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'item_not_found: That item no longer exists.';
    end;

    if line_service_id = any(seen_service_ids) then
      raise exception 'duplicate_line: Each item can appear only once on a bill.';
    end if;

    seen_service_ids := array_append(seen_service_ids, line_service_id);
  end loop;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    begin
      line_quantity := (line->>'quantity')::numeric;
    exception
      when invalid_text_representation then
        raise exception 'invalid_quantity: Quantity must be a whole number from 1 to 9999.';
    end;

    if line_quantity is null or line_quantity <> trunc(line_quantity) or line_quantity < 1 or line_quantity > 9999 then
      raise exception 'invalid_quantity: Quantity must be a whole number from 1 to 9999.';
    end if;

    begin
      line_unit_price := public.clean_money((line->>'unit_price')::numeric, 'invalid_unit_price');
    exception
      when invalid_text_representation then
        raise exception 'invalid_unit_price: Enter a non-negative amount with at most two decimal places.';
    end;

    line_amount := line_quantity * line_unit_price;

    if line_amount > max_money then
      raise exception 'invalid_unit_price: Enter a non-negative amount with at most two decimal places.';
    end if;

    if computed_total + line_amount > max_money then
      raise exception 'invalid_unit_price: Enter a non-negative amount with at most two decimal places.';
    end if;

    computed_total := computed_total + line_amount;
  end loop;

  insert into public.bills (
    bill_number,
    bill_date,
    customer_name,
    customer_address,
    grand_total,
    idempotency_key
  )
  values (
    'B-' || nextval('public.bill_number_seq')::text,
    p_bill_date,
    cleaned_customer_name,
    cleaned_customer_address,
    computed_total::numeric(12,2),
    p_idempotency_key
  )
  returning * into new_bill;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    line_index := line_index + 1;
    line_quantity := (line->>'quantity')::numeric;
    line_unit_price := public.clean_money((line->>'unit_price')::numeric, 'invalid_unit_price');

    begin
      line_service_id := (line->>'service_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'item_not_found: That item no longer exists.';
    end;

    select * into service_row
    from public.services
    where services.id = line_service_id
    for update;

    if not found then
      raise exception 'item_not_found: That item no longer exists.';
    end if;

    if not service_row.is_active then
      raise exception '%', format(
        'item_inactive: Item %s is inactive and cannot be billed.',
        service_row.item_number
      );
    end if;

    insert into public.bill_items (
      bill_id,
      service_id,
      line_number,
      item_number,
      item_name,
      item_description,
      item_type,
      quantity,
      unit_price,
      line_amount
    )
    values (
      new_bill.id,
      service_row.id,
      line_index,
      service_row.item_number,
      service_row.name,
      service_row.description,
      service_row.item_type,
      line_quantity::integer,
      line_unit_price,
      line_quantity * line_unit_price
    );
  end loop;

  id := new_bill.id;
  bill_number := new_bill.bill_number;
  bill_date := new_bill.bill_date;
  grand_total := new_bill.grand_total;
  return next;
exception
  when unique_violation then
    select * into existing
    from public.bills
    where idempotency_key = p_idempotency_key;

    if found then
      id := existing.id;
      bill_number := existing.bill_number;
      bill_date := existing.bill_date;
      grand_total := existing.grand_total;
      return next;
      return;
    end if;

    raise;
end;
$$;

revoke all on function public.require_authorized() from public, anon, authenticated;
revoke all on function public.clean_money(numeric, text) from public, anon, authenticated;
revoke all on function public.clean_name(text) from public, anon, authenticated;
revoke all on function public.clean_description(text) from public, anon, authenticated;
revoke all on function public.clean_item_type(text) from public, anon, authenticated;
revoke all on function public.create_master_item(text, text, text, numeric) from public, anon;
revoke all on function public.update_master_item(uuid, text, text, text, numeric) from public, anon;
revoke all on function public.set_master_item_active(uuid, boolean) from public, anon;
revoke all on function public.create_bill(uuid, date, text, text, jsonb) from public, anon;
grant execute on function public.create_master_item(text, text, text, numeric) to authenticated;
grant execute on function public.update_master_item(uuid, text, text, text, numeric) to authenticated;
grant execute on function public.set_master_item_active(uuid, boolean) to authenticated;
grant execute on function public.create_bill(uuid, date, text, text, jsonb) to authenticated;
