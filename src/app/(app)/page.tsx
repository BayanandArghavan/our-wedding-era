import Link from "next/link";
import { requireWorkspace } from "@/lib/data/viewer";
import {
  actorNamer,
  listActivity,
  listCategories,
  listDependencies,
  listMembers,
  listMilestones,
  listTasks,
  listVendorNeeds,
  toInsightTask,
} from "@/lib/data/queries";
import {
  computeProgress,
  greeting,
  overdueTasks,
  rankPriorities,
  upcomingDeadlines,
  weddingCountdown,
} from "@/lib/planning/insights";
import { addDays, formatLongDate, formatMonth, formatShortDate, hourInZone } from "@/lib/planning/dates";
import { isProvisional } from "@/lib/planning/schedule";
import { Alert, Badge, Card, CardTitle, EmptyState, ProgressBar, buttonClass } from "@/components/ui";
import { TaskRow, type RowTask } from "@/components/task-row";
import { AddTaskButton } from "@/components/add-task-button";
import type { ActivityRow, PartnerNames } from "@/lib/types";
import { assigneeLabel } from "@/lib/types";

export const metadata = { title: "Home · Our Wedding Era" };

const DASHBOARD_MILESTONES = [
  "venue_secured",
  "planner_booked",
  "photographer_booked",
  "videographer_booked",
  "dj_booked",
  "dress_purchased",
  "save_the_dates_sent",
  "invitations_sent",
  "final_count_confirmed",
  "wedding_day",
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const ctx = await requireWorkspace();
  const ws = ctx.workspaceId;
  const [tasks, deps, categories, activity, members, { milestones }, vendorNeeds] = await Promise.all([
    listTasks(ws),
    listDependencies(ws),
    listCategories(ws),
    listActivity(ws, 10),
    listMembers(ws),
    listMilestones(ws),
    listVendorNeeds(ws),
  ]);

  const { settings, names, today } = ctx;
  const timing = { weddingDate: settings.wedding_date, weddingMonth: settings.wedding_month };
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const insight = tasks.map(toInsightTask);
  const progress = computeProgress(insight, today, settings.planning_time_zone);
  const priorities = rankPriorities(insight, deps.map((d) => ({ taskId: d.task_id, dependsOnTaskId: d.depends_on_task_id })), today);
  const upcoming = upcomingDeadlines(insight, today, 30);
  const overdue = overdueTasks(insight, today);
  const countdown = weddingCountdown(settings.wedding_date, today);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const toRow = (id: string, reasons?: string[]): RowTask => {
    const t = byId.get(id)!;
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      assignee: t.assignee,
      category: t.category_id ? categoryName.get(t.category_id) : null,
      provisional: t.date_source === "suggested" && isProvisional({ monthsBefore: t.months_before, daysBefore: t.days_before }, timing),
      reasons,
    };
  };
  const weekEnd = addDays(today, 7);
  const thisWeek = upcoming.filter((t) => t.dueDate! <= weekEnd);
  const later = upcoming.filter((t) => t.dueDate! > weekEnd);

  const neededVendors = vendorNeeds.filter((v) => v.status !== "not_needed");
  const bookedVendors = neededVendors.filter((v) => v.status === "booked");
  const nameOf = actorNamer(members, names);
  const partnerJoined = members.length >= 2;
  const hour = hourInZone(ctx.timeZone);

  return (
    <div className="space-y-6">
      {params.welcome ? <Alert tone="success">Your checklist is ready. Here&apos;s where things stand.</Alert> : null}
      {params.joined ? <Alert tone="success">You&apos;re in. Everything here is shared between the two of you.</Alert> : null}
      {params.password === "updated" ? <Alert tone="success">Your password was updated.</Alert> : null}

      {/* Welcome and countdown */}
      <section className="relative overflow-hidden rounded-[1.5rem] border border-line bg-surface-2 px-6 py-8 sm:px-10 sm:py-12">
        <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -top-10 -right-10 h-56 w-56 text-accent/40">
          <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="128" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.8" />
        </svg>
        <p className="eyebrow">{settings.venue_name} · {settings.venue_location}</p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-6xl">
          {greeting(hour)}, {names.partner1} &amp; {names.partner2}!
        </h1>
        <p className="mt-2 text-lg text-muted">Every little detail brings us closer to forever.</p>
        <div className="hairline my-6 max-w-sm" />
        {countdown ? (
          <div>
            <p className="font-display text-5xl text-primary sm:text-6xl">{countdown.label}</p>
            <p className="mt-1 text-sm text-muted">{formatLongDate(settings.wedding_date!)}</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-3xl text-primary">{formatMonth(settings.wedding_month)}</p>
            <Link href="/settings#date" className={buttonClass("secondary", "sm")}>
              Add the exact date for a live countdown
            </Link>
          </div>
        )}
      </section>

      {/* Progress */}
      <section aria-label="Planning progress" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Overall progress" value={`${progress.percent}%`} detail={`${progress.completed} of ${progress.total} tasks done`}>
          <ProgressBar value={progress.percent} label="Overall planning progress" className="mt-3" />
        </Stat>
        <Stat
          label={`${formatMonth(today).split(" ")[0]} progress`}
          value={progress.monthTotal ? `${progress.monthPercent}%` : "-"}
          detail={progress.monthTotal ? `${progress.monthCompleted} of ${progress.monthTotal} this month` : "Nothing due this month"}
        >
          <ProgressBar value={progress.monthPercent} label="This month's progress" className="mt-3" />
        </Stat>
        <Stat
          label="Overdue"
          value={String(progress.overdue)}
          detail={`${progress.remaining} tasks remaining`}
          tone={progress.overdue > 0 ? "danger" : undefined}
        />
        <Stat label="Due in 30 days" value={String(progress.dueNext30)} detail={countdown && countdown.days >= 0 ? `${countdown.days} days to the wedding` : "Upcoming deadlines"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardTitle eyebrow="What should we do next?" action={<AddTaskButton />}>
              This Month&apos;s Priorities
            </CardTitle>
            {priorities.length ? (
              <ul className="divide-y divide-line">
                {priorities.map((p) => (
                  <TaskRow key={p.id} task={toRow(p.id, p.reasons.slice(0, 2))} names={names} today={today} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing pressing this month">Every task due this month is done. Enjoy it.</EmptyState>
            )}
            <p className="mt-3 text-xs text-muted">Ranked by deadline, priority, vendor bookings and what each task unblocks.</p>
          </Card>

          <Card>
            <CardTitle eyebrow="Next 30 days">Upcoming Deadlines</CardTitle>
            {overdue.length > 0 ? (
              <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="text-sm font-medium text-danger">
                  {overdue.length} overdue {overdue.length === 1 ? "task" : "tasks"}
                </p>
                <ul className="divide-y divide-line">
                  {overdue.slice(0, 4).map((t) => (
                    <TaskRow key={t.id} task={toRow(t.id)} names={names} today={today} />
                  ))}
                </ul>
                {overdue.length > 4 ? (
                  <Link href="/checklist?view=overdue" className="text-sm text-primary underline underline-offset-4">
                    See all {overdue.length}
                  </Link>
                ) : null}
              </div>
            ) : null}
            {upcoming.length === 0 ? (
              <EmptyState title="A quiet month ahead">No open tasks are due in the next 30 days.</EmptyState>
            ) : (
              <>
                {thisWeek.length > 0 ? (
                  <>
                    <h3 className="font-sans text-xs font-semibold tracking-[0.14em] text-muted uppercase">This week</h3>
                    <ul className="mb-4 divide-y divide-line">
                      {thisWeek.map((t) => (
                        <TaskRow key={t.id} task={toRow(t.id)} names={names} today={today} />
                      ))}
                    </ul>
                  </>
                ) : null}
                {later.length > 0 ? (
                  <>
                    <h3 className="font-sans text-xs font-semibold tracking-[0.14em] text-muted uppercase">Later this month and next</h3>
                    <ul className="divide-y divide-line">
                      {later.slice(0, 8).map((t) => (
                        <TaskRow key={t.id} task={toRow(t.id)} names={names} today={today} />
                      ))}
                    </ul>
                    {later.length > 8 ? (
                      <Link href="/checklist?view=upcoming" className="mt-2 inline-block text-sm text-primary underline underline-offset-4">
                        See all {upcoming.length} upcoming
                      </Link>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
            <p className="mt-3 text-xs text-muted">Payment due dates join this list when Budget &amp; Payments is added.</p>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle eyebrow="Vendors">Booked so far</CardTitle>
            <p className="font-display text-4xl">
              {bookedVendors.length} <span className="text-2xl text-muted">of {neededVendors.length}</span>
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {neededVendors.map((v) => (
                <li key={v.id}>
                  <Badge tone={v.status === "booked" ? "success" : "neutral"}>
                    {v.status === "booked" ? "✓ " : ""}
                    {v.label}
                  </Badge>
                </li>
              ))}
            </ul>
            <Link href="/settings#vendors" className="mt-3 inline-block text-sm text-primary underline underline-offset-4">
              Update vendor status
            </Link>
          </Card>

          <Card>
            <CardTitle eyebrow="Budget">Wedding budget</CardTitle>
            {settings.total_budget ? (
              <p className="font-display text-4xl">{money.format(Number(settings.total_budget))}</p>
            ) : (
              <p className="text-muted">
                Not set yet.{" "}
                <Link href="/settings#budget" className="text-primary underline underline-offset-4">
                  Add your total budget
                </Link>
              </p>
            )}
            <p className="mt-2 text-xs text-muted">
              Spent and committed amounts appear once expenses and payments can be recorded (Budget &amp; Payments, Phase 3).
            </p>
          </Card>

          <Card>
            <CardTitle eyebrow="Together">Partner activity</CardTitle>
            {!partnerJoined ? (
              <div className="mb-3">
                <Alert>
                  {ctx.member.partner_slot === 1 ? names.partner2 : names.partner1} hasn&apos;t joined yet.{" "}
                  <Link href="/settings#partner" className="font-medium underline underline-offset-4">
                    Send an invitation
                  </Link>
                </Alert>
              </div>
            ) : null}
            {activity.length === 0 ? (
              <p className="text-sm text-muted">Changes either of you make will show up here.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p>{describeActivity(a, nameOf(a.actor_id), names)}</p>
                    <p className="text-xs text-muted">{relativeTime(a.created_at, ctx.timeZone, today)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <section aria-labelledby="milestones-heading">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1">Our journey</p>
            <h2 id="milestones-heading" className="text-3xl">
              Wedding Milestones
            </h2>
          </div>
          <Link href="/milestones" className="text-sm text-primary underline underline-offset-4">
            All milestones
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {DASHBOARD_MILESTONES.map((key) => milestones.find((m) => m.seed_key === key))
            .filter((m) => m !== undefined)
            .map((m) => {
              const isWeddingDay = m.seed_key === "wedding_day";
              const done = m.is_completed;
              return (
                <li
                  key={m.id}
                  className={`rounded-2xl border p-4 ${done ? "border-accent/70 bg-surface" : "border-line bg-surface/60"}`}
                >
                  <span aria-hidden className={`block text-lg ${done ? "text-accent" : "text-line-strong"}`}>
                    {done ? "✦" : "○"}
                  </span>
                  <p className="font-display mt-1 text-xl leading-tight">{m.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {done
                      ? m.completed_on
                        ? formatShortDate(m.completed_on, today)
                        : "Done"
                      : isWeddingDay && settings.wedding_date
                        ? formatShortDate(settings.wedding_date, today)
                        : "Not yet"}
                  </p>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  tone,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "danger";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`font-display mt-1 text-4xl ${tone === "danger" && value !== "0" ? "text-danger" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{detail}</p>
      {children}
    </div>
  );
}

function describeActivity(a: ActivityRow, who: string, names: PartnerNames): string {
  const label = a.entity_label ? `“${a.entity_label}”` : "";
  switch (`${a.entity_type}:${a.action}`) {
    case "task:created":
      return `${who} added ${label}`;
    case "task:completed":
      return `${who} completed ${label}`;
    case "task:reopened":
      return `${who} reopened ${label}`;
    case "task:deleted":
      return `${who} deleted ${label}`;
    case "task:assigned": {
      const to = (a.details as { to?: string })?.to;
      return `${who} assigned ${label} to ${assigneeLabel((to ?? "unassigned") as never, names)}`;
    }
    case "task:reassign_requested":
      return `${who} asked to hand off ${label}`;
    case "milestone:completed":
      return `Milestone reached: ${a.entity_label}`;
    case "milestone:created":
      return `${who} added the milestone ${label}`;
    case "vendor_need:status_changed": {
      const to = (a.details as { to?: string })?.to;
      return to === "booked" ? `${who} marked the ${a.entity_label.toLowerCase()} booked` : `${who} updated ${a.entity_label} status`;
    }
    case "settings:wedding_date_changed":
      return `${who} changed the wedding date`;
    case "member:joined":
      return `${who} joined the wedding space`;
    case "invitation:created":
      return `${who} sent a partner invitation`;
    case "workspace:created":
      return `${who} created your wedding space`;
    default:
      return `${who} made a change`;
  }
}

function relativeTime(iso: string, timeZone: string, today: string): string {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(then);
  return formatShortDate(date, today);
}

