"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/data/viewer";
import { listTasks } from "@/lib/data/queries";
import { syncBookingTask } from "@/lib/data/links";
import { planDateChange, type DateChangePlan } from "@/lib/planning/schedule";
import { isIsoDate } from "@/lib/planning/dates";
import { dbFailure, zodFailure, type ActionResult } from "@/lib/actions";
import { settingsSchema, timingSchema, type SettingsInput, type TimingInput } from "@/lib/validation/settings";
import { isValidTimeZone } from "@/lib/validation/setup";
import { siteUrl } from "@/lib/site";

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const v = parsed.data;
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("wedding_settings")
    .update({
      partner1_name: v.partner1Name,
      partner2_name: v.partner2Name,
      venue_name: v.venueName,
      venue_location: v.venueLocation,
      venue_time_zone: v.venueTimeZone,
      planning_time_zone: v.planningTimeZone,
      estimated_guest_count: v.estimatedGuestCount,
      confirmed_guest_count: v.confirmedGuestCount === "" ? null : Number(v.confirmedGuestCount),
      ceremony_start: v.ceremonyStart,
      event_end: v.eventEnd,
      ceremony_setting: v.ceremonySetting,
      reception_setting: v.receptionSetting,
      wedding_style: v.weddingStyle,
      ceremony_tradition: v.ceremonyTradition,
      sofreh_aghd: v.sofrehAghd,
      alcohol_served: v.alcoholServed,
      catering_notes: v.cateringNotes,
      outside_vendor_notes: v.outsideVendorNotes,
      venue_deposit_status: v.venueDepositStatus,
      total_budget: v.totalBudget === "" ? null : Number(v.totalBudget),
      reminder_frequency: v.reminderFrequency,
      checkin_day_of_month: v.checkinDay === "" ? null : Number(v.checkinDay),
      weekly_summary: v.weeklySummary,
      task_division: v.taskDivision,
    })
    .eq("workspace_id", ctx.workspaceId);
  if (error) return dbFailure(error, "We couldn't save your settings.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

/** Step 1 of a date change: show what would move. Changes nothing. */
export async function previewTimingChange(input: TimingInput): Promise<ActionResult<DateChangePlan>> {
  const parsed = timingSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const ctx = await requireWorkspace();
  const tasks = await listTasks(ctx.workspaceId);
  const plan = planDateChange(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.due_date,
      dateSource: t.date_source,
      monthsBefore: t.months_before,
      daysBefore: t.days_before,
    })),
    { weddingDate: parsed.data.weddingDate || null, weddingMonth: `${parsed.data.weddingMonth}-01` },
    ctx.today,
  );
  return { ok: true, data: plan };
}

const applySchema = z.object({
  timing: timingSchema,
  changes: z.array(z.object({ taskId: z.string().uuid(), dueDate: z.string().refine(isIsoDate) })).max(1000),
});

/** Step 2: apply the new date and only the task moves the couple approved. */
export async function applyTimingChange(input: z.input<typeof applySchema>): Promise<ActionResult<{ moved: number }>> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  await requireWorkspace();
  const supabase = await createClient();
  const { timing, changes } = parsed.data;
  const { data, error } = await supabase.rpc("apply_wedding_date_change", {
    p_wedding_date: (timing.weddingDate || null) as string,
    p_wedding_month: `${timing.weddingMonth}-01`,
    p_changes: changes.map((c) => ({ task_id: c.taskId, due_date: c.dueDate })),
  });
  if (error) return dbFailure(error, "We couldn't update the wedding date.");
  revalidatePath("/", "layout");
  return { ok: true, data: { moved: data ?? 0 } };
}

export async function updateVendorNeed(id: string, status: "not_booked" | "booked" | "not_needed"): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Unknown vendor." };
  if (!["not_booked", "booked", "not_needed"].includes(status)) return { ok: false, error: "Unknown status." };
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendor_needs").update({ status }).eq("id", id).select("category").single();
  if (error) return dbFailure(error);
  await syncBookingTask(supabase, ctx.workspaceId, data.category, status);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addVendorNeed(label: string): Promise<ActionResult> {
  const parsed = z.string().trim().min(1, "Enter a vendor type").max(60).safeParse(label);
  if (!parsed.success) return zodFailure(parsed.error);
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const category = parsed.data.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "other";
  const { count } = await supabase.from("vendor_needs").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId);
  const { error } = await supabase
    .from("vendor_needs")
    .insert({ workspace_id: ctx.workspaceId, category, label: parsed.data, sort_order: count ?? 0 });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That vendor type is already on the list." };
    return dbFailure(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteVendorNeed(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Unknown vendor." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_needs").delete().eq("id", id).neq("category", "venue");
  if (error) return dbFailure(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfile(input: { displayName: string; timeZone: string }): Promise<ActionResult> {
  const parsed = z
    .object({ displayName: z.string().trim().min(1, "Required").max(80), timeZone: z.string().refine(isValidTimeZone, "Choose a time zone") })
    .safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, time_zone: parsed.data.timeZone })
    .eq("id", ctx.userId);
  if (error) return dbFailure(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function createInvitation(email: string): Promise<ActionResult<{ link: string; email: string }>> {
  const parsed = z.string().trim().toLowerCase().email("Enter a valid email address").safeParse(email);
  if (!parsed.success) return zodFailure(parsed.error);
  await requireWorkspace();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_partner_invitation", { p_email: parsed.data });
  if (error || !data) return dbFailure(error, "We couldn't create the invitation.");
  revalidatePath("/settings");
  return { ok: true, data: { link: `${await siteUrl()}/invite/${data}`, email: parsed.data } };
}

export async function revokeInvitation(): Promise<ActionResult> {
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_partner_invitation");
  if (error) return dbFailure(error);
  revalidatePath("/settings");
  return { ok: true };
}
