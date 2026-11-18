import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InsightTask } from "@/lib/planning/insights";
import type {
  ActivityRow,
  DependencyRow,
  MemberRow,
  MilestoneRow,
  MilestoneTaskRow,
  TaskCategoryRow,
  TaskRow,
  VendorNeedRow,
} from "@/lib/types";

/** All reads go through the signed-in client, so row level security applies. */

export async function listTasks(workspaceId: string): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Could not load tasks: ${error.message}`);
  return data;
}

export async function listCategories(workspaceId: string): Promise<TaskCategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_categories")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sort_order");
  if (error) throw new Error(`Could not load categories: ${error.message}`);
  return data;
}

export async function listDependencies(workspaceId: string): Promise<DependencyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("task_dependencies").select("*").eq("workspace_id", workspaceId);
  if (error) throw new Error(`Could not load dependencies: ${error.message}`);
  return data;
}

export async function listMilestones(workspaceId: string): Promise<{ milestones: MilestoneRow[]; links: MilestoneTaskRow[] }> {
  const supabase = await createClient();
  const [m, l] = await Promise.all([
    supabase.from("milestones").select("*").eq("workspace_id", workspaceId).order("sort_order"),
    supabase.from("milestone_tasks").select("*").eq("workspace_id", workspaceId),
  ]);
  if (m.error) throw new Error(`Could not load milestones: ${m.error.message}`);
  if (l.error) throw new Error(`Could not load milestones: ${l.error.message}`);
  return { milestones: m.data, links: l.data };
}

export async function listVendorNeeds(workspaceId: string): Promise<VendorNeedRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_needs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sort_order");
  if (error) throw new Error(`Could not load vendors: ${error.message}`);
  return data;
}

export async function listActivity(workspaceId: string, limit = 12): Promise<ActivityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load activity: ${error.message}`);
  return data;
}

export async function listMembers(workspaceId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspace_members").select("*").eq("workspace_id", workspaceId);
  if (error) throw new Error(`Could not load members: ${error.message}`);
  return data;
}

export async function pendingInvitation(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_invitations")
    .select("id,email,expires_at,created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data;
}

export function toInsightTask(t: TaskRow): InsightTask {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    completedAt: t.completed_at,
    isBooking: t.is_booking,
    assignee: t.assignee,
  };
}

/** Maps a user id to "Arghavan" / "Bayan" using their partner slot. */
export function actorNamer(members: MemberRow[], names: { partner1: string; partner2: string }) {
  const bySlot = new Map(members.map((m) => [m.user_id, m.partner_slot === 1 ? names.partner1 : names.partner2]));
  return (userId: string | null) => (userId ? bySlot.get(userId) ?? "Someone" : "Someone");
}
