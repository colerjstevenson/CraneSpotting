create function public.get_global_leaderboard()
returns table (
  rank bigint,
  name text,
  cranes bigint,
  points bigint,
  is_current_player boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select
      user_profile.id,
      user_profile.username,
      user_profile.display_name,
      count(submission.id)::bigint as cranes,
      coalesce(sum(submission.score), 0)::bigint as points
    from public.users as user_profile
    left join public.crane_submissions as submission
      on submission.user_id = user_profile.id
    group by user_profile.id, user_profile.username, user_profile.display_name
  ), ranked as (
    select
      row_number() over (
        order by totals.points desc, totals.username asc, totals.id asc
      ) as rank,
      totals.display_name as name,
      totals.cranes,
      totals.points,
      coalesce(totals.id = (select auth.uid()), false) as is_current_player
    from totals
  )
  select ranked.rank, ranked.name, ranked.cranes, ranked.points, ranked.is_current_player
  from ranked
  order by ranked.rank;
$$;

revoke all on function public.get_global_leaderboard() from public, anon, authenticated;
grant execute on function public.get_global_leaderboard() to anon, authenticated;