create table public.crane_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  image_url text not null check (char_length(btrim(image_url)) > 0),
  crane_type text not null check (crane_type in ('bird', 'construction', 'master_crane')),
  ai_confidence numeric(4, 3) not null check (ai_confidence between 0 and 1),
  score bigint not null check (score >= 0),
  score_breakdown jsonb not null default '{}'::jsonb check (jsonb_typeof(score_breakdown) = 'object'),
  created_at timestamptz not null default now()
);

create index crane_submissions_user_created_at_idx
  on public.crane_submissions (user_id, created_at);

alter table public.crane_submissions enable row level security;
revoke all on table public.crane_submissions from anon, authenticated;