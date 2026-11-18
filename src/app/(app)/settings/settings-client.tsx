"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Badge, Button, Card, CardTitle, Field, Input, Select, Textarea, buttonClass, cx } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { CopyButton } from "@/components/copy-button";
import { useCelebrate } from "@/components/shell/celebration";
import {
  addVendorNeed,
  applyTimingChange,
  createInvitation,
  deleteVendorNeed,
  previewTimingChange,
  revokeInvitation,
  updateProfile,
  updateSettings,
  updateVendorNeed,
} from "@/app/(app)/actions/settings";
import { settingsSchema, type SettingsInput } from "@/lib/validation/settings";
import { COMMON_TIME_ZONES } from "@/lib/validation/setup";
import { formatLongDate, formatShortDate } from "@/lib/planning/dates";
import type { DateChangePlan, ProposedChange } from "@/lib/planning/schedule";
import type { VendorNeedStatus } from "@/lib/types";

function TimeZoneOptions({ current }: { current: string }) {
  const known = COMMON_TIME_ZONES.some((t) => t.value === current);
  return (
    <>
      {!known ? <option value={current}>{current}</option> : null}
      {COMMON_TIME_ZONES.map((tz) => (
        <option key={tz.value} value={tz.value}>
          {tz.label}
        </option>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Wedding date with confirmation before anything is rescheduled              */
/* ------------------------------------------------------------------------- */

export function DateSettings({ weddingDate, weddingMonth }: { weddingDate: string | null; weddingMonth: string }) {
  const router = useRouter();
  const { notify } = useCelebrate();
  const [date, setDate] = useState(weddingDate ?? "");
  const [month, setMonth] = useState(weddingMonth);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DateChangePlan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const changed = (date || null) !== weddingDate || month !== weddingMonth;

  function review() {
    setError(null);
    start(async () => {
      const res = await previewTimingChange({ weddingDate: date, weddingMonth: month });
      if (!res.ok) {
        setError(res.fieldErrors ? Object.values(res.fieldErrors)[0] : res.error);
        return;
      }
      setPlan(res.data!);
      setSelected(new Set(res.data!.suggested.map((c) => c.taskId)));
    });
  }

  function apply() {
    if (!plan) return;
    const all = [...plan.suggested, ...plan.manual];
    const changes = all.filter((c) => selected.has(c.taskId)).map((c) => ({ taskId: c.taskId, dueDate: c.to }));
    start(async () => {
      const res = await applyTimingChange({ timing: { weddingDate: date, weddingMonth: month }, changes });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPlan(null);
      notify(`Wedding date saved. ${res.data!.moved} ${res.data!.moved === 1 ? "task" : "tasks"} rescheduled.`);
      router.refresh();
    });
  }

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <Card>
      <span id="date" className="relative -top-20 block" aria-hidden />
      <CardTitle eyebrow="The big day">Wedding date</CardTitle>
      {error ? (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Exact wedding date" htmlFor="s-date" hint={date ? formatLongDate(date) : "Not set yet"}>
          <Input
            id="s-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (e.target.value) setMonth(e.target.value.slice(0, 7));
            }}
          />
        </Field>
        <Field label="Wedding month" htmlFor="s-month" hint="Used for planning until the exact date is set.">
          <Input id="s-month" type="month" value={month} disabled={Boolean(date)} onChange={(e) => setMonth(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={review} disabled={!changed || pending}>
          {pending && !plan ? "Checking…" : "Review and save"}
        </Button>
        {weddingDate ? (
          <Button variant="ghost" onClick={() => setDate("")} disabled={pending}>
            Clear exact date
          </Button>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted">Nothing is rescheduled until you confirm which tasks should move.</p>

      <Dialog open={plan !== null} onClose={() => setPlan(null)} title="Confirm rescheduling" wide>
        {plan ? (
          <div className="space-y-5">
            <p className="text-muted">
              New timing: <strong className="text-text">{date ? formatLongDate(date) : `${month} (no exact date)`}</strong>.
              {plan.suggested.length + plan.manual.length === 0 ? " No task dates need to change." : " Choose which tasks should move."}
            </p>
            {plan.suggested.length > 0 ? (
              <ChangeList
                title={`Suggested dates (${plan.suggested.length})`}
                note="These still follow the planning timeline. All are selected."
                changes={plan.suggested}
                selected={selected}
                toggle={toggle}
                today={today}
              />
            ) : null}
            {plan.manual.length > 0 ? (
              <ChangeList
                title={`Dates you set by hand (${plan.manual.length})`}
                note="Kept as they are unless you tick them."
                changes={plan.manual}
                selected={selected}
                toggle={toggle}
                today={today}
              />
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setPlan(null)}>
                Cancel
              </Button>
              <Button onClick={apply} disabled={pending}>
                {pending ? "Saving…" : `Save date and move ${selected.size} ${selected.size === 1 ? "task" : "tasks"}`}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </Card>
  );
}

function ChangeList({
  title,
  note,
  changes,
  selected,
  toggle,
  today,
}: {
  title: string;
  note: string;
  changes: ProposedChange[];
  selected: Set<string>;
  toggle: (id: string) => void;
  today: string;
}) {
  const past = changes.filter((c) => c.isPast).length;
  return (
    <section>
      <h3 className="font-sans text-sm font-semibold">{title}</h3>
      <p className="mb-2 text-xs text-muted">
        {note}
        {past > 0 ? ` ${past} would land in the past and are flagged.` : ""}
      </p>
      <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {changes.map((c) => (
          <li key={c.taskId} className="flex items-center gap-3 px-3 py-2 text-sm">
            <input
              id={`chg-${c.taskId}`}
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={selected.has(c.taskId)}
              onChange={() => toggle(c.taskId)}
            />
            <label htmlFor={`chg-${c.taskId}`} className="flex-1">
              {c.title}
              <span className="block text-xs text-muted">
                {c.from ? formatShortDate(c.from, today) : "No date"} → {formatShortDate(c.to, today)}
              </span>
            </label>
            {c.isPast ? <Badge tone="danger">Already past</Badge> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* Wedding details                                                            */
/* ------------------------------------------------------------------------- */

export function DetailsForm({ defaults }: { defaults: SettingsInput }) {
  const router = useRouter();
  const { notify } = useCelebrate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError, control } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema, undefined, { raw: true }),
    defaultValues: defaults,
  });
  const e = formState.errors;
  const weeklySummaryOn = useWatch({ control, name: "weeklySummary" });

  return (
    <Card>
      <span id="budget" className="relative -top-20 block" aria-hidden />
      <CardTitle eyebrow="Shared">Wedding details</CardTitle>
      <form
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit(async (values) => {
          setServerError(null);
          const res = await updateSettings(values);
          if (!res.ok) {
            for (const [k, m] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof SettingsInput, { message: m });
            setServerError(res.error);
            return;
          }
          notify("Settings saved");
          router.refresh();
        })}
      >
        {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-sans text-sm font-semibold">Couple and venue</legend>
          <Field label="Partner 1" htmlFor="partner1Name" error={e.partner1Name?.message}>
            <Input id="partner1Name" {...register("partner1Name")} />
          </Field>
          <Field label="Partner 2" htmlFor="partner2Name" error={e.partner2Name?.message}>
            <Input id="partner2Name" {...register("partner2Name")} />
          </Field>
          <Field label="Venue" htmlFor="venueName" error={e.venueName?.message}>
            <Input id="venueName" {...register("venueName")} />
          </Field>
          <Field label="Location" htmlFor="venueLocation" error={e.venueLocation?.message}>
            <Input id="venueLocation" {...register("venueLocation")} />
          </Field>
          <Field label="Venue time zone" htmlFor="venueTimeZone">
            <Select id="venueTimeZone" {...register("venueTimeZone")}>
              <TimeZoneOptions current={defaults.venueTimeZone} />
            </Select>
          </Field>
          <Field label="Planning time zone" htmlFor="planningTimeZone" hint="Decides when 'today' starts for deadlines.">
            <Select id="planningTimeZone" {...register("planningTimeZone")}>
              <TimeZoneOptions current={defaults.planningTimeZone} />
            </Select>
          </Field>
          <Field label="Venue deposit status" htmlFor="venueDepositStatus" className="sm:col-span-2" hint="The amount itself is recorded in Budget & Payments (Phase 3).">
            <Input id="venueDepositStatus" {...register("venueDepositStatus")} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-sans text-sm font-semibold">Guests and budget</legend>
          <Field label="Estimated guest count" htmlFor="estimatedGuestCount" error={e.estimatedGuestCount?.message}>
            <Input id="estimatedGuestCount" inputMode="numeric" {...register("estimatedGuestCount")} />
          </Field>
          <Field label="Confirmed guest count" htmlFor="confirmedGuestCount" error={e.confirmedGuestCount?.message}>
            <Input id="confirmedGuestCount" inputMode="numeric" {...register("confirmedGuestCount")} />
          </Field>
          <Field label="Total budget (USD)" htmlFor="totalBudget" error={e.totalBudget?.message} hint="Leave blank until you've agreed on it.">
            <Input id="totalBudget" inputMode="decimal" {...register("totalBudget")} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-sans text-sm font-semibold">Ceremony and reception</legend>
          <Field label="Ceremony start" htmlFor="ceremonyStart" error={e.ceremonyStart?.message}>
            <Input id="ceremonyStart" type="time" {...register("ceremonyStart")} />
          </Field>
          <Field label="Event end" htmlFor="eventEnd" error={e.eventEnd?.message}>
            <Input id="eventEnd" type="time" {...register("eventEnd")} />
          </Field>
          <Field label="Ceremony" htmlFor="ceremonySetting" error={e.ceremonySetting?.message}>
            <Input id="ceremonySetting" {...register("ceremonySetting")} />
          </Field>
          <Field label="Reception" htmlFor="receptionSetting" error={e.receptionSetting?.message}>
            <Input id="receptionSetting" {...register("receptionSetting")} />
          </Field>
          <Field label="Ceremony traditions" htmlFor="ceremonyTradition" error={e.ceremonyTradition?.message}>
            <Input id="ceremonyTradition" {...register("ceremonyTradition")} />
          </Field>
          <Field label="Wedding style" htmlFor="weddingStyle" error={e.weddingStyle?.message}>
            <Input id="weddingStyle" {...register("weddingStyle")} />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" {...register("sofrehAghd")} />
            Sofreh aghd
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" {...register("alcoholServed")} />
            Alcoholic beverages served
          </label>
          <Field label="Catering" htmlFor="cateringNotes" className="sm:col-span-2">
            <Textarea id="cateringNotes" rows={2} {...register("cateringNotes")} />
          </Field>
          <Field label="Outside vendors" htmlFor="outsideVendorNotes" className="sm:col-span-2">
            <Textarea id="outsideVendorNotes" rows={2} {...register("outsideVendorNotes")} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-sans text-sm font-semibold">Planning preferences</legend>
          <Field label="Planning reminders" htmlFor="reminderFrequency" hint="Saved. Delivery is built in Phase 3.">
            <Select id="reminderFrequency" {...register("reminderFrequency")}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="none">No reminders</option>
            </Select>
          </Field>
          <Field label="Preferred check-in day" htmlFor="checkinDay" error={e.checkinDay?.message}>
            <Select id="checkinDay" {...register("checkinDay")}>
              <option value="">Not chosen</option>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dividing tasks" htmlFor="taskDivision">
            <Select id="taskDivision" {...register("taskDivision")}>
              <option value="task_by_task">Decide task by task</option>
              <option value="balanced">Keep it roughly even</option>
              <option value="mostly_together">Do most things together</option>
            </Select>
          </Field>
          <label className="flex items-center gap-3 self-end pb-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" {...register("weeklySummary")} />
            Weekly summaries {weeklySummaryOn ? <span className="text-xs text-muted">(sending starts in Phase 3)</span> : null}
          </label>
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
            {formState.isSubmitting ? "Saving…" : "Save details"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------------- */
/* Partner access                                                             */
/* ------------------------------------------------------------------------- */

export function PartnerSettings({
  members,
  pendingInvite,
  partnerName,
}: {
  members: { userId: string; role: string; name: string; displayName: string; isMe: boolean }[];
  pendingInvite: { email: string; expiresAt: string } | null;
  partnerName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ link: string; email: string } | null>(null);
  const [pending, start] = useTransition();
  const joined = members.length >= 2;

  return (
    <Card>
      <span id="partner" className="relative -top-20 block" aria-hidden />
      <CardTitle eyebrow="Access">Partners</CardTitle>
      <ul className="mb-4 space-y-2">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{m.name}</span>
              {m.displayName && m.displayName !== m.name ? <span className="text-muted"> ({m.displayName})</span> : null}
              {m.isMe ? <span className="text-muted"> · you</span> : null}
            </span>
            <Badge tone="success">Joined</Badge>
          </li>
        ))}
      </ul>
      {joined ? (
        <p className="text-sm text-muted">You&apos;re both in. This wedding space is limited to the two of you.</p>
      ) : (
        <div className="space-y-4">
          {pendingInvite && !created ? (
            <Alert>
              Invitation sent to <strong>{pendingInvite.email}</strong>, open until {formatLongDate(pendingInvite.expiresAt.slice(0, 10))}.{" "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() =>
                  start(async () => {
                    await revokeInvitation();
                    router.refresh();
                  })
                }
              >
                Cancel it
              </button>
            </Alert>
          ) : null}
          {created ? (
            <div className="space-y-3">
              <Alert tone="success">Invitation created for {created.email}.</Alert>
              <div className="rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs break-all">{created.link}</div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={created.link} />
                <a
                  className={buttonClass("secondary")}
                  href={`mailto:${encodeURIComponent(created.email)}?subject=${encodeURIComponent("Join our wedding planning space")}&body=${encodeURIComponent(`Use this link to create your login and join:\n\n${created.link}\n\nIt works for 14 days and only for this email address.`)}`}
                >
                  Open in my email app
                </a>
              </div>
            </div>
          ) : (
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                start(async () => {
                  const res = await createInvitation(email);
                  if (!res.ok) setError(res.fieldErrors ? Object.values(res.fieldErrors)[0] : res.error);
                  else {
                    setCreated(res.data!);
                    router.refresh();
                  }
                });
              }}
            >
              <Field label={`Invite ${partnerName}`} htmlFor="invite-email" error={error ?? undefined} className="flex-1">
                <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Button type="submit" disabled={pending || !email}>
                {pendingInvite ? "Replace invitation" : "Create invitation"}
              </Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------------- */
/* Vendors booked vs needed                                                   */
/* ------------------------------------------------------------------------- */

export function VendorSettings({ vendors }: { vendors: { id: string; category: string; label: string; status: VendorNeedStatus }[] }) {
  const router = useRouter();
  const { notify } = useCelebrate();
  const [label, setLabel] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) notify(res.error ?? "Something went wrong");
      else {
        after?.();
        router.refresh();
      }
    });

  return (
    <Card>
      <span id="vendors" className="relative -top-20 block" aria-hidden />
      <CardTitle eyebrow="Vendors">Booked vs. needed</CardTitle>
      <p className="mb-4 text-sm text-muted">
        A quick status list until the full vendor manager arrives in Phase 3. Marking planner, photographer, videographer, DJ or florist booked
        also completes its &ldquo;Book…&rdquo; task.
      </p>
      <ul className={cx("divide-y divide-line rounded-2xl border border-line", pending && "opacity-70")}>
        {vendors.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <label htmlFor={`vn-${v.id}`} className="text-sm font-medium">
              {v.label}
            </label>
            <div className="flex items-center gap-2">
              <Select
                id={`vn-${v.id}`}
                className="h-9 w-36"
                value={v.status}
                onChange={(e) => run(() => updateVendorNeed(v.id, e.target.value as VendorNeedStatus))}
              >
                <option value="not_booked">Not booked</option>
                <option value="booked">Booked</option>
                <option value="not_needed">Not needed</option>
              </Select>
              {v.category !== "venue" && !["planner", "photographer", "videographer", "dj", "florist"].includes(v.category) ? (
                <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => run(() => deleteVendorNeed(v.id))}>
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (label.trim()) run(() => addVendorNeed(label), () => setLabel(""));
        }}
      >
        <label htmlFor="new-vendor" className="sr-only">
          Vendor type
        </label>
        <Input id="new-vendor" placeholder="Add a vendor type, e.g. Hair and makeup" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={pending || !label.trim()}>
          Add
        </Button>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------------- */
/* Your profile                                                               */
/* ------------------------------------------------------------------------- */

export function ProfileSettings({ displayName, timeZone, email }: { displayName: string; timeZone: string; email: string }) {
  const router = useRouter();
  const { notify } = useCelebrate();
  const [name, setName] = useState(displayName);
  const [tz, setTz] = useState(timeZone);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as const);
  const [pending, start] = useTransition();

  function applyTheme(next: "system" | "light" | "dark") {
    try {
      if (next === "system") localStorage.removeItem("owe-theme");
      else localStorage.setItem("owe-theme", next);
    } catch {}
    const dark = next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    themeListeners.forEach((l) => l());
  }

  return (
    <Card>
      <CardTitle eyebrow="Just you">Your profile</CardTitle>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await updateProfile({ displayName: name, timeZone: tz });
            notify(res.ok ? "Profile saved" : res.error);
            if (res.ok) router.refresh();
          });
        }}
      >
        <Field label="Display name" htmlFor="p-name">
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Your time zone" htmlFor="p-tz" hint="For showing times in history and activity.">
          <Select id="p-tz" value={tz} onChange={(e) => setTz(e.target.value)}>
            <TimeZoneOptions current={timeZone} />
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" disabled={pending}>
            Save profile
          </Button>
        </div>
      </form>
      <div className="mt-6 border-t border-line pt-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Appearance (this device)</legend>
          <div className="inline-flex rounded-full border border-line p-1">
            {(["system", "light", "dark"] as const).map((t) => (
              <label
                key={t}
                className={cx(
                  "cursor-pointer rounded-full px-4 py-1.5 text-sm capitalize",
                  theme === t ? "bg-primary text-primary-fg" : "text-muted",
                )}
              >
                <input type="radio" name="theme" className="sr-only" checked={theme === t} onChange={() => applyTheme(t)} />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mt-6 border-t border-line pt-5 text-sm">
        <p className="text-muted">Signed in as {email}</p>
        <Link href="/forgot-password" className="text-primary underline underline-offset-4">
          Change password by email link
        </Link>
      </div>
    </Card>
  );
}

const themeListeners = new Set<() => void>();
function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}
function readTheme(): "system" | "light" | "dark" {
  try {
    const saved = localStorage.getItem("owe-theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}
