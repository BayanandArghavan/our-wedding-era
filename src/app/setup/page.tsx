import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { listMembers, listVendorNeeds, pendingInvitation } from "@/lib/data/queries";
import { SetupWizard } from "./wizard";
import { signOut } from "@/app/(auth)/actions";

export const metadata = { title: "Set up · Our Wedding Era" };

export default async function SetupPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/setup");
  const { member, settings } = viewer;

  if (member && settings && (settings.setup_completed_at || member.role !== "owner")) redirect("/");

  const ws = member?.workspace_id;
  const [vendors, members, invite] = ws
    ? await Promise.all([listVendorNeeds(ws), listMembers(ws), pendingInvitation(ws)])
    : [[], [], null];

  return (
    <main className="min-h-dvh px-4 py-10 sm:py-16">
      <SetupWizard
        initialStep={settings?.setup_step ?? 1}
        hasWorkspace={Boolean(member)}
        myDisplayName={viewer.profile?.display_name ?? ""}
        defaults={{
          partner1Name: settings?.partner1_name ?? "Arghavan",
          partner2Name: settings?.partner2_name ?? "Bayan",
          weddingDate: settings?.wedding_date ?? "",
          estimatedGuestCount: settings?.estimated_guest_count ?? 160,
          planningTimeZone: settings?.planning_time_zone ?? "America/Los_Angeles",
          reminderFrequency: settings?.reminder_frequency ?? "weekly",
          checkinDay: settings?.checkin_day_of_month ?? null,
          weeklySummary: settings?.weekly_summary ?? false,
          taskDivision: settings?.task_division ?? "task_by_task",
          venueConfirmationReceived: settings?.venue_confirmation_received ?? false,
        }}
        pendingInviteEmail={invite?.email ?? null}
        partnerJoined={members.length >= 2}
        vendors={vendors.map((v) => ({ category: v.category, label: v.label, status: v.status }))}
      />
      <form action={signOut} className="mt-8 text-center">
        <button className="text-sm text-muted underline underline-offset-4 hover:text-primary">Sign out ({viewer.email})</button>
      </form>
    </main>
  );
}
