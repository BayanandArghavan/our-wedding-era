-- Trigger functions are only meant to run as triggers. Remove direct API access
-- (flagged by Supabase's security advisor). Triggers still fire normally.
revoke execute on function
  public.handle_new_user(),
  public.tasks_after_write(),
  public.milestones_after_write(),
  public.vendor_needs_after_write(),
  public.settings_after_write(),
  public.complete_milestones_for_task(),
  public.log_reassign_request(),
  public.set_audit_fields(),
  public.tasks_before_write(),
  public.task_dependencies_guard(),
  public.tasks_clear_reassign_request()
  from public, anon, authenticated;
