"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/data/viewer";
import { syncDepositConfirmation, syncVendorNeed } from "@/lib/data/links";
import { addMonthsToMonthStart, endOfMonth, isIsoDate } from "@/lib/planning/dates";
import { dbFailure, zodFailure, type ActionResult } from "@/lib/actions";
import { taskSchema, type TaskInput } from "@/lib/validation/task";
import type { TaskStatus } from "@/lib/types";

const uuid = z.string().uuid();

function refreshAll() {
  revalidatePath("/", "layout");
}

/** Milestones linked to a task that aren't complete yet (to detect celebrations). */
async function openMilestonesFor(taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("milestone_tasks").select("milestone_id, milestones!inner(id,title,is_completed)").eq("task_id", taskId);
  return (data ?? [])
    .map((r) => (r as unknown as { milestones: { id: string; title: string; is_completed: boolean } }).milestones)
    .filter((m) => !m.is_completed);
}

async function newlyCompleted(before: { id: string; title: string }[]): Promise<string[]> {
  if (before.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("milestones")
    .select("id,title,is_completed")
    .in(
      "id",
      before.map((m) => m.id),
    );
  return (data ?? []).filter((m) => m.is_completed).map((m) => m.title);
}

export async function createTask(input: TaskInput): Promise<ActionResult<{ id: string }>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const ctx = await requireWorkspace();
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: ctx.workspaceId,
      title: v.title,
      description: v.description,
      notes: v.notes,
      category_id: v.categoryId || null,
      assignee: v.assignee,
      status: v.status,
      priority: v.priority,
      due_date: v.dueDate || null,
      date_source: v.dueDate ? "manual" : "none",
    })
    .select("id")
    .single();
  if (error) return dbFailure(error, "We couldn't save the task.");
  refreshAll();
  return { ok: true, data: { id: data.id } };
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown task." };
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  await requireWorkspace();
  const v = parsed.data;
  const supabase = await createClient();

  const { data: current } = await supabase.from("tasks").select("due_date,status,seed_key,workspace_id").eq("id", id).single();
  if (!current) return { ok: false, error: "That task no longer exists." };
  const before = v.status !== current.status ? await openMilestonesFor(id) : [];

  const dueDate = v.dueDate || null;
  const { error } = await supabase
    .from("tasks")
    .update({
      title: v.title,
      description: v.description,
      notes: v.notes,
      category_id: v.categoryId || null,
      assignee: v.assignee,
      status: v.status,
      priority: v.priority,
      due_date: dueDate,
      // A date someone typed in is "manual" and won't be moved by a wedding date change.
      ...(dueDate !== current.due_date ? { date_source: dueDate ? ("manual" as const) : ("none" as const) } : {}),
    })
    .eq("id", id);
  if (error) return dbFailure(error, "We couldn't save the task.");

  if (v.status !== current.status) {
    await syncVendorNeed(supabase, current.workspace_id, current.seed_key, v.status);
    await syncDepositConfirmation(supabase, current.workspace_id, current.seed_key, v.status);
  }
  const celebrate = await newlyCompleted(before);
  refreshAll();
  return { ok: true, celebrate };
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown task." };
  const s = taskSchema.shape.status.safeParse(status);
  if (!s.success) return { ok: false, error: "Unknown status." };
  await requireWorkspace();
  const supabase = await createClient();
  const before = await openMilestonesFor(id);
  const { data, error } = await supabase.from("tasks").update({ status: s.data }).eq("id", id).select("workspace_id,seed_key").single();
  if (error) return dbFailure(error, "We couldn't update the task.");
  await syncVendorNeed(supabase, data.workspace_id, data.seed_key, s.data);
  await syncDepositConfirmation(supabase, data.workspace_id, data.seed_key, s.data);
  const celebrate = await newlyCompleted(before);
  refreshAll();
  return { ok: true, celebrate };
}

export async function assignTask(id: string, assignee: TaskInput["assignee"]): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown task." };
  const a = taskSchema.shape.assignee.safeParse(assignee);
  if (!a.success) return { ok: false, error: "Unknown assignee." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ assignee: a.data }).eq("id", id);
  if (error) return dbFailure(error);
  refreshAll();
  return { ok: true };
}

export async function requestReassignment(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown task." };
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ reassign_requested_by: ctx.userId, reassign_requested_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return dbFailure(error);
  refreshAll();
  return { ok: true };
}

export async function dismissReassignment(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown task." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ reassign_requested_by: null, reassign_requested_at: null }).eq("id", id);
  if (error) return dbFailure(error);
  refreshAll();
  return { ok: true };
}

export async function rescheduleTask(id: string, newDate: string, reason: "moved_to_next_month" | "rescheduled"): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown task." };
  if (!isIsoDate(newDate)) return { ok: false, error: "Enter a valid date." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_task", { p_task_id: id, p_new_date: newDate, p_reason: reason });
  if (error) return dbFailure(error);
  refreshAll();
  return { ok: true };
}

/** Moves a task to the last day of the following month, keeping history. */
export async function moveToNextMonth(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown task." };
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data: t } = await supabase.from("tasks").select("due_date").eq("id", id).single();
  if (!t) return { ok: false, error: "That task no longer exists." };
  const base = t.due_date && t.due_date > ctx.today ? t.due_date : ctx.today;
  const target = endOfMonth(addMonthsToMonthStart(base, 1));
  return rescheduleTask(id, target, "moved_to_next_month");
}

export async function deleteTask(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown task." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return dbFailure(error, "We couldn't delete the task.");
  refreshAll();
  return { ok: true };
}

export async function addSubtask(taskId: string, title: string): Promise<ActionResult> {
  const t = z.string().trim().min(1, "Enter a subtask").max(200).safeParse(title);
  if (!uuid.safeParse(taskId).success || !t.success) return { ok: false, error: "Enter a subtask." };
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { count } = await supabase.from("task_subtasks").select("id", { count: "exact", head: true }).eq("task_id", taskId);
  const { error } = await supabase
    .from("task_subtasks")
    .insert({ workspace_id: ctx.workspaceId, task_id: taskId, title: t.data, sort_order: count ?? 0 });
  if (error) return dbFailure(error);
  refreshAll();
  return { ok: true };
}

export async function toggleSubtask(id: string, isDone: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown subtask." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("task_subtasks").update({ is_done: isDone }).eq("id", id);
  if (error) return dbFailure(error);
  refreshAll();
  return { ok: true };
}

export async function deleteSubtask(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown subtask." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("task_subtasks").delete().eq("id", id);
  if (error) return dbFailure(error);
  refreshAll();
  return { ok: true };
}

export async function addDependency(taskId: string, dependsOnTaskId: string): Promise<ActionResult> {
  if (!uuid.safeParse(taskId).success || !uuid.safeParse(dependsOnTaskId).success) return { ok: false, error: "Choose a task." };
  if (taskId === dependsOnTaskId) return { ok: false, error: "A task can't depend on itself." };
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_dependencies")
    .insert({ workspace_id: ctx.workspaceId, task_id: taskId, depends_on_task_id: dependsOnTaskId });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That dependency is already there." };
    return dbFailure(error);
  }
  refreshAll();
  return { ok: true };
}

export async function removeDependency(taskId: string, dependsOnTaskId: string): Promise<ActionResult> {
  if (!uuid.safeParse(taskId).success || !uuid.safeParse(dependsOnTaskId).success) return { ok: false, error: "Unknown task." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("task_dependencies").delete().eq("task_id", taskId).eq("depends_on_task_id", dependsOnTaskId);
  if (error) return dbFailure(error);
  refreshAll();
  return { ok: true };
}
