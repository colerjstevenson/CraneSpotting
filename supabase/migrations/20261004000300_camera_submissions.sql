insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crane-submissions', 'crane-submissions', false, 5242880, array['image/jpeg'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Players can upload their own crane photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'crane-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Players can remove their own crane photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'crane-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create function public.get_daily_submission_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.crane_submissions as submission
  where submission.user_id = (select auth.uid())
    and submission.created_at >= (date_trunc('day', statement_timestamp() at time zone 'UTC') at time zone 'UTC')
    and submission.created_at < ((date_trunc('day', statement_timestamp() at time zone 'UTC') + interval '1 day') at time zone 'UTC');
$$;

create function public.submit_mock_crane(submission_image_path text)
returns table (submissions_today integer, remaining_submissions integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := (select auth.uid());
  utc_day_start timestamptz := (date_trunc('day', statement_timestamp() at time zone 'UTC') at time zone 'UTC');
  current_count integer;
begin
  if player_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if submission_image_path !~ ('^' || player_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]jpg$') then
    raise exception using errcode = '22023', message = 'invalid_image_path';
  end if;

  if not exists (
    select 1
    from storage.objects as stored_image
    where stored_image.bucket_id = 'crane-submissions'
      and stored_image.name = submission_image_path
      and stored_image.metadata ->> 'mimetype' = 'image/jpeg'
  ) then
    raise exception using errcode = '22023', message = 'image_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(player_id::text, 0));

  select count(*)::integer
  into current_count
  from public.crane_submissions as submission
  where submission.user_id = player_id
    and submission.created_at >= utc_day_start
    and submission.created_at < utc_day_start + interval '1 day';

  if current_count >= 3 then
    raise exception using errcode = 'P0001', message = 'daily_limit_reached';
  end if;

  insert into public.crane_submissions (
    user_id,
    image_url,
    crane_type,
    ai_confidence,
    score,
    score_breakdown
  ) values (
    player_id,
    submission_image_path,
    'construction',
    0.500,
    0,
    '{}'::jsonb
  );

  return query select current_count + 1, 2 - current_count;
end;
$$;

revoke all on function public.get_daily_submission_count() from public, anon, authenticated;
revoke all on function public.submit_mock_crane(text) from public, anon, authenticated;
grant execute on function public.get_daily_submission_count() to authenticated;
grant execute on function public.submit_mock_crane(text) to authenticated;