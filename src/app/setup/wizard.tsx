"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createWorkspace, finishSetup, invitePartner, savePreferences, setSetupStep } from "./actions";
import { COMMON_TIME_ZONES, detailsSchema, type DetailsInput } from "@/lib/validation/setup";
import { Alert, Button, Field, Input, Select, buttonClass, cx } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import type { VendorNeedStatus } from "@/lib/types";

const STEPS = ["Welcome", "Wedding details", "Invite partner", "Planning preferences", "Where things stand"];

export interface WizardProps {
  initialStep: number;
  hasWorkspace: boolean;
  defaults: {
    partner1Name: string;
    partner2Name: string;
    weddingDate: string;
    estimatedGuestCount: number;
    planningTimeZone: string;
    reminderFrequency: string;
    checkinDay: number | null;
    weeklySummary: boolean;
    taskDivision: string;
    venueConfirmationReceived: boolean;
  };
  pendingInviteEmail: string | null;
  partnerJoined: boolean;
  vendors: { category: string; label: string; status: VendorNeedStatus }[];
  myDisplayName: string;
}

export function SetupWizard(props: WizardProps) {
  const [step, setStep] = useState(Math.min(Math.max(props.initialStep, 1), 5));
  const router = useRouter();

  async function go(next: number) {
    // Remember the step so an unfinished setup resumes where it left off.
    if (next >= 3) await setSetupStep(next);
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ol className="mb-8 flex items-center justify-center gap-2" aria-label="Setup progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={step === i + 1 ? "step" : undefined}
              className={cx(
                "h-2 rounded-full transition-all",
                step === i + 1 ? "w-8 bg-primary" : step > i + 1 ? "w-2 bg-rose" : "w-2 bg-surface-3",
              )}
            />
            <span className="sr-only">
              Step {i + 1}: {label}
              {step > i + 1 ? " (done)" : ""}
            </span>
          </li>
        ))}
      </ol>

      <div className="rise-in rounded-3xl border border-line bg-surface p-6 sm:p-10" key={step}>
        {step === 1 && <Welcome onNext={() => go(2)} />}
        {step === 2 && (
          <Details
            props={props}
            onDone={() => {
              setStep(3);
              router.refresh();
            }}
          />
        )}
        {step === 3 && <Invite props={props} onNext={() => go(4)} />}
        {step === 4 && <Preferences props={props} onDone={() => setStep(5)} onBack={() => go(3)} />}
        {step === 5 && <InitialStatus props={props} onBack={() => go(4)} />}
      </div>
    </div>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <p className="eyebrow">Our Wedding Era</p>
      <h1 className="mt-3 text-5xl leading-tight">Welcome to Our Wedding Era.</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-muted">Let&apos;s plan your forever, one beautiful step at a time.</p>
      <div className="hairline mx-auto my-8 w-48" />
      <p className="mx-auto max-w-md text-sm text-muted">
        A few quick questions, then your checklist is ready. You can change every answer later in Settings.
      </p>
      <Button size="lg" className="mt-8" onClick={onNext}>
        Let&apos;s begin
      </Button>
    </div>
  );
}

