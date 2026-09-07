create table if not exists public.feedback (
  id text primary key,
  at bigint not null,
  title text not null,
  body text not null default '',
  version text not null default '',
  league text not null default '',
  page text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists feedback_anon_insert on public.feedback;
create policy feedback_anon_insert
  on public.feedback
  for insert
  to anon
  with check (true);

revoke all on public.feedback from anon, authenticated;
grant insert on public.feedback to anon;
grant all on public.feedback to service_role;
