"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-context";
import { useCelebrate } from "@/components/shell/celebration";
import { Badge, Button, Select, cx } from "@/components/ui";
import { assignTask, dismissReassignment, requestReassignment } from "@/app/(app)/actions/tasks";
import { formatShortDate } from "@/lib/planning/dates";
import type { Workload } from "@/lib/planning/insights";
import { PRIORITY_LABEL, STATUS_LABEL, assigneeLabel, type Assignee, type TaskPriority, type TaskStatus } from "@/lib/types";

export interface BoardTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: Assignee;
  category: string | null;
  reassignRequestedBy: string | null;
  requestedByMe: boolean;
}

export function ResponsibilityBoard({
  columns,
  unassigned,
  workload,
  today,
}: {
  columns: { key: Assignee; title: string; tasks: BoardTask[] }[];
  unassigned: BoardTask[];
  workload: Workload[];
  today: string;
}) {
  const { names } = useApp();
  const [showAll, setShowAll] = useState(false);
  const sortedUnassigned = useMemo(
    () => [...unassigned].sort((a, b) => ((a.dueDate ?? "9") < (b.dueDate ?? "9") ? -1 : 1)),
    [unassigned],
  );
  const visibleUnassigned = showAll ? sortedUnassigned : sortedUnassigned.slice(0, 12);
  const maxOpen = Math.max(1, ...workload.map((w) => w.open));

  return (
    <div className="space-y-8">
      <section aria-labelledby="workload-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 id="workload-heading" className="mb-4 text-2xl">
          Workload overview
        </h2>
        <ul className="space-y-3">
          {workload.map((w) => (
            <li key={w.assignee} className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr_auto]">
              <span className="text-sm font-medium">{assigneeLabel(w.assignee, names)}</span>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-rose" style={{ width: `${(w.open / maxOpen) * 100}%` }} />
              </div>
              <span className="col-start-2 text-xs text-muted sm:col-start-auto">
                {w.open} open · {w.dueNext30} due in 30 days{w.overdue ? ` · ${w.overdue} overdue` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {columns.map((col) => (
          <section key={col.key} aria-labelledby={`col-${col.key}`} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <h2 id={`col-${col.key}`} className="mb-3 text-2xl">
              {col.title} <span className="font-sans text-sm text-muted">({col.tasks.length})</span>
            </h2>
            {col.tasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nothing here yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {col.tasks
                  .sort((a, b) => ((a.dueDate ?? "9") < (b.dueDate ?? "9") ? -1 : 1))
                  .map((t) => (
                    <BoardRow key={t.id} task={t} today={today} />
                  ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section aria-labelledby="unassigned-heading" className="rounded-2xl border border-dashed border-line-strong p-4 sm:p-5">
        <h2 id="unassigned-heading" className="mb-1 text-2xl">
          Not assigned yet <span className="font-sans text-sm text-muted">({unassigned.length})</span>
        </h2>
        <p className="mb-3 text-sm text-muted">Soonest first. Claim one, or decide together at your next check-in.</p>
        <ul className="divide-y divide-line">
          {visibleUnassigned.map((t) => (
            <BoardRow key={t.id} task={t} today={today} />
          ))}
        </ul>
        {sortedUnassigned.length > 12 ? (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show fewer" : `Show all ${sortedUnassigned.length}`}
          </Button>
        ) : null}
      </section>
    </div>
  );
}

function BoardRow({ task, today }: { task: BoardTask; today: string }) {
  const { names, mySlot } = useApp();
  const { notify } = useCelebrate();
  const router = useRouter();
  const [pending, start] = useTransition();
  const me: Assignee = mySlot === 1 ? "partner1" : "partner2";
  const overdue = task.dueDate !== null && task.dueDate < today;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) notify(res.error ?? "Something went wrong");
      else {
        if (msg) notify(msg);
        router.refresh();
      }
    });

  return (
    <li className={cx("py-3", pending && "opacity-60")}>
      <Link href={`/checklist/${task.id}`} className="leading-snug hover:text-primary">
        {task.title}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span className={cx(overdue && "font-medium text-danger")}>
          {task.dueDate ? `${overdue ? "Overdue · " : ""}${formatShortDate(task.dueDate, today)}` : "No date"}
        </span>
        <Badge tone={task.priority === "critical" ? "danger" : task.priority === "high" ? "primary" : "neutral"}>
          {PRIORITY_LABEL[task.priority]}
        </Badge>
        <Badge>{STATUS_LABEL[task.status]}</Badge>
        {task.category ? <span>{task.category}</span> : null}
      </div>
      {task.reassignRequestedBy ? (
        <p className="mt-2 text-xs text-primary">
          {task.requestedByMe ? "You asked to hand this off." : `${task.reassignRequestedBy} asked to hand this off.`}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {task.assignee !== me ? (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => assignTask(task.id, me), "Claimed")}>
            Claim
          </Button>
        ) : task.reassignRequestedBy ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => dismissReassignment(task.id))}>
            Cancel request
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => requestReassignment(task.id), "Request sent")}>
            Ask to reassign
          </Button>
        )}
        {task.reassignRequestedBy && !task.requestedByMe && task.assignee !== me ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => dismissReassignment(task.id))}>
            Dismiss request
          </Button>
        ) : null}
        <label className="sr-only" htmlFor={`assign-${task.id}`}>
          Assign {task.title}
        </label>
        <Select
          id={`assign-${task.id}`}
          className="h-8 w-auto text-xs"
          value={task.assignee}
          disabled={pending}
          onChange={(e) => run(() => assignTask(task.id, e.target.value as Assignee))}
        >
          <option value="unassigned">Unassigned</option>
          <option value="partner1">{names.partner1}</option>
          <option value="partner2">{names.partner2}</option>
          <option value="together">Together</option>
        </Select>
      </div>
    </li>
  );
}
