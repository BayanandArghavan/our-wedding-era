"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/data/viewer";
import { isIsoDate } from "@/lib/planning/dates";
import { dbFailure, zodFailure, type ActionResult } from "@/lib/actions";

export async function setMilestoneCompleted(id: string, completed: boolean, completedOn: string | null): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Unknown milestone." };
  if (completedOn !== null && !isIsoDate(completedOn)) return { ok: false, error: "Enter a valid date." };
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("milestones")
    .update({ is_completed: completed, completed_on: completed ? (completedOn ?? ctx.today) : null })
    .eq("id", id)
    .select("title")
    .single();
  if (error) return dbFailure(error);
  revalidatePath("/", "layout");
  return { ok: true, celebrate: completed ? [data.title] : [] };
}

export async function setMilestoneDate(id: string, completedOn: string | null): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Unknown milestone." };
  if (completedOn !== null && !isIsoDate(completedOn)) return { ok: false, error: "Enter a valid date." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("milestones").update({ completed_on: completedOn }).eq("id", id).eq("is_completed", true);
  if (error) return dbFailure(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

const customSchema = z.object({
  title: z.string().trim().min(1, "Give it a name").max(120),
  description: z.string().trim().max(500).default(""),
});

export async function addCustomMilestone(input: z.input<typeof customSchema>): Promise<ActionResult> {
  const parsed = customSchema.safeParse(input);
  if (!parsed.success) return zodFailure(parsed.error);
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("milestones")
    .select("sort_order")
    .eq("workspace_id", ctx.workspaceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("milestones").insert({
    workspace_id: ctx.workspaceId,
    title: parsed.data.title,
    description: parsed.data.description,
    is_custom: true,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) return dbFailure(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCustomMilestone(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Unknown milestone." };
  await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("milestones").delete().eq("id", id).eq("is_custom", true);
  if (error) return dbFailure(error);
  revalidatePath("/", "layout");
  return { ok: true };
}
