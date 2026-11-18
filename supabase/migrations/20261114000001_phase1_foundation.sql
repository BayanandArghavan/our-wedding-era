-- Our Wedding Era: Phase 1 foundation
-- Workspaces, membership, invitations, wedding settings, checklist, milestones,
-- vendor booking status, activity history, and row level security.
--
-- Design rules enforced here (not only in the UI):
--   * Every wedding record carries workspace_id and is readable/writable only by
--     members of that workspace (RLS on every table).
--   * created_by / updated_by come from auth.uid() in a trigger, so the app can't
--     misattribute who changed something.
--   * Task history (old/new due dates, status, assignee) is written by trigger
--     and can't be edited or deleted by clients.
--   * Seeded tasks carry a seed_key that is unique per workspace, so seeding twice
--     can never duplicate the checklist.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'partner');
create type public.assignee_kind as enum ('unassigned', 'partner1', 'partner2', 'together');
create type public.task_status as enum (
  'not_started', 'in_progress', 'waiting', 'blocked', 'completed', 'not_applicable'
);
create type public.task_priority as enum ('critical', 'high', 'medium', 'low');
create type public.date_source as enum ('none', 'suggested', 'manual');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');
create type public.vendor_need_status as enum ('not_booked', 'booked', 'not_needed');

-- ---------------------------------------------------------------------------
-- Generic trigger: audit fields + workspace immutability
-- ---------------------------------------------------------------------------
create or replace function public.set_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.created_at := now();
  else
    if new.workspace_id is distinct from old.workspace_id then
      raise exception 'Records cannot be moved between workspaces' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  time_zone text not null default 'America/Los_Angeles' check (char_length(time_zone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Workspaces and membership
-- ---------------------------------------------------------------------------
create table public.wedding_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Wedding Era' check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.wedding_workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  -- 1 = Partner 1 (Arghavan by default), 2 = Partner 2 (Bayan by default).
  partner_slot smallint not null check (partner_slot in (1, 2)),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  unique (workspace_id, partner_slot),
  -- This is a private app for one couple: an account belongs to one wedding.
  unique (user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.wedding_workspaces (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%_@_%'),
  partner_slot smallint not null check (partner_slot in (1, 2)),
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references auth.users (id),
  accepted_by uuid references auth.users (id),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index workspace_invitations_one_pending
  on public.workspace_invitations (workspace_id) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer so policies don't recurse)
-- ---------------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.shares_workspace_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

-- ---------------------------------------------------------------------------
-- Wedding settings (one row per workspace)
-- ---------------------------------------------------------------------------
create table public.wedding_settings (
  workspace_id uuid primary key references public.wedding_workspaces (id) on delete cascade,
  partner1_name text not null default 'Arghavan' check (char_length(trim(partner1_name)) between 1 and 60),
  partner2_name text not null default 'Bayan' check (char_length(trim(partner2_name)) between 1 and 60),
  venue_name text not null default 'Bel Air Bay Club',
  venue_location text not null default 'Pacific Palisades, California',
  venue_time_zone text not null default 'America/Los_Angeles',
  wedding_month date not null default date '2027-09-01' check (extract(day from wedding_month) = 1),
  wedding_date date,
  estimated_guest_count integer not null default 160 check (estimated_guest_count between 1 and 2000),
  confirmed_guest_count integer check (confirmed_guest_count between 0 and 2000),
  ceremony_start time not null default time '15:00',
  event_end time not null default time '23:00',
  ceremony_setting text not null default 'Outdoor',
  reception_setting text not null default 'Indoor',
  wedding_style text not null default 'Elegant, modern, romantic, sophisticated, personal',
  ceremony_tradition text not null default 'Bahá''í wedding',
  sofreh_aghd boolean not null default false,
  alcohol_served boolean not null default false,
  catering_notes text not null default 'Dinner and appetizers included with venue',
  outside_vendor_notes text not null default 'Dessert, Persian tea, and fruit: outside vendors being considered',
  venue_deposit_status text not null default 'First deposit paid, written confirmation pending',
  venue_confirmation_received boolean not null default false,
  planning_start_month date not null default date '2026-11-01' check (extract(day from planning_start_month) = 1),
  planning_time_zone text not null default 'America/Los_Angeles',
  total_budget numeric(12, 2) check (total_budget >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  reminder_frequency text not null default 'weekly' check (reminder_frequency in ('daily', 'weekly', 'monthly', 'none')),
  checkin_day_of_month smallint check (checkin_day_of_month between 1 and 28),
  weekly_summary boolean not null default false,
  task_division text not null default 'task_by_task'
    check (task_division in ('task_by_task', 'balanced', 'mostly_together')),
  setup_step smallint not null default 1 check (setup_step between 1 and 6),
  setup_completed_at timestamptz,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wedding_date_matches_month check (
    wedding_date is null or date_trunc('month', wedding_date)::date = wedding_month
  ),
  constraint planning_starts_before_wedding check (planning_start_month <= wedding_month)
);

-- ---------------------------------------------------------------------------
-- Checklist
-- ---------------------------------------------------------------------------
create table public.task_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.wedding_workspaces (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  sort_order integer not null default 0,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.wedding_workspaces (id) on delete cascade,
  category_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  notes text not null default '' check (char_length(notes) <= 8000),
  assignee public.assignee_kind not null default 'unassigned',
  status public.task_status not null default 'not_started',
  priority public.task_priority not null default 'medium',
  due_date date,
  date_source public.date_source not null default 'none',
  completed_at timestamptz,
  -- Planning metadata used to suggest dates. months_before: roadmap month
  -- relative to the wedding month (0 = wedding month, -1 = month after).
  -- days_before: precise offset once the exact date is known.
  seed_key text,
  months_before smallint check (months_before between -6 and 36),
  days_before integer check (days_before between -180 and 1100),
  is_booking boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, seed_key),
  unique (workspace_id, id),
  foreign key (workspace_id, category_id)
    references public.task_categories (workspace_id, id) on delete set null (category_id),
  constraint completed_at_matches_status check ((status = 'completed') = (completed_at is not null)),
  constraint due_date_matches_source check ((due_date is null) = (date_source = 'none'))
);
create index tasks_workspace_due on public.tasks (workspace_id, due_date);
create index tasks_workspace_status on public.tasks (workspace_id, status);

create table public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  task_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, task_id) references public.tasks (workspace_id, id) on delete cascade
);
create index task_subtasks_task on public.task_subtasks (task_id);

create table public.task_dependencies (
  workspace_id uuid not null,
  task_id uuid not null,
  depends_on_task_id uuid not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id),
  foreign key (workspace_id, task_id) references public.tasks (workspace_id, id) on delete cascade,
  foreign key (workspace_id, depends_on_task_id) references public.tasks (workspace_id, id) on delete cascade
);
create index task_dependencies_depends_on on public.task_dependencies (depends_on_task_id);

create table public.task_activity (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  task_id uuid not null,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, task_id) references public.tasks (workspace_id, id) on delete cascade
);
create index task_activity_task on public.task_activity (task_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Milestones
-- ---------------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.wedding_workspaces (id) on delete cascade,
  seed_key text,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '',
  sort_order integer not null default 0,
  is_completed boolean not null default false,
  -- Left empty when a milestone is completed but nobody recorded when.
  completed_on date,
  is_custom boolean not null default false,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, seed_key),
  unique (workspace_id, id),
  check (is_completed or completed_on is null)
);

