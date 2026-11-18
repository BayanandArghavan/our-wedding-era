import { requireWorkspace } from "@/lib/data/viewer";
import { listMembers, listVendorNeeds, pendingInvitation } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { DateSettings, DetailsForm, PartnerSettings, ProfileSettings, VendorSettings } from "./settings-client";
import { signOut } from "@/app/(auth)/actions";

export const metadata = { title: "Settings · Our Wedding Era" };

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  const s = ctx.settings;
  const [members, vendors, invite] = await Promise.all([
    listMembers(ctx.workspaceId),
    listVendorNeeds(ctx.workspaceId),
    pendingInvitation(ctx.workspaceId),
  ]);
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("id,display_name").in("id", members.map((m) => m.user_id));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Settings" title="Wedding settings">
        Everything here is shared between you, except your own profile at the bottom.
      </PageHeader>

      <DateSettings weddingDate={s.wedding_date} weddingMonth={s.wedding_month.slice(0, 7)} />

      <DetailsForm
        defaults={{
          partner1Name: s.partner1_name,
          partner2Name: s.partner2_name,
          venueName: s.venue_name,
          venueLocation: s.venue_location,
          venueTimeZone: s.venue_time_zone,
          planningTimeZone: s.planning_time_zone,
          estimatedGuestCount: s.estimated_guest_count,
          confirmedGuestCount: s.confirmed_guest_count?.toString() ?? "",
          ceremonyStart: s.ceremony_start.slice(0, 5),
          eventEnd: s.event_end.slice(0, 5),
          ceremonySetting: s.ceremony_setting,
          receptionSetting: s.reception_setting,
          weddingStyle: s.wedding_style,
          ceremonyTradition: s.ceremony_tradition,
          sofrehAghd: s.sofreh_aghd,
          alcoholServed: s.alcohol_served,
          cateringNotes: s.catering_notes,
          outsideVendorNotes: s.outside_vendor_notes,
          venueDepositStatus: s.venue_deposit_status,
          totalBudget: s.total_budget?.toString() ?? "",
          reminderFrequency: s.reminder_frequency as "weekly",
          checkinDay: s.checkin_day_of_month?.toString() ?? "",
          weeklySummary: s.weekly_summary,
          taskDivision: s.task_division as "task_by_task",
        }}
      />

      <PartnerSettings
        members={members.map((m) => ({
          userId: m.user_id,
          role: m.role,
          name: m.partner_slot === 1 ? ctx.names.partner1 : ctx.names.partner2,
          displayName: profiles?.find((p) => p.id === m.user_id)?.display_name ?? "",
          isMe: m.user_id === ctx.userId,
        }))}
        pendingInvite={invite ? { email: invite.email, expiresAt: invite.expires_at } : null}
        partnerName={ctx.member.partner_slot === 1 ? ctx.names.partner2 : ctx.names.partner1}
      />

      <VendorSettings vendors={vendors.map((v) => ({ id: v.id, category: v.category, label: v.label, status: v.status }))} />

      <ProfileSettings displayName={ctx.profile?.display_name ?? ""} timeZone={ctx.timeZone} email={ctx.email} />

      <form action={signOut}>
        <button className="text-sm text-muted underline underline-offset-4 hover:text-primary">Sign out</button>
      </form>
    </div>
  );
}
