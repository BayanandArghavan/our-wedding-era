import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/data/viewer";
import { actorNamer, listCategories, listMembers } from "@/lib/data/queries";
import { formatLongDate, formatShortDate } from "@/lib/planning/dates";
import { isProvisional, suggestDueDate } from "@/lib/planning/schedule";
import { Badge, Card, CardTitle } from "@/components/ui";
import { PRIORITY_LABEL, STATUS_LABEL, assigneeLabel, type PartnerNames, type TaskActivityRow } from "@/lib/types";
import { TaskActions, SubtaskList, DependencyEditor } from "./task-detail-client";

export const metadata = { title: "Task · Our Wedding Era" };

export default async function TaskDetailPage({ params }: PageProps<"/checklist/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requireWorkspace();
  const supabase = await createClient();

  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!task) notFound();

  const [subtasks, depsOut, depsIn, activity, allTasks, categories, members] = await Promise.all([
    supabase.from("task_subtasks").select("*").eq("task_id", id).order("sort_order").then((r) => r.data ?? []),
    supabase.from("task_dependencies").select("depends_on_task_id").eq("task_id", id).then((r) => r.data ?? []),
    supabase.from("task_dependencies").select("task_id").eq("depends_on_task_id", id).then((r) => r.data ?? []),
    supabase.from("task_activity").select("*").eq("task_id", id).order("created_at", { ascending: false }).limit(50).then((r) => r.data ?? []),
    supabase.from("tasks").select("id,title,status,due_date").eq("workspace_id", ctx.workspaceId).order("title").then((r) => r.data ?? []),
    listCategories(ctx.workspaceId),
    listMembers(ctx.workspaceId),
  ]);

  const byId = new Map(allTasks.map((t) => [t.id, t]));
  const category = categories.find((c) => c.id === task.category_id)?.name ?? null;
  const nameOf = actorNamer(members, ctx.names);
  const timing = { weddingDate: ctx.settings.wedding_date, weddingMonth: ctx.settings.wedding_month };
  const meta = { monthsBefore: task.months_before, daysBefore: task.days_before };
  const suggestion = suggestDueDate(meta, timing);
  const provisional = task.date_source === "suggested" && isProvisional(meta, timing);
  const overdue = task.due_date && task.due_date < ctx.today && task.status !== "completed" && task.status !== "not_applicable";

  return (
    <div className="space-y-6">
      <Link href="/checklist" className="text-sm text-muted hover:text-primary">
        ← Checklist
      </Link>

      <header className="space-y-3">
        {category ? <p className="eyebrow">{category}</p> : null}
        <h1 className="text-4xl leading-tight sm:text-5xl">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={task.status === "completed" ? "success" : "neutral"}>{STATUS_LABEL[task.status]}</Badge>
          <Badge tone={task.priority === "critical" ? "danger" : task.priority === "high" ? "primary" : "neutral"}>
            {PRIORITY_LABEL[task.priority]} priority
          </Badge>
          <Badge>{assigneeLabel(task.assignee, ctx.names)}</Badge>
          {task.due_date ? (
            <Badge tone={overdue ? "danger" : "gold"}>
              {overdue ? "Overdue · " : "Due "}
              {formatLongDate(task.due_date)}
              {provisional ? " (provisional)" : ""}
            </Badge>
          ) : (
            <Badge>No due date</Badge>
          )}
        </div>
      </header>

      <TaskActions
        task={{
          id: task.id,
          title: task.title,
          description: task.description,
          notes: task.notes,
          categoryId: task.category_id,
          assignee: task.assignee,
          status: task.status,
          priority: task.priority,
          dueDate: task.due_date,
        }}
        reassignRequestedBy={task.reassign_requested_by ? nameOf(task.reassign_requested_by) : null}
        requestedByMe={task.reassign_requested_by === ctx.userId}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>Details</CardTitle>
            {task.description ? <p className="whitespace-pre-wrap">{task.description}</p> : <p className="text-muted">No description.</p>}
            {task.notes ? (
              <>
                <h3 className="mt-5 mb-1 font-sans text-sm font-semibold">Notes</h3>
                <p className="whitespace-pre-wrap text-sm">{task.notes}</p>
              </>
            ) : null}
            {task.date_source === "manual" && suggestion && suggestion !== task.due_date ? (
              <p className="mt-5 text-xs text-muted">
                You set this date by hand. The planning suggestion would be {formatShortDate(suggestion, ctx.today)}. Changing the wedding
                date won&apos;t move it without asking.
              </p>
            ) : null}
            {task.completed_at ? (
              <p className="mt-5 text-xs text-muted">
                Completed {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: ctx.timeZone }).format(new Date(task.completed_at))}
              </p>
            ) : null}
          </Card>

          <Card>
            <CardTitle>Subtasks</CardTitle>
            <SubtaskList taskId={task.id} subtasks={subtasks.map((s) => ({ id: s.id, title: s.title, isDone: s.is_done }))} />
          </Card>

          <Card>
            <CardTitle>Depends on</CardTitle>
            <DependencyEditor
              taskId={task.id}
              current={depsOut.map((d) => byId.get(d.depends_on_task_id)).filter((t) => t !== undefined).map((t) => ({ id: t.id, title: t.title, done: t.status === "completed" || t.status === "not_applicable" }))}
              options={allTasks.filter((t) => t.id !== task.id).map((t) => ({ id: t.id, title: t.title }))}
            />
            {depsIn.length > 0 ? (
              <div className="mt-5">
                <h3 className="mb-1 font-sans text-sm font-semibold">Waiting on this task</h3>
                <ul className="space-y-1 text-sm">
                  {depsIn
                    .map((d) => byId.get(d.task_id))
                    .filter((t) => t !== undefined)
                    .map((t) => (
                      <li key={t.id}>
                        <Link href={`/checklist/${t.id}`} className="text-primary underline underline-offset-4">
                          {t.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>

        <Card className="h-fit">
          <CardTitle>History</CardTitle>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Part of your starting checklist. Changes will be recorded here.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="border-l-2 border-accent/60 pl-3">
                  <p>{describe(a, nameOf(a.actor_id), ctx.names, ctx.today)}</p>
                  <p className="text-xs text-muted">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: ctx.timeZone }).format(new Date(a.created_at))}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-muted">Attachments and links to vendors and expenses arrive with Phase 3.</p>
        </Card>
      </div>
    </div>
  );
}

function describe(a: TaskActivityRow, who: string, names: PartnerNames, today: string): string {
  const d = (a.details ?? {}) as Record<string, string | null>;
  const date = (v: string | null | undefined) => (v ? formatShortDate(v, today) : "no date");
  switch (a.action) {
    case "created":
      return `${who} created this task`;
    case "due_date_changed": {
      const why =
        d.reason === "moved_to_next_month" ? " (moved to next month)" : d.reason === "wedding_date_changed" ? " (wedding date changed)" : "";
      return `${who} changed the due date from ${date(d.from)} to ${date(d.to)}${why}`;
    }
    case "status_changed":
      return `${who} changed status from ${STATUS_LABEL[d.from as never] ?? d.from} to ${STATUS_LABEL[d.to as never] ?? d.to}`;
    case "assignee_changed":
      return `${who} reassigned it from ${assigneeLabel(d.from as never, names)} to ${assigneeLabel(d.to as never, names)}`;
    case "priority_changed":
      return `${who} changed priority from ${PRIORITY_LABEL[d.from as never] ?? d.from} to ${PRIORITY_LABEL[d.to as never] ?? d.to}`;
    case "renamed":
      return `${who} renamed it from “${d.from}”`;
    default:
      return `${who} updated this task`;
  }
}