create table public.milestone_tasks (
  workspace_id uuid not null,
  milestone_id uuid not null,
  task_id uuid not null,
  primary key (milestone_id, task_id),
  foreign key (workspace_id, milestone_id) references public.milestones (workspace_id, id) on delete cascade,
  foreign key (workspace_id, task_id) references public.tasks (workspace_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Vendor booking needs (the full vendor CRM arrives in Phase 3 and links here)
-- ---------------------------------------------------------------------------
create table public.vendor_needs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.wedding_workspaces (id) on delete cascade,
  category text not null check (char_length(trim(category)) between 1 and 60),
  label text not null check (char_length(trim(label)) between 1 and 60),
  status public.vendor_need_status not null default 'not_booked',
  sort_order integer not null default 0,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, category)
);

-- ---------------------------------------------------------------------------
-- Workspace activity feed ("Bayan completed a task")
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.wedding_workspaces (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  entity_type text not null,
  -- Not a foreign key: the feed must survive deletion of the record it mentions.
  entity_id uuid,
  action text not null,
  -- Snapshot of the record's title at the time, so deleted items still read well.
  entity_label text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_workspace_time on public.activity_log (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Audit triggers
-- ---------------------------------------------------------------------------
create trigger audit_wedding_settings before insert or update on public.wedding_settings
  for each row execute function public.set_audit_fields();
create trigger audit_task_categories before insert or update on public.task_categories
  for each row execute function public.set_audit_fields();
create trigger audit_task_subtasks before insert or update on public.task_subtasks
  for each row execute function public.set_audit_fields();
create trigger audit_milestones before insert or update on public.milestones
  for each row execute function public.set_audit_fields();
create trigger audit_vendor_needs before insert or update on public.vendor_needs
  for each row execute function public.set_audit_fields();

create or replace function public.tasks_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' or old.status <> 'completed' then
      new.completed_at := now();
    else
      new.completed_at := old.completed_at;
    end if;
  else
    new.completed_at := null;
  end if;

  if new.due_date is null then
    new.date_source := 'none';
  elsif new.date_source = 'none' then
    new.date_source := 'manual';
  end if;

  if tg_op = 'UPDATE' then
    if new.seed_key is distinct from old.seed_key then
      raise exception 'seed_key cannot be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function public.tasks_before_write();
create trigger audit_tasks before insert or update on public.tasks
  for each row execute function public.set_audit_fields();

create or replace function public.log_activity(
  p_workspace uuid, p_entity_type text, p_entity_id uuid, p_action text, p_label text, p_details jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_log (workspace_id, actor_id, entity_type, entity_id, action, entity_label, details)
  values (p_workspace, (select auth.uid()), p_entity_type, p_entity_id, p_action, coalesce(p_label, ''), coalesce(p_details, '{}'::jsonb));
$$;
revoke execute on function public.log_activity(uuid, text, uuid, text, text, jsonb) from public, anon, authenticated;

create or replace function public.tasks_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reason text := nullif(current_setting('app.change_reason', true), '');
begin
  if current_setting('app.seeding', true) = 'on' then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.task_activity (workspace_id, task_id, actor_id, action, details)
    values (new.workspace_id, new.id, v_actor, 'created', jsonb_build_object('due_date', new.due_date));
    perform public.log_activity(new.workspace_id, 'task', new.id, 'created', new.title, '{}'::jsonb);
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.log_activity(old.workspace_id, 'task', old.id, 'deleted', old.title, '{}'::jsonb);
    return null;
  end if;

  if new.due_date is distinct from old.due_date then
    insert into public.task_activity (workspace_id, task_id, actor_id, action, details)
    values (new.workspace_id, new.id, v_actor, 'due_date_changed', jsonb_build_object(
      'from', old.due_date, 'to', new.due_date,
      'from_source', old.date_source, 'to_source', new.date_source,
      'reason', v_reason));
  end if;

  if new.status is distinct from old.status then
    insert into public.task_activity (workspace_id, task_id, actor_id, action, details)
    values (new.workspace_id, new.id, v_actor, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status));
    if new.status = 'completed' then
      perform public.log_activity(new.workspace_id, 'task', new.id, 'completed', new.title, '{}'::jsonb);
    elsif old.status = 'completed' then
      perform public.log_activity(new.workspace_id, 'task', new.id, 'reopened', new.title, '{}'::jsonb);
    end if;
  end if;

  if new.assignee is distinct from old.assignee then
    insert into public.task_activity (workspace_id, task_id, actor_id, action, details)
    values (new.workspace_id, new.id, v_actor, 'assignee_changed',
            jsonb_build_object('from', old.assignee, 'to', new.assignee));
    perform public.log_activity(new.workspace_id, 'task', new.id, 'assigned', new.title,
                                jsonb_build_object('to', new.assignee));
  end if;

  if new.priority is distinct from old.priority then
    insert into public.task_activity (workspace_id, task_id, actor_id, action, details)
    values (new.workspace_id, new.id, v_actor, 'priority_changed',
            jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;

  if new.title is distinct from old.title then
    insert into public.task_activity (workspace_id, task_id, actor_id, action, details)
    values (new.workspace_id, new.id, v_actor, 'renamed',
            jsonb_build_object('from', old.title, 'to', new.title));
  end if;

  return null;
end;
$$;

create trigger tasks_after_write after insert or update or delete on public.tasks
  for each row execute function public.tasks_after_write();

create or replace function public.task_dependencies_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := (select auth.uid());
  if exists (
    with recursive chain (id) as (
      select d.depends_on_task_id from public.task_dependencies d where d.task_id = new.depends_on_task_id
      union
      select d.depends_on_task_id from public.task_dependencies d join chain c on d.task_id = c.id
    )
    select 1 from chain where id = new.task_id
  ) then
    raise exception 'That dependency would create a loop' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger task_dependencies_guard before insert or update on public.task_dependencies
  for each row execute function public.task_dependencies_guard();

create or replace function public.milestones_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('app.seeding', true) = 'on' then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.is_completed and not old.is_completed then
    perform public.log_activity(new.workspace_id, 'milestone', new.id, 'completed', new.title, '{}'::jsonb);
  elsif tg_op = 'INSERT' and new.is_custom then
    perform public.log_activity(new.workspace_id, 'milestone', new.id, 'created', new.title, '{}'::jsonb);
  end if;
  return null;
end;
$$;

create trigger milestones_after_write after insert or update on public.milestones
  for each row execute function public.milestones_after_write();

create or replace function public.vendor_needs_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('app.seeding', true) = 'on' then
    return null;
  end if;
  if new.status is distinct from old.status then
    perform public.log_activity(new.workspace_id, 'vendor_need', new.id, 'status_changed', new.label,
                                jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return null;
end;
$$;

create trigger vendor_needs_after_write after update on public.vendor_needs
  for each row execute function public.vendor_needs_after_write();

create or replace function public.settings_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.wedding_date is distinct from old.wedding_date then
    perform public.log_activity(new.workspace_id, 'settings', new.workspace_id, 'wedding_date_changed', 'Wedding date',
                                jsonb_build_object('from', old.wedding_date, 'to', new.wedding_date));
  end if;
  return null;
end;
$$;

create trigger settings_after_write after update on public.wedding_settings
  for each row execute function public.settings_after_write();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.wedding_workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.wedding_settings enable row level security;
alter table public.task_categories enable row level security;
alter table public.tasks enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_activity enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_tasks enable row level security;
alter table public.vendor_needs enable row level security;
alter table public.activity_log enable row level security;

-- Nothing in this schema is for signed-out visitors.
revoke all on all tables in schema public from anon;

grant select, update on public.profiles to authenticated;
grant select, update on public.wedding_workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select on public.workspace_invitations to authenticated;
grant select, update on public.wedding_settings to authenticated;
grant select, insert, update, delete on
  public.task_categories, public.tasks, public.task_subtasks, public.task_dependencies,
  public.milestones, public.milestone_tasks, public.vendor_needs
  to authenticated;
grant select on public.task_activity, public.activity_log to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy workspaces_select on public.wedding_workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy workspaces_update on public.wedding_workspaces for update to authenticated
  using (public.is_workspace_member(id)) with check (public.is_workspace_member(id));

create policy members_select on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy invitations_select on public.workspace_invitations for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy settings_select on public.wedding_settings for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy settings_update on public.wedding_settings for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

do $$
declare
  t text;
begin
  foreach t in array array[
    'task_categories', 'tasks', 'task_subtasks', 'task_dependencies',
    'milestones', 'milestone_tasks', 'vendor_needs'
  ] loop
    execute format(
      'create policy %1$s_member_all on public.%1$s for all to authenticated
         using (public.is_workspace_member(workspace_id))
         with check (public.is_workspace_member(workspace_id))', t);
  end loop;
end;
$$;

create policy task_activity_select on public.task_activity for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy activity_log_select on public.activity_log for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- RPC: create the couple's workspace and seed it in one transaction
-- ---------------------------------------------------------------------------
create or replace function public.create_workspace(
  p_partner_slot smallint,
  p_settings jsonb,
  p_categories jsonb,
  p_tasks jsonb,
  p_milestones jsonb,
  p_vendor_needs jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
  v_wedding_date date := nullif(p_settings ->> 'wedding_date', '')::date;
begin
  if v_uid is null then
    raise exception 'You need to be signed in' using errcode = '42501';
  end if;
  if p_partner_slot not in (1, 2) then
    raise exception 'Choose which partner you are' using errcode = '22023';
  end if;
  if exists (select 1 from public.workspace_members where user_id = v_uid) then
    raise exception 'You already belong to a wedding workspace' using errcode = '23505';
  end if;

  perform set_config('app.seeding', 'on', true);

  insert into public.wedding_workspaces (created_by) values (v_uid) returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role, partner_slot)
  values (v_ws, v_uid, 'owner', p_partner_slot);

  insert into public.wedding_settings (workspace_id) values (v_ws);
  update public.wedding_settings s set
    partner1_name = coalesce(nullif(trim(p_settings ->> 'partner1_name'), ''), s.partner1_name),
    partner2_name = coalesce(nullif(trim(p_settings ->> 'partner2_name'), ''), s.partner2_name),
    wedding_date = v_wedding_date,
    wedding_month = coalesce(
      date_trunc('month', v_wedding_date)::date,
      nullif(p_settings ->> 'wedding_month', '')::date,
      s.wedding_month),
    total_budget = nullif(p_settings ->> 'total_budget', '')::numeric,
    estimated_guest_count = coalesce(nullif(p_settings ->> 'estimated_guest_count', '')::integer, s.estimated_guest_count),
    confirmed_guest_count = nullif(p_settings ->> 'confirmed_guest_count', '')::integer,
    planning_time_zone = coalesce(nullif(p_settings ->> 'planning_time_zone', ''), s.planning_time_zone),
    setup_step = 3
  where s.workspace_id = v_ws;

  insert into public.task_categories (workspace_id, name, sort_order)
  select v_ws, c ->> 'name', (c ->> 'sort_order')::integer
  from jsonb_array_elements(p_categories) c
  on conflict (workspace_id, name) do nothing;

  insert into public.tasks (
    workspace_id, category_id, title, description, priority, due_date, date_source,
    seed_key, months_before, days_before, is_booking, sort_order
  )
  select
    v_ws, tc.id, t ->> 'title', coalesce(t ->> 'description', ''),
    (t ->> 'priority')::public.task_priority,
    nullif(t ->> 'due_date', '')::date,
    case when nullif(t ->> 'due_date', '') is null then 'none' else 'suggested' end::public.date_source,
    t ->> 'seed_key',
    nullif(t ->> 'months_before', '')::smallint,
    nullif(t ->> 'days_before', '')::integer,
    coalesce((t ->> 'is_booking')::boolean, false),
    coalesce((t ->> 'sort_order')::integer, 0)
  from jsonb_array_elements(p_tasks) t
  left join public.task_categories tc on tc.workspace_id = v_ws and tc.name = t ->> 'category'
  on conflict (workspace_id, seed_key) do nothing;

  insert into public.task_dependencies (workspace_id, task_id, depends_on_task_id)
  select v_ws, a.id, b.id
  from jsonb_array_elements(p_tasks) t
  cross join lateral jsonb_array_elements_text(coalesce(t -> 'depends_on', '[]'::jsonb)) dep(key)
  join public.tasks a on a.workspace_id = v_ws and a.seed_key = t ->> 'seed_key'
  join public.tasks b on b.workspace_id = v_ws and b.seed_key = dep.key
  on conflict do nothing;

  insert into public.milestones (workspace_id, seed_key, title, description, sort_order, is_completed)
  select v_ws, m ->> 'seed_key', m ->> 'title', coalesce(m ->> 'description', ''),
         (m ->> 'sort_order')::integer, coalesce((m ->> 'is_completed')::boolean, false)
  from jsonb_array_elements(p_milestones) m
  on conflict (workspace_id, seed_key) do nothing;

  insert into public.milestone_tasks (workspace_id, milestone_id, task_id)
  select v_ws, ms.id, tk.id
  from jsonb_array_elements(p_milestones) m
  cross join lateral jsonb_array_elements_text(coalesce(m -> 'task_keys', '[]'::jsonb)) k(key)
  join public.milestones ms on ms.workspace_id = v_ws and ms.seed_key = m ->> 'seed_key'
  join public.tasks tk on tk.workspace_id = v_ws and tk.seed_key = k.key
  on conflict do nothing;

  insert into public.vendor_needs (workspace_id, category, label, status, sort_order)
  select v_ws, v ->> 'category', v ->> 'label', (v ->> 'status')::public.vendor_need_status,
         (v ->> 'sort_order')::integer
  from jsonb_array_elements(p_vendor_needs) v
  on conflict (workspace_id, category) do nothing;

  perform set_config('app.seeding', 'off', true);
  perform public.log_activity(v_ws, 'workspace', v_ws, 'created', 'Wedding workspace', '{}'::jsonb);

  return v_ws;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: partner invitations
-- ---------------------------------------------------------------------------
create or replace function public.create_partner_invitation(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_member public.workspace_members;
  v_email text := lower(trim(p_email));
  v_token text;
begin
  select * into v_member from public.workspace_members where user_id = v_uid;
  if v_member is null then
    raise exception 'Create your wedding workspace first' using errcode = '42501';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if (select count(*) from public.workspace_members where workspace_id = v_member.workspace_id) >= 2 then
    raise exception 'Both partners have already joined' using errcode = '23514';
  end if;
  if v_email = (select lower(email) from auth.users where id = v_uid) then
    raise exception 'That is your own email address' using errcode = '22023';
  end if;

  update public.workspace_invitations
     set status = 'revoked'
   where workspace_id = v_member.workspace_id and status = 'pending';

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.workspace_invitations (workspace_id, email, partner_slot, token_hash, invited_by, expires_at)
  values (
    v_member.workspace_id, v_email, 3 - v_member.partner_slot,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_uid, now() + interval '14 days'
  );

  perform public.log_activity(v_member.workspace_id, 'invitation', null, 'created', v_email, '{}'::jsonb);
  return v_token;
end;
$$;

create or replace function public.revoke_partner_invitation()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid := (select workspace_id from public.workspace_members where user_id = (select auth.uid()));
begin
  if v_ws is null then
    raise exception 'Not a workspace member' using errcode = '42501';
  end if;
  update public.workspace_invitations set status = 'revoked'
   where workspace_id = v_ws and status = 'pending';
end;
$$;

-- Lets the invite page greet the invitee before they have an account.
-- Requires the unguessable token; returns only what the page needs.
create or replace function public.get_invitation_preview(p_token text)
returns table (
  invited_email text,
  inviter_name text,
  partner1_name text,
  partner2_name text,
  partner_slot smallint,
  is_valid boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_inv public.workspace_invitations;
  v_settings public.wedding_settings;
begin
  select * into v_inv from public.workspace_invitations
   where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if v_inv is null then
    return query select null::text, null::text, null::text, null::text, null::smallint, false, 'not_found';
    return;
  end if;
  select * into v_settings from public.wedding_settings where workspace_id = v_inv.workspace_id;
  return query select
    v_inv.email,
    (select p.display_name from public.profiles p where p.id = v_inv.invited_by),
    v_settings.partner1_name,
    v_settings.partner2_name,
    v_inv.partner_slot,
    (v_inv.status = 'pending' and v_inv.expires_at > now()),
    case
      when v_inv.status = 'accepted' then 'accepted'
      when v_inv.status = 'revoked' then 'revoked'
      when v_inv.expires_at <= now() then 'expired'
      else 'ok'
    end;
end;
$$;

create or replace function public.accept_partner_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_user auth.users;
  v_inv public.workspace_invitations;
begin
  if v_uid is null then
    raise exception 'You need to be signed in' using errcode = '42501';
  end if;
  select * into v_user from auth.users where id = v_uid;

  select * into v_inv from public.workspace_invitations
   where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
   for update;

  if v_inv is null or v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'This invitation is no longer valid' using errcode = '22023';
  end if;
  if v_user.email_confirmed_at is null then
    raise exception 'Confirm your email address first' using errcode = '42501';
  end if;
  if lower(v_user.email) <> v_inv.email then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;
  if exists (select 1 from public.workspace_members where user_id = v_uid) then
    raise exception 'This account already belongs to a wedding workspace' using errcode = '23505';
  end if;
  if (select count(*) from public.workspace_members where workspace_id = v_inv.workspace_id) >= 2 then
    raise exception 'Both partners have already joined' using errcode = '23514';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, partner_slot)
  values (v_inv.workspace_id, v_uid, 'partner', v_inv.partner_slot);

  update public.workspace_invitations
     set status = 'accepted', accepted_by = v_uid, accepted_at = now()
   where id = v_inv.id;

  insert into public.activity_log (workspace_id, actor_id, entity_type, entity_id, action, entity_label)
  values (v_inv.workspace_id, v_uid, 'member', v_uid, 'joined', '');

  return v_inv.workspace_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: rescheduling with history
-- ---------------------------------------------------------------------------
create or replace function public.reschedule_task(p_task_id uuid, p_new_date date, p_reason text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform set_config('app.change_reason', coalesce(p_reason, ''), true);
  update public.tasks
     set due_date = p_new_date,
         date_source = case when p_new_date is null then 'none' else 'manual' end::public.date_source
   where id = p_task_id;
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
  perform set_config('app.change_reason', '', true);
end;
$$;

-- Applies a wedding date (or month) change together with the task date changes
-- the couple approved. Only task ids listed in p_changes are touched.
create or replace function public.apply_wedding_date_change(
  p_wedding_date date,
  p_wedding_month date,
  p_changes jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ws uuid := (select workspace_id from public.workspace_members where user_id = (select auth.uid()));
  v_count integer;
begin
  if v_ws is null then
    raise exception 'Not a workspace member' using errcode = '42501';
  end if;

  update public.wedding_settings
     set wedding_date = p_wedding_date,
         wedding_month = coalesce(date_trunc('month', p_wedding_date)::date, p_wedding_month)
   where workspace_id = v_ws;

  perform set_config('app.change_reason', 'wedding_date_changed', true);
  update public.tasks t
     set due_date = (c ->> 'due_date')::date,
         date_source = 'suggested'
    from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb)) c
   where t.id = (c ->> 'task_id')::uuid
     and t.workspace_id = v_ws;
  get diagnostics v_count = row_count;
  perform set_config('app.change_reason', '', true);
  return v_count;
end;
$$;

revoke execute on function
  public.create_workspace(smallint, jsonb, jsonb, jsonb, jsonb, jsonb),
  public.create_partner_invitation(text),
  public.revoke_partner_invitation(),
  public.accept_partner_invitation(text),
  public.reschedule_task(uuid, date, text),
  public.apply_wedding_date_change(date, date, jsonb),
  public.is_workspace_member(uuid),
  public.shares_workspace_with(uuid)
  from public, anon;

grant execute on function
  public.create_workspace(smallint, jsonb, jsonb, jsonb, jsonb, jsonb),
  public.create_partner_invitation(text),
  public.revoke_partner_invitation(),
  public.accept_partner_invitation(text),
  public.reschedule_task(uuid, date, text),
  public.apply_wedding_date_change(date, date, jsonb),
  public.is_workspace_member(uuid),
  public.shares_workspace_with(uuid)
  to authenticated;

revoke execute on function public.get_invitation_preview(text) from public;
grant execute on function public.get_invitation_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: let both partners' screens refresh when the other makes a change.
-- Realtime respects the RLS policies above.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.tasks, public.task_subtasks, public.milestones, public.vendor_needs,
      public.wedding_settings, public.activity_log, public.workspace_members;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Milestones complete themselves when every linked task is done.
-- They are never reopened automatically: un-completing a milestone is a
-- deliberate choice the couple makes on the Milestones page.
-- ---------------------------------------------------------------------------
create or replace function public.complete_milestones_for_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date;
begin
  if current_setting('app.seeding', true) = 'on' then
    return null;
  end if;
  if new.status not in ('completed', 'not_applicable') or old.status in ('completed', 'not_applicable') then
    return null;
  end if;

  select (now() at time zone s.planning_time_zone)::date into v_today
    from public.wedding_settings s where s.workspace_id = new.workspace_id;

  update public.milestones m
     set is_completed = true, completed_on = v_today
   where m.workspace_id = new.workspace_id
     and not m.is_completed
     and exists (select 1 from public.milestone_tasks mt where mt.milestone_id = m.id and mt.task_id = new.id)
     and not exists (
       select 1 from public.milestone_tasks mt
       join public.tasks t on t.id = mt.task_id
       where mt.milestone_id = m.id and t.status not in ('completed', 'not_applicable')
     );
  return null;
end;
$$;

create trigger tasks_complete_milestones after update of status on public.tasks
  for each row execute function public.complete_milestones_for_task();
