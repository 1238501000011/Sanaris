-- All fixtures are rolled back. No resident data or Auth users are created.
begin;
set local role service_role;
do $$
declare
  payload jsonb := '{"requestKey":"sanaris-validation-00000001","report":{"location":"TEST ONLY","category":"Other","description":"Temporary verification fixture","incidentAt":"2026-01-01T00:00:00.000Z"}}';
  first_result jsonb;
  duplicate jsonb;
  changed jsonb;
begin
  first_result := public.sanaris_service('submit', payload);
  duplicate := public.sanaris_service('submit', payload);
  if not (first_result->>'created')::boolean or (duplicate->>'created')::boolean or first_result->'item' <> duplicate->'item' then raise exception 'Idempotency failed'; end if;
  duplicate := public.sanaris_service('submit', jsonb_set(payload, '{report,location}', '"Different location"'));
  if duplicate->>'conflict' <> 'true' then raise exception 'Conflict detection failed'; end if;
  changed := public.sanaris_service('update', jsonb_build_object('id',first_result->'item'->>'id','status','Resolved'));
  if changed->>'status' <> 'Resolved' or jsonb_array_length(changed->'updates') <> 2 then raise exception 'Status/history failed'; end if;
  changed := public.sanaris_service('update', jsonb_build_object('id',first_result->'item'->>'id','status','Resolved'));
  if jsonb_array_length(changed->'updates') <> 2 then raise exception 'Duplicate history'; end if;
  if public.sanaris_service('rate','{"bucket":"submit","maximum":1}') <> 'true'::jsonb or public.sanaris_service('rate','{"bucket":"submit","maximum":1}') <> 'false'::jsonb then raise exception 'Rate limit failed'; end if;
  if has_table_privilege('anon','public.sanaris_reports','select') or has_table_privilege('authenticated','public.sanaris_reports','select') then raise exception 'Table is exposed'; end if;
  if has_function_privilege('anon','public.sanaris_service(text,jsonb)','execute') or has_function_privilege('authenticated','public.sanaris_service(text,jsonb)','execute') then raise exception 'RPC is exposed'; end if;
end;
$$;
rollback;
