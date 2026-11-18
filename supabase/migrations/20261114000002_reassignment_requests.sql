-- "Who's Doing What?": either partner can ask to hand a task off.
-- The request is recorded on the task; the other partner accepts (reassigns)
-- or dismisses it. Clearing happens automatically when the assignee changes.

alter table public.tasks
  add column reassign_requested_by uuid references auth.users (id) on delete set null,
  add column reassign_requested_at timestamptz,
  add constraint reassign_request_complete check ((reassign_requested_by is null) = (reassign_requested_at is null));

create or replace function public.tasks_clear_reassign_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignee is distinct from old.assignee then
    new.reassign_requested_by := null;
    new.reassign_requested_at := null;
  end if;
  if new.reassign_requested_by is not null and old.reassign_requested_by is distinct from new.reassign_requested_by then
    -- A request is always made by the person making the change.
    new.reassign_requested_by := (select auth.uid());
    new.reassign_requested_at := now();
  end if;
  return new;
end;
$$;

create trigger tasks_clear_reassign_request before update on public.tasks
  for each row execute function public.tasks_clear_reassign_request();

create or replace function public.log_reassign_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reassign_requested_by is not null and old.reassign_requested_by is null then
    perform public.log_activity(new.workspace_id, 'task', new.id, 'reassign_requested', new.title, '{}'::jsonb);
  end if;
  return null;
end;
$$;

create trigger tasks_log_reassign_request after update of reassign_requested_by on public.tasks
  for each row execute function public.log_reassign_request();
