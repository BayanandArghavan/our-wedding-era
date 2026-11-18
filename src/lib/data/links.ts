import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { TaskStatus, VendorNeedStatus } from "@/lib/types";

type Db = SupabaseClient<Database>;

/** Vendor booking status <-> the checklist task that books that vendor. */
export const VENDOR_BOOKING_TASK: Record<string, string> = {
  planner: "admin_book_planner",
  photographer: "photo_book",
  videographer: "video_book",
  dj: "dj_book",
  florist: "floral_book",
};
const TASK_TO_VENDOR = Object.fromEntries(Object.entries(VENDOR_BOOKING_TASK).map(([v, t]) => [t, v]));

export const DEPOSIT_CONFIRMATION_TASK = "venue_deposit_confirmation";

function taskStatusFor(need: VendorNeedStatus): TaskStatus | null {
  if (need === "booked") return "completed";
  if (need === "not_needed") return "not_applicable";
  return null;
}

/** After a vendor need changes, bring its booking task in line. */
export async function syncBookingTask(db: Db, workspaceId: string, category: string, status: VendorNeedStatus) {
  const seedKey = VENDOR_BOOKING_TASK[category];
  if (!seedKey) return;
  const { data: task } = await db
    .from("tasks")
    .select("id,status")
    .eq("workspace_id", workspaceId)
    .eq("seed_key", seedKey)
    .maybeSingle();
  if (!task) return;
  const target = taskStatusFor(status);
  if (target && task.status !== target) {
    await db.from("tasks").update({ status: target }).eq("id", task.id);
  } else if (!target && (task.status === "completed" || task.status === "not_applicable")) {
    await db.from("tasks").update({ status: "not_started" }).eq("id", task.id);
  }
}

/** After a booking task's status changes, bring its vendor need in line. */
export async function syncVendorNeed(db: Db, workspaceId: string, seedKey: string | null, status: TaskStatus) {
  if (!seedKey) return;
  const category = TASK_TO_VENDOR[seedKey];
  if (!category) return;
  const target: VendorNeedStatus = status === "completed" ? "booked" : status === "not_applicable" ? "not_needed" : "not_booked";
  await db.from("vendor_needs").update({ status: target }).eq("workspace_id", workspaceId).eq("category", category).neq("status", target);
}

/** Keeps the "written deposit confirmation" setting and its task in step. */
export async function syncDepositConfirmation(db: Db, workspaceId: string, seedKey: string | null, status: TaskStatus) {
  if (seedKey !== DEPOSIT_CONFIRMATION_TASK) return;
  await db
    .from("wedding_settings")
    .update({ venue_confirmation_received: status === "completed" })
    .eq("workspace_id", workspaceId);
}
