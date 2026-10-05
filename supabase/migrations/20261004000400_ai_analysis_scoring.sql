create table public.crane_submission_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  submission_id uuid unique references public.crane_submissions (id) on delete set null,
  outcome text not null check (outcome in ('accepted', 'rejected')),
  rejection_reason text check (rejection_reason in ('not_crane', 'low_confidence', 'master_reproduction')),
  created_at timestamptz not null default now(),
  check (
    (outcome = 'accepted' and submission_id is not null and rejection_reason is null)
    or (outcome = 'rejected' and submission_id is null and rejection_reason is not null)
  )
);

create index crane_submission_attempts_user_created_at_idx
  on public.crane_submission_attempts (user_id, created_at);

insert into public.crane_submission_attempts (user_id, submission_id, outcome, created_at)
select submission.user_id, submission.id, 'accepted', submission.created_at
from public.crane_submissions as submission;

alter table public.crane_submission_attempts enable row level security;
revoke all on table public.crane_submission_attempts from public, anon, authenticated;

create or replace function public.get_daily_submission_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.crane_submission_attempts as attempt
  where attempt.user_id = (select auth.uid())
    and attempt.created_at >= (date_trunc('day', statement_timestamp() at time zone 'UTC') at time zone 'UTC')
    and attempt.created_at < ((date_trunc('day', statement_timestamp() at time zone 'UTC') + interval '1 day') at time zone 'UTC');
$$;

create function public.finalize_crane_submission(
  p_user_id uuid,
  p_accepted boolean,
  p_rejection_reason text,
  p_image_path text,
  p_crane_type text,
  p_ai_confidence numeric,
  p_score bigint,
  p_score_breakdown jsonb
)
returns table (submissions_today integer, remaining_submissions integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  utc_day_start timestamptz := (date_trunc('day', statement_timestamp() at time zone 'UTC') at time zone 'UTC');
  current_count integer;
  saved_submission_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  if p_user_id is null or p_accepted is null then
    raise exception using errcode = '22023', message = 'invalid_submission_result';
  end if;

  if p_accepted then
    if p_rejection_reason is not null
      or p_image_path is null
      or p_crane_type is null or p_crane_type not in ('bird', 'construction', 'master_crane')
      or p_ai_confidence is null or p_ai_confidence < 0.7 or p_ai_confidence > 1
      or p_score is null or p_score < 0
      or p_score_breakdown is null or jsonb_typeof(p_score_breakdown) <> 'object' then
      raise exception using errcode = '22023', message = 'invalid_submission_result';
    end if;
  elsif p_rejection_reason is null or p_rejection_reason not in ('not_crane', 'low_confidence', 'master_reproduction')
    or p_image_path is not null
    or p_crane_type is not null
    or p_ai_confidence is not null
    or p_score is not null
    or p_score_breakdown is not null then
    raise exception using errcode = '22023', message = 'invalid_rejection_result';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select count(*)::integer
  into current_count
  from public.crane_submission_attempts as attempt
  where attempt.user_id = p_user_id
    and attempt.created_at >= utc_day_start
    and attempt.created_at < utc_day_start + interval '1 day';

  if current_count >= 3 then
    raise exception using errcode = 'P0001', message = 'daily_limit_reached';
  end if;

  if p_accepted then
    if p_image_path !~ ('^' || p_user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]jpg$')
      or not exists (
        select 1
        from storage.objects as stored_image
        where stored_image.bucket_id = 'crane-submissions'
          and stored_image.name = p_image_path
          and stored_image.metadata ->> 'mimetype' = 'image/jpeg'
      ) then
      raise exception using errcode = '22023', message = 'invalid_image_path';
    end if;

    insert into public.crane_submissions (
      user_id,
      image_url,
      crane_type,
      ai_confidence,
      score,
      score_breakdown
    ) values (
      p_user_id,
      p_image_path,
      p_crane_type,
      p_ai_confidence,
      p_score,
      p_score_breakdown
    ) returning id into saved_submission_id;

    insert into public.crane_submission_attempts (user_id, submission_id, outcome)
    values (p_user_id, saved_submission_id, 'accepted');
  else
    insert into public.crane_submission_attempts (user_id, outcome, rejection_reason)
    values (p_user_id, 'rejected', p_rejection_reason);
  end if;

  return query select current_count + 1, 2 - current_count;
end;
$$;

revoke all on function public.get_daily_submission_count() from public, anon, authenticated;
grant execute on function public.get_daily_submission_count() to authenticated;
revoke all on function public.submit_mock_crane(text) from public, anon, authenticated;
revoke all on function public.finalize_crane_submission(uuid, boolean, text, text, text, numeric, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_crane_submission(uuid, boolean, text, text, text, numeric, bigint, jsonb) to service_role;