function Details({ props, onDone }: { props: WizardProps; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<DetailsInput>({
    resolver: zodResolver(detailsSchema, undefined, { raw: true }),
    defaultValues: {
      partnerSlot: undefined,
      partner1Name: props.defaults.partner1Name,
      partner2Name: props.defaults.partner2Name,
      weddingDate: props.defaults.weddingDate,
      totalBudget: "",
      estimatedGuestCount: props.defaults.estimatedGuestCount,
      confirmedGuestCount: "",
      planningTimeZone: props.defaults.planningTimeZone,
    },
  });
  const { register, handleSubmit, formState, setError, control } = form;
  const errors = formState.errors;
  const [p1Raw, p2Raw] = useWatch({ control, name: ["partner1Name", "partner2Name"] });
  const p1 = p1Raw || "Partner 1";
  const p2 = p2Raw || "Partner 2";

  if (props.hasWorkspace) {
    return (
      <div>
        <h2 className="text-3xl">Wedding details saved</h2>
        <p className="mt-2 text-muted">Your wedding space and checklist already exist. You can edit these details any time in Settings.</p>
        <Button className="mt-6" onClick={onDone}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setServerError(null);
        const res = await createWorkspace(values);
        if (!res.ok) {
          if (res.fieldErrors) {
            for (const [k, msg] of Object.entries(res.fieldErrors)) setError(k as keyof DetailsInput, { message: msg });
          }
          setServerError(res.error);
          return;
        }
        onDone();
      })}
      className="space-y-6"
    >
      <div>
        <p className="eyebrow">Step 2 of 5</p>
        <h2 className="mt-1 text-4xl">Your wedding details</h2>
        <p className="mt-2 text-muted">
          We&apos;ve filled in what we know: Bel Air Bay Club, Pacific Palisades, September 2027, about 160 guests. Leave anything you
          don&apos;t know yet blank.
        </p>
      </div>
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Which of you is setting this up?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["1", "2"] as const).map((slot) => (
            <label
              key={slot}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-line-strong px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input type="radio" value={slot} {...register("partnerSlot")} className="accent-[var(--primary)]" />
              <span>I&apos;m {slot === "1" ? p1 : p2}</span>
            </label>
          ))}
        </div>
        {errors.partnerSlot ? <p className="mt-1 text-xs font-medium text-danger">{errors.partnerSlot.message}</p> : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Partner 1" htmlFor="partner1Name" error={errors.partner1Name?.message}>
          <Input id="partner1Name" {...register("partner1Name")} />
        </Field>
        <Field label="Partner 2" htmlFor="partner2Name" error={errors.partner2Name?.message}>
          <Input id="partner2Name" {...register("partner2Name")} />
        </Field>
        <Field
          label="Exact wedding date"
          htmlFor="weddingDate"
          hint="Optional. Until you add it, dates are planned around September 2027 and marked provisional."
          error={errors.weddingDate?.message}
        >
          <Input id="weddingDate" type="date" {...register("weddingDate")} />
        </Field>
        <Field label="Total budget (USD)" htmlFor="totalBudget" hint="Optional. Leave blank until you've agreed on it." error={errors.totalBudget?.message}>
          <Input id="totalBudget" inputMode="decimal" placeholder="e.g. 85000" {...register("totalBudget")} />
        </Field>
        <Field label="Estimated guest count" htmlFor="estimatedGuestCount" error={errors.estimatedGuestCount?.message}>
          <Input id="estimatedGuestCount" inputMode="numeric" {...register("estimatedGuestCount")} />
        </Field>
        <Field label="Confirmed guest count" htmlFor="confirmedGuestCount" hint="Optional." error={errors.confirmedGuestCount?.message}>
          <Input id="confirmedGuestCount" inputMode="numeric" {...register("confirmedGuestCount")} />
        </Field>
        <Field label="Planning time zone" htmlFor="planningTimeZone" hint="Used for 'today' and deadlines. The venue stays on Pacific Time." className="sm:col-span-2">
          <Select id="planningTimeZone" {...register("planningTimeZone")}>
            {COMMON_TIME_ZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Creating your checklist…" : "Save and continue"}
        </Button>
      </div>
    </form>
  );
}

