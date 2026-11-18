"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTaskStatus } from "@/app/(app)/actions/tasks";
import { useCelebrate } from "@/components/shell/celebration";
import { Badge, cx } from "@/components/ui";
import { formatShortDate } from "@/lib/planning/dates";
import { PRIORITY_LABEL, STATUS_LABEL, assigneeLabel, type Assignee, type PartnerNames, type TaskPriority, type TaskStatus } from "@/lib/types";

export interface RowTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: Assignee;
  category?: string | null;
  provisional?: boolean;
  reasons?: string[];
}

export function TaskRow({
  task,
  names,
  today,
  showCategory = true,
  compact = false,
}: {
  task: RowTask;
  names: PartnerNames;
  today: string;
  showCategory?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const { celebrate, notify } = useCelebrate();
  const [pending, start] = useTransition();
  const [status, setOptimistic] = useOptimistic(task.status);
  const done = status === "completed";
  const na = status === "not_applicable";
  const overdue = !done && !na && task.dueDate !== null && task.dueDate < today;

  function toggle() {
    const next: TaskStatus = done ? "not_started" : "completed";
    start(async () => {
      setOptimistic(next);
      const res = await setTaskStatus(task.id, next);
      if (!res.ok) notify(res.error);
      else {
        celebrate(res.celebrate);
        router.refresh();
      }
    });
  }

  return (
    <li className={cx("flex items-start gap-3 py-3", pending && "opacity-70")}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        onClick={toggle}
        disabled={pending || na}
        className={cx(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-primary bg-primary text-primary-fg" : "border-line-strong hover:border-primary",
          na && "opacity-40",
        )}
      >
        {done ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="m5 12 4.5 4.5L19 7" />
          </svg>
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <Link
          href={`/checklist/${task.id}`}
          className={cx("block leading-snug hover:text-primary", (done || na) && "text-muted line-through decoration-rose/70")}
        >
          {task.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {task.dueDate ? (
            <span className={cx(overdue && "font-medium text-danger")}>
              {overdue ? "Overdue · " : ""}
              {formatShortDate(task.dueDate, today)}
              {task.provisional ? " (provisional)" : ""}
            </span>
          ) : (
            <span>No date</span>
          )}
          {!compact ? <span aria-hidden>·</span> : null}
          {!compact ? <span>{assigneeLabel(task.assignee, names)}</span> : null}
          {showCategory && task.category && !compact ? (
            <>
              <span aria-hidden>·</span>
              <span>{task.category}</span>
            </>
          ) : null}
          {task.priority === "critical" || task.priority === "high" ? (
            <Badge tone={task.priority === "critical" ? "danger" : "primary"}>{PRIORITY_LABEL[task.priority]}</Badge>
          ) : null}
          {status !== "not_started" && status !== "completed" ? <Badge>{STATUS_LABEL[status]}</Badge> : null}
          {task.reasons?.map((r) => (
            <Badge key={r} tone="gold">
              {r}
            </Badge>
          ))}
        </div>
      </div>
    </li>
  );
}
