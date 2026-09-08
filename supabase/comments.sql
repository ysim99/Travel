-- Run in the Supabase SQL Editor as the project database administrator.
-- Keep the final share_token result private; it grants read and comment access.
-- Re-running preserves existing comments and the existing token hash.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists shared_comments_private;
revoke all on schema shared_comments_private from public, anon, authenticated;

create table if not exists shared_comments_private.trip_shares (
  trip_id text primary key,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  active boolean not null default true
);

create table if not exists shared_comments_private.trip_events (
  trip_id text not null references shared_comments_private.trip_shares(trip_id),
  event_id text not null,
  primary key (trip_id, event_id)
);

create table if not exists shared_comments_private.comments (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  event_id text not null,
  display_name text not null check (
    char_length(display_name) between 1 and 40
    and display_name = regexp_replace(display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  ),
  body text not null check (
    char_length(body) between 1 and 300
    and body = regexp_replace(body, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  ),
  created_at timestamptz not null default now(),
  foreign key (trip_id, event_id)
    references shared_comments_private.trip_events(trip_id, event_id)
);

create index if not exists comments_trip_event_created_idx
  on shared_comments_private.comments (trip_id, event_id, created_at, id);

alter table shared_comments_private.trip_shares enable row level security;
alter table shared_comments_private.trip_events enable row level security;
alter table shared_comments_private.comments enable row level security;
revoke all on all tables in schema shared_comments_private from public, anon, authenticated;

-- These two RPCs are the only browser-accessible entry points. The owner can
-- read private tables; callers cannot. All relations/functions are qualified.
create or replace function public.get_trip_comments(share_token_input text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_trip_id text;
  result jsonb;
begin
  if share_token_input is null or share_token_input !~ '^[A-Za-z0-9_-]{12,128}$' then
    raise sqlstate 'PT404' using message = 'Trip not found.';
  end if;

  select trip.trip_id into requested_trip_id
  from shared_comments_private.trip_shares as trip
  where trip.token_hash = extensions.digest(share_token_input, 'sha256')
    and trip.active;

  if not found then
    raise sqlstate 'PT404' using message = 'Trip not found.';
  end if;

  -- A JSON array is one RPC result, avoiding the API's default row limit.
  -- The per-event bound also protects reads from oversized administrative imports.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', bounded.id,
    'eventId', bounded.event_id,
    'displayName', bounded.display_name,
    'body', bounded.body,
    'createdAt', bounded.created_at
  ) order by bounded.created_at, bounded.id), '[]'::jsonb)
  into result
  from (
    select comment.*, row_number() over (
      partition by comment.event_id order by comment.created_at, comment.id
    ) as comment_number
    from shared_comments_private.comments as comment
    join shared_comments_private.trip_events as event
      on event.trip_id = comment.trip_id and event.event_id = comment.event_id
    where comment.trip_id = requested_trip_id
  ) as bounded
  where bounded.comment_number <= 200;

  return result;
end;
$$;

create or replace function public.add_trip_comment(
  share_token_input text,
  event_id_input text,
  display_name_input text,
  body_input text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_trip_id text;
  clean_name text;
  clean_body text;
begin
  if share_token_input is null or share_token_input !~ '^[A-Za-z0-9_-]{12,128}$' then
    raise sqlstate 'PT404' using message = 'Trip not found.';
  end if;

  select trip.trip_id into requested_trip_id
  from shared_comments_private.trip_shares as trip
  where trip.token_hash = extensions.digest(share_token_input, 'sha256')
    and trip.active;

  if not found then
    raise sqlstate 'PT404' using message = 'Trip not found.';
  end if;

  clean_name := regexp_replace(display_name_input, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  clean_body := regexp_replace(body_input, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if clean_name is null or char_length(clean_name) not between 1 and 40
    or clean_body is null or char_length(clean_body) not between 1 and 300 then
    raise sqlstate 'PT400' using message = 'A name (1-40) and comment (1-300) are required.';
  end if;

  -- Serialize writes to each registered section so concurrent submissions
  -- cannot bypass the 200-comment limit. Unknown event IDs cannot be inserted.
  perform 1 from shared_comments_private.trip_events as event
  where event.trip_id = requested_trip_id and event.event_id = event_id_input
  for update;
  if not found then
    raise sqlstate 'PT404' using message = 'Itinerary section not found.';
  end if;

  if (select count(*) from shared_comments_private.comments as comment
      where comment.trip_id = requested_trip_id and comment.event_id = event_id_input) >= 200 then
    raise sqlstate 'PT409' using message = 'This section has reached its comment limit.';
  end if;

  insert into shared_comments_private.comments (trip_id, event_id, display_name, body)
  values (requested_trip_id, event_id_input, clean_name, clean_body);

  return public.get_trip_comments(share_token_input);
end;
$$;

revoke all on function public.get_trip_comments(text) from public, anon, authenticated;
revoke all on function public.add_trip_comment(text, text, text, text) from public, anon, authenticated;
grant execute on function public.get_trip_comments(text) to anon, authenticated;
grant execute on function public.add_trip_comment(text, text, text, text) to anon, authenticated;

commit;

-- Generate 256 random bits on the database server. Only the SHA-256 hash is
-- stored. The plaintext token appears once in this private SQL result, never
-- in a public function, table, RAISE message, or checked-in configuration.
with candidate as materialized (
  select encode(extensions.gen_random_bytes(32), 'hex') as share_token
), new_share as (
  insert into shared_comments_private.trip_shares (trip_id, token_hash)
  select 'dallas-2026', extensions.digest(candidate.share_token, 'sha256') from candidate
  on conflict (trip_id) do nothing
  returning trip_id
), target_trip as (
  select trip_id from new_share
  union
  select trip_id from shared_comments_private.trip_shares where trip_id = 'dallas-2026'
), registered_events as (
  insert into shared_comments_private.trip_events (trip_id, event_id)
  select target_trip.trip_id, itinerary.event_id
  from target_trip cross join (values
    ('arrival'), ('home-sat-am'), ('in-n-out'), ('fort-worth'), ('bowling'),
    ('home-sat-pm'), ('truckyard'), ('morning-workout'), ('home-sun'),
    ('bucees'), ('winstar'), ('hutchins'), ('karaoke'), ('home-drinks'),
    ('tex-mex'), ('att-discovery'), ('coffee'), ('las-colinas')
  ) as itinerary(event_id)
  on conflict (trip_id, event_id) do nothing
  returning event_id
)
select
  case when exists (select 1 from new_share) then candidate.share_token else null end as share_token,
  case when exists (select 1 from new_share)
    then 'Save this token privately now. Share your site URL with #trip= followed by this token.'
    else 'Already configured. Existing token and comments preserved; use your saved link.'
  end as setup_note,
  (select count(*) from registered_events) as newly_registered_sections
from candidate;