function Invite({ props, onNext }: { props: WizardProps; onNext: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ link: string; email: string } | null>(null);
  const [pending, start] = useTransition();

  if (props.partnerJoined) {
    return (
      <div>
        <h2 className="text-3xl">Your partner has joined</h2>
        <p className="mt-2 text-muted">You&apos;re both in. Everything you add is shared.</p>
        <Button className="mt-6" onClick={onNext}>
          Continue
        </Button>
      </div>
    );
  }

  const mailto = result
    ? `mailto:${encodeURIComponent(result.email)}?subject=${encodeURIComponent("Join our wedding planning space")}&body=${encodeURIComponent(
        `I set up Our Wedding Era for us. Use this link to create your login and join:\n\n${result.link}\n\nThe link works for 14 days and only for this email address.`,
      )}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Step 3 of 5</p>
        <h2 className="mt-1 text-4xl">Invite your partner</h2>
        <p className="mt-2 text-muted">
          They&apos;ll get their own login and see everything you see. The invitation only works for the email you enter here.
        </p>
      </div>

      {props.pendingInviteEmail && !result ? (
        <Alert>
          An invitation for <strong>{props.pendingInviteEmail}</strong> is still open. Creating a new one replaces it.
        </Alert>
      ) : null}

      {!result ? (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await invitePartner(email);
              if (!res.ok) setError(res.fieldErrors ? Object.values(res.fieldErrors)[0] : res.error);
              else setResult(res.data!);
            });
          }}
        >
          <Field label="Partner's email" htmlFor="inviteEmail" error={error ?? undefined}>
            <Input id="inviteEmail" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={onNext}>
              Skip for now
            </Button>
            <Button type="submit" disabled={pending || !email}>
              {pending ? "Creating invitation…" : "Create invitation"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <Alert tone="success">Invitation created for {result.email}. Send them the link below.</Alert>
          <div className="rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs break-all">{result.link}</div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={result.link} />
            <a className={buttonClass("secondary")} href={mailto}>
              Open in my email app
            </a>
          </div>
          <p className="text-xs text-muted">
            The app doesn&apos;t send this email itself. It opens your own email app with the link filled in, so it comes from you.
          </p>
          <div className="flex justify-end">
            <Button onClick={onNext}>Continue</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Preferences({ props, onDone, onBack }: { props: WizardProps; onDone: () => void; onBack: () => void }) {
  const [state, setState] = useState({
    reminderFrequency: props.defaults.reminderFrequency,
    checkinDay: props.defaults.checkinDay ?? 1,
    weeklySummary: props.defaults.weeklySummary,
    taskDivision: props.defaults.taskDivision,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePreferences(state as never);
          if (!res.ok) setError(res.error);
          else onDone();
        });
      }}
    >
      <div>
        <p className="eyebrow">Step 4 of 5</p>
        <h2 className="mt-1 text-4xl">Planning preferences</h2>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="How often do you want planning reminders?"
          htmlFor="reminderFrequency"
          hint="Saved now. Reminder delivery is built in Phase 3 and isn't active yet."
        >
          <Select id="reminderFrequency" value={state.reminderFrequency} onChange={(e) => setState({ ...state, reminderFrequency: e.target.value })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="none">No reminders</option>
          </Select>
        </Field>
        <Field label="Which day of the month do you prefer check-ins?" htmlFor="checkinDay" hint="1 to 28, so it exists every month.">
          <Select id="checkinDay" value={state.checkinDay} onChange={(e) => setState({ ...state, checkinDay: Number(e.target.value) })}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="How do you want to divide tasks?" htmlFor="taskDivision" hint="A note for your check-ins. Nothing is assigned automatically.">
          <Select id="taskDivision" value={state.taskDivision} onChange={(e) => setState({ ...state, taskDivision: e.target.value })}>
            <option value="task_by_task">Decide task by task</option>
            <option value="balanced">Keep it roughly even</option>
            <option value="mostly_together">Do most things together</option>
          </Select>
        </Field>
        <div className="flex items-start gap-3 pt-7">
          <input
            id="weeklySummary"
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--primary)]"
            checked={state.weeklySummary}
            onChange={(e) => setState({ ...state, weeklySummary: e.target.checked })}
          />
          <label htmlFor="weeklySummary" className="text-sm">
            <span className="font-medium">Weekly summaries</span>
            <span className="block text-xs text-muted">Saved now. Sending starts once email reminders are added.</span>
          </label>
        </div>
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save and continue"}
        </Button>
      </div>
    </form>
  );
}

function InitialStatus({ props, onBack }: { props: WizardProps; onBack: () => void }) {
  const [venueSecured, setVenueSecured] = useState(true);
  const [confirmation, setConfirmation] = useState(props.defaults.venueConfirmationReceived);
  const [vendors, setVendors] = useState<Record<string, VendorNeedStatus>>(
    Object.fromEntries(props.vendors.filter((v) => v.category !== "venue").map((v) => [v.category, v.status])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await finishSetup({ venueSecured, venueConfirmationReceived: confirmation, vendors });
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      <div>
        <p className="eyebrow">Step 5 of 5</p>
        <h2 className="mt-1 text-4xl">Where things stand</h2>
        <p className="mt-2 text-muted">Correct anything that&apos;s changed.</p>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <ul className="divide-y divide-line rounded-2xl border border-line">
        <li className="flex items-center justify-between gap-4 px-4 py-3">
          <label htmlFor="venueSecured" className="font-medium">
            Venue secured
          </label>
          <input
            id="venueSecured"
            type="checkbox"
            className="h-5 w-5 accent-[var(--primary)]"
            checked={venueSecured}
            onChange={(e) => setVenueSecured(e.target.checked)}
          />
        </li>
        <li className="flex items-center justify-between gap-4 px-4 py-3">
          <span>
            <span className="font-medium">Venue deposit amount</span>
            <span className="block text-xs text-muted">Needs entry. You&apos;ll record the actual amount in Budget &amp; Payments (Phase 3).</span>
          </span>
          <span className="text-sm text-muted">Needs entry</span>
        </li>
        <li className="flex items-center justify-between gap-4 px-4 py-3">
          <label htmlFor="confirmation" className="font-medium">
            Venue confirmation email
          </label>
          <Select id="confirmation" className="w-36" value={confirmation ? "yes" : "no"} onChange={(e) => setConfirmation(e.target.value === "yes")}>
            <option value="no">Pending</option>
            <option value="yes">Received</option>
          </Select>
        </li>
        {props.vendors
          .filter((v) => v.category !== "venue")
          .map((v) => (
            <li key={v.category} className="flex items-center justify-between gap-4 px-4 py-3">
              <label htmlFor={`v-${v.category}`} className="font-medium">
                {v.label}
              </label>
              <Select
                id={`v-${v.category}`}
                className="w-36"
                value={vendors[v.category]}
                onChange={(e) => setVendors({ ...vendors, [v.category]: e.target.value as VendorNeedStatus })}
              >
                <option value="not_booked">Not booked</option>
                <option value="booked">Booked</option>
                <option value="not_needed">Not needed</option>
              </Select>
            </li>
          ))}
      </ul>
      <p className="text-xs text-muted">
        Marking a vendor booked also completes its &ldquo;Book…&rdquo; task in the checklist. Marking the confirmation received completes
        &ldquo;Obtain written deposit confirmation.&rdquo;
      </p>
      <p className="text-sm text-muted">
        Your first monthly check-in for November 2026 arrives with the Monthly Check-In feature in Phase 2.
      </p>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Finishing…" : "Open our dashboard"}
        </Button>
      </div>
    </form>
  );
}
