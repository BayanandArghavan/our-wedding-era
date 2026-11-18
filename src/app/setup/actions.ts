"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { buildSeedPayload } from "@/lib/planning/seed";
import { monthStart } from "@/lib/planning/dates";
import { detailsSchema, type DetailsInput } from "@/lib/validation/setup";
import { dbFailure, zodFailure, type ActionResult } from "@/lib/actions";
import { siteUrl } from "@/lib/site";
import { DEPOSIT_CONFIRMATION_TASK, syncBookingTask } from "@/lib/data/links";

const DEFAULT_WEDDING_MONTH = "2027-09-01";

export async function createWorkspace(input: DetailsInput): Promise<ActionResult> {
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const v = parsed.data;

  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Your session ended. Please sign in again." };
  if (viewer.member) return { ok: true };

  const timing = {
    weddingDate: v.weddingDate,
    weddingMonth: v.weddingDate ? monthStart(v.weddingDate) : DEFAULT_WEDDING_MONTH,
  };
  if (timing.weddingMonth < "2026-11-01") {
    return { ok: false, error: "Validation failed", fieldErrors: { weddingDate: "The wedding date must be after planning begins (November 2026)." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_workspace", {
    p_partner_slot: Number(v.partnerSlot),
    p_settings: {
      partner1_name: v.partner1Name,
      partner2_name: v.partner2Name,
      wedding_date: v.weddingDate ?? "",
      wedding_month: timing.weddingMonth,
      total_budget: v.totalBudget ?? "",
      estimated_guest_count: v.estimatedGuestCount,
      confirmed_guest_count: v.confirmedGuestCount ?? "",
      planning_time_zone: v.planningTimeZone,
    },
    ...buildSeedPayload(timing),
  });
  if (error) return dbFailure(error, "We couldn't create your wedding space. Please try again.");

  // Start the creator's display time zone at the planning time zone.
  await supabase
    .from("profiles")
    .update({ time_zone: v.planningTimeZone })
    .eq("id", viewer.userId);
  return { ok: true };
}

export async function invitePartner(email: string): Promise<ActionResult<{ link: string; email: string }>> {
  const parsed = z.string().trim().toLowerCase().email("Enter a valid email address").safeParse(email);
  if (!parsed.success) return zodFailure(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_partner_invitation", { p_email: parsed.data });
  if (error || !data) return dbFailure(error, "We couldn't create the invitation.");
  const link = `${await siteUrl()}/invite/${data}`;
  return { ok: true, data: { link, email: parsed.data } };
}

const preferencesSchema = z.object({
  reminderFrequency: z.enum(["daily", "weekly", "monthly", "none"]),
  checkinDay: z.coerce.number().int().min(1).max(28),
  weeklySummary: z.boolean(),
  taskDivision: z.enum(["task_by_task", "balanced", "mostly_together"]),
});

export async function savePreferences(input: z.input<typeof preferencesSchema>): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const viewer = await getViewer();
  if (!viewer?.member) return { ok: false, error: "Create your wedding space first." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("wedding_settings")
    .update({
      reminder_frequency: parsed.data.reminderFrequency,
      checkin_day_of_month: parsed.data.checkinDay,
      weekly_summary: parsed.data.weeklySummary,
      task_division: parsed.data.taskDivision,
      setup_step: 5,
    })
    .eq("workspace_id", viewer.member.workspace_id);
  if (error) return dbFailure(error);
  return { ok: true };
}

export async function setSetupStep(step: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.member) return { ok: false, error: "Create your wedding space first." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("wedding_settings")
    .update({ setup_step: Math.max(1, Math.min(6, Math.trunc(step))) })
    .eq("workspace_id", viewer.member.workspace_id);
  if (error) return dbFailure(error);
  return { ok: true };
}

const statusSchema = z.object({
  venueSecured: z.boolean(),
  venueConfirmationReceived: z.boolean(),
  vendors: z.record(z.string(), z.enum(["not_booked", "booked", "not_needed"])),
});

export async function finishSetup(input: z.input<typeof statusSchema>): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const viewer = await getViewer();
  if (!viewer?.member) return { ok: false, error: "Create your wedding space first." };
  const ws = viewer.member.workspace_id;
  const supabase = await createClient();

  const venue = await supabase
    .from("milestones")
    .update({ is_completed: parsed.data.venueSecured, completed_on: null })
    .eq("workspace_id", ws)
    .eq("seed_key", "venue_secured");
  if (venue.error) return dbFailure(venue.error);

  const venueNeed = await supabase
    .from("vendor_needs")
    .update({ status: parsed.data.venueSecured ? "booked" : "not_booked" })
    .eq("workspace_id", ws)
    .eq("category", "venue");
  if (venueNeed.error) return dbFailure(venueNeed.error);

  if (parsed.data.venueConfirmationReceived) {
    await supabase
      .from("tasks")
      .update({ status: "completed" })
      .eq("workspace_id", ws)
      .eq("seed_key", DEPOSIT_CONFIRMATION_TASK)
      .neq("status", "completed");
  }

  for (const [category, status] of Object.entries(parsed.data.vendors)) {
    const { error } = await supabase.from("vendor_needs").update({ status }).eq("workspace_id", ws).eq("category", category);
    if (error) return dbFailure(error);
    await syncBookingTask(supabase, ws, category, status);
  }

  const { error } = await supabase
    .from("wedding_settings")
    .update({
      venue_confirmation_received: parsed.data.venueConfirmationReceived,
      setup_step: 6,
      setup_completed_at: new Date().toISOString(),
    })
    .eq("workspace_id", ws);
  if (error) return dbFailure(error);
  redirect("/?welcome=1");
}
