import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayInZone } from "@/lib/planning/dates";
import type { MemberRow, PartnerNames, ProfileRow, SettingsRow } from "@/lib/types";

export interface Viewer {
  userId: string;
  email: string;
  profile: ProfileRow | null;
  member: MemberRow | null;
  settings: SettingsRow | null;
}

/** The signed-in person, verified with the auth server. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;

  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("workspace_members").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  let settings: SettingsRow | null = null;
  if (member) {
    const { data: s } = await supabase.from("wedding_settings").select("*").eq("workspace_id", member.workspace_id).single();
    settings = s;
  }

  return { userId: user.id, email: user.email ?? "", profile, member, settings };
});

export interface WorkspaceContext {
  userId: string;
  email: string;
  profile: ProfileRow | null;
  member: MemberRow;
  settings: SettingsRow;
  workspaceId: string;
  names: PartnerNames;
  myName: string;
  today: string;
  timeZone: string;
}

/** For pages inside the app: requires sign-in and a finished workspace setup. */
export const requireWorkspace = cache(async (): Promise<WorkspaceContext> => {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.member || !viewer.settings) redirect("/setup");
  if (!viewer.settings.setup_completed_at && viewer.member.role === "owner") redirect("/setup");

  const names = { partner1: viewer.settings.partner1_name, partner2: viewer.settings.partner2_name };
  const timeZone = viewer.profile?.time_zone ?? viewer.settings.planning_time_zone;
  return {
    userId: viewer.userId,
    email: viewer.email,
    profile: viewer.profile,
    member: viewer.member,
    settings: viewer.settings,
    workspaceId: viewer.member.workspace_id,
    names,
    myName: viewer.member.partner_slot === 1 ? names.partner1 : names.partner2,
    today: todayInZone(viewer.settings.planning_time_zone),
    timeZone,
  };
});
