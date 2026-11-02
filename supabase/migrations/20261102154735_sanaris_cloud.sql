-- Only the Edge Function's server credential may access application records.
create table public.sanaris_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.sanaris_reports (
  id text primary key,
  request_key text not null unique,
  created_at timestamptz not null default now(),
  document jsonb not null,
  check (id ~ '^SAN-[0-9]{4}-[A-F0-9]{24}$'),
  check (length(request_key) between 16 and 80),
  check (document->>'id' is not null and document->>'id' = id),
  check (document->>'status' is not null and document->>'status' in ('Submitted','Under review','In progress','Resolved')),
  check (document->>'location' is not null and length(document->>'location') between 1 and 160),
  check (document->>'description' is not null and length(document->>'description') between 10 and 1500),
  check (document->>'category' is not null and document->>'category' in ('Amplified music','Construction','Vehicle noise','Gathering','Other'))
);
create index sanaris_reports_created on public.sanaris_reports(created_at desc, id);
create table public.sanaris_revoked_tokens (token_hash text primary key, created_at timestamptz not null default now());
create table public.sanaris_rate_limits (bucket text primary key, minute timestamptz not null, hits integer not null);
alter table public.sanaris_admins enable row level security;
alter table public.sanaris_reports enable row level security;
alter table public.sanaris_revoked_tokens enable row level security;
alter table public.sanaris_rate_limits enable row level security;
revoke all on public.sanaris_admins, public.sanaris_reports, public.sanaris_revoked_tokens, public.sanaris_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.sanaris_admins, public.sanaris_reports, public.sanaris_revoked_tokens, public.sanaris_rate_limits to service_role;

create function public.sanaris_service(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  result jsonb;
  report jsonb;
  reference text;
  inserted integer;
  hits integer;
  stamp timestamptz := clock_timestamp();
begin
  case action
  when 'health' then return 'true'::jsonb;
  when 'authorize' then
    return to_jsonb(exists(select 1 from public.sanaris_admins where user_id = (payload->>'userId')::uuid)
      and not exists(select 1 from public.sanaris_revoked_tokens where token_hash = payload->>'hash'));
  when 'revoke' then
    -- Retain revoked hashes; never re-enable an otherwise valid token by expiring this record.
    insert into public.sanaris_revoked_tokens(token_hash) values (payload->>'hash') on conflict do nothing;
    return 'true'::jsonb;
  when 'rate' then
    if payload->>'bucket' not in ('login','submit','track') then raise exception 'Invalid bucket'; end if;
    insert into public.sanaris_rate_limits as limits(bucket, minute, hits)
    values (payload->>'bucket', date_trunc('minute', stamp), 1)
    on conflict (bucket) do update set minute = excluded.minute,
      hits = case when limits.minute = excluded.minute then limits.hits + 1 else 1 end
    returning limits.hits into hits;
    return to_jsonb(hits <= (payload->>'maximum')::int);
  when 'list' then
    select coalesce(jsonb_agg(document order by created_at desc, id), '[]'::jsonb) into result from public.sanaris_reports;
    return result;
  when 'find' then
    select document into result from public.sanaris_reports where id = payload->>'id';
    return result;
  when 'submit' then
    report := payload->'report';
    reference := 'SAN-' || to_char(stamp at time zone 'Asia/Manila', 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));
    result := report || jsonb_build_object('id', reference, 'status', 'Submitted', 'createdAt', stamp,
      'updates', jsonb_build_array(jsonb_build_object('status','Submitted','at',stamp)));
    insert into public.sanaris_reports(id,request_key,document) values(reference,payload->>'requestKey',result) on conflict(request_key) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 0 then
      select document into result from public.sanaris_reports where request_key = payload->>'requestKey';
      if result->>'location' is distinct from report->>'location' or result->>'description' is distinct from report->>'description'
        or result->>'category' is distinct from report->>'category' or result->>'incidentAt' is distinct from report->>'incidentAt' then
        return '{"conflict":true}'::jsonb;
      end if;
    end if;
    return jsonb_build_object('item',result,'created',inserted = 1);
  when 'update' then
    select document into result from public.sanaris_reports where id = payload->>'id' for update;
    if result is null then return null; end if;
    if result->>'status' <> payload->>'status' then
      result := result || jsonb_build_object('status',payload->>'status','updates',
        (result->'updates') || jsonb_build_array(jsonb_build_object('status',payload->>'status','at',stamp)));
      update public.sanaris_reports set document = result where id = payload->>'id';
    end if;
    return result;
  else raise exception 'Unknown operation';
  end case;
end;
$$;
revoke all on function public.sanaris_service(text,jsonb) from public, anon, authenticated;
grant execute on function public.sanaris_service(text,jsonb) to service_role;
