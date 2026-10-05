alter table public.crane_submission_attempts
  add column image_url text,
  add column image_hidden boolean not null default false,
  add constraint rejected_attempt_image_only check (image_url is null or outcome = 'rejected');

create or replace function public.finalize_crane_submission(
  p_user_id uuid,
  p_accepted boolean,
  p_rejection_reason text,
  p_image_path text,
  p_crane_type text,
  p_ai_confidence numeric,
  p_score bigint,
  p_score_breakdown jsonb
)
returns table (submission_id uuid, submissions_today integer, remaining_submissions integer)
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
      or p_crane_type is null or p_crane_type not in ('bird', 'construction', 'artwork', 'master_crane')
      or p_ai_confidence is null or p_ai_confidence < 0.7 or p_ai_confidence > 1
      or p_score is null or p_score < 0
      or p_score_breakdown is null or jsonb_typeof(p_score_breakdown) <> 'object' then
      raise exception using errcode = '22023', message = 'invalid_submission_result';
    end if;
  elsif p_rejection_reason is null or p_rejection_reason not in ('not_crane', 'low_confidence', 'master_reproduction', 'artwork_not_physical')
    or p_crane_type is not null
    or p_ai_confidence is not null
    or p_score is not null
    or p_score_breakdown is not null then
    raise exception using errcode = '22023', message = 'invalid_rejection_result';
  end if;

  if p_image_path is null
    or p_image_path !~ ('^' || p_user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]jpg$')
    or not exists (
      select 1
      from storage.objects as stored_image
      where stored_image.bucket_id = 'crane-submissions'
        and stored_image.name = p_image_path
        and stored_image.metadata ->> 'mimetype' = 'image/jpeg'
    ) then
    raise exception using errcode = '22023', message = 'invalid_image_path';
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
    insert into public.crane_submissions (
      user_id, image_url, crane_type, ai_confidence, score, score_breakdown
    ) values (
      p_user_id, p_image_path, p_crane_type, p_ai_confidence, p_score, p_score_breakdown
    ) returning id into saved_submission_id;

    insert into public.crane_submission_attempts (user_id, submission_id, outcome)
    values (p_user_id, saved_submission_id, 'accepted');
  else
    insert into public.crane_submission_attempts (user_id, outcome, rejection_reason, image_url)
    values (p_user_id, 'rejected', p_rejection_reason, p_image_path);
  end if;

  return query select saved_submission_id, current_count + 1, 2 - current_count;
end;
$$;

revoke all on function public.finalize_crane_submission(uuid, boolean, text, text, text, numeric, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_crane_submission(uuid, boolean, text, text, text, numeric, bigint, jsonb) to service_role;