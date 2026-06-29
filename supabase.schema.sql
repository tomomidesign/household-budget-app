create table if not exists household_budget_backups (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table household_budget_backups enable row level security;

create policy "Allow local app anon access for MVP"
on household_budget_backups
for all
using (true)
with check (true);
