"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-context";
import { useCelebrate } from "@/components/shell/celebration";
import { Dialog } from "@/components/dialog";
import { Alert, Button, Input, Select, cx } from "@/components/ui";
import type { TaskDialogTask } from "@/components/task-dialog";
import {
  addDependency,
  addSubtask,
  assignTask,
  deleteSubtask,
  deleteTask,
  dismissReassignment,
  moveToNextMonth,
  removeDependency,
  requestReassignment,
  setTaskStatus,
  toggleSubtask,
} from "@/app/(app)/actions/tasks";

export function TaskActions({
  task,
  reassignRequestedBy,
  requestedByMe,
}: {
  task: TaskDialogTask;
  reassignRequestedBy: string | null;
  requestedByMe: boolean;
}) {
  const { openTask, names, mySlot } = useApp();
  const { celebrate, notify } = useCelebrate();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = task.status === "completed";
  const me = mySlot === 1 ? "partner1" : "partner2";
  const other = mySlot === 1 ? "partner2" : "partner1";

  const run = (fn: () => Promise<{ ok: boolean; error?: string; celebrate?: string[] }>, message?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) notify(res.error ?? "Something went wrong");
      else {
        celebrate(res.celebrate);
        if (message) notify(message);
        router.refresh();
      }
    });

  return (
    <div className="space-y-3">
      {reassignRequestedBy ? (
        <Alert>
          {requestedByMe ? "You asked" : `${reassignRequestedBy} asked`} to hand this task off.{" "}
          {!requestedByMe ? (
            <span className="inline-flex flex-wrap gap-2 align-middle">
              <Button size="sm" onClick={() => run(() => assignTask(task.id, me), "It's yours now")} disabled={pending}>
                Take it
              </Button>
              <Button size="sm" variant="secondary" onClick={() => run(() => assignTask(task.id, "together"))} disabled={pending}>
                Do it together
              </Button>
            </span>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => run(() => dismissReassignment(task.id))} disabled={pending}>
            {requestedByMe ? "Cancel request" : "Dismiss"}
          </Button>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => run(() => setTaskStatus(task.id, done ? "not_started" : "completed"), done ? "Reopened" : "Marked complete")}
          disabled={pending || task.status === "not_applicable"}
        >
          {done ? "Reopen" : "Mark complete"}
        </Button>
        <Button variant="secondary" onClick={() => openTask(task)}>
          Edit
        </Button>
        {!done ? (
          <Button variant="secondary" onClick={() => run(() => moveToNextMonth(task.id), "Moved to next month")} disabled={pending}>
            Move to next month
          </Button>
        ) : null}
        {task.assignee !== me ? (
          <Button variant="secondary" onClick={() => run(() => assignTask(task.id, me), "Claimed")} disabled={pending}>
            Claim it
          </Button>
        ) : !reassignRequestedBy ? (
          <Button variant="secondary" onClick={() => run(() => requestReassignment(task.id), `Asked ${names[other]} to take it`)} disabled={pending}>
            Ask to reassign
          </Button>
        ) : null}
        {task.status !== "not_applicable" && !done ? (
          <Button variant="ghost" onClick={() => run(() => setTaskStatus(task.id, "not_applicable"), "Marked not applicable")} disabled={pending}>
            Not applicable
          </Button>
        ) : null}
        {task.status === "not_applicable" ? (
          <Button variant="ghost" onClick={() => run(() => setTaskStatus(task.id, "not_started"))} disabled={pending}>
            Make applicable again
          </Button>
        ) : null}
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this task?">
        <p className="text-muted">
          &ldquo;{task.title}&rdquo; and its subtasks and history will be removed for both of you. The activity feed keeps a note that it was
          deleted. If it just doesn&apos;t apply to you, &ldquo;Not applicable&rdquo; keeps it out of your progress without deleting it.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteTask(task.id);
                if (!res.ok) notify(res.error);
                else router.push("/checklist");
              })
            }
          >
            Delete task
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export function SubtaskList({ taskId, subtasks }: { taskId: string; subtasks: { id: string; title: string; isDone: boolean }[] }) {
  const router = useRouter();
  const { notify } = useCelebrate();
  const [title, setTitle] = useState("");
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
    <div>
      {subtasks.length === 0 ? <p className="mb-3 text-sm text-muted">Break this into smaller steps if it helps.</p> : null}
      <ul className="divide-y divide-line">
        {subtasks.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2">
            <input
              id={`sub-${s.id}`}
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={s.isDone}
              disabled={pending}
              onChange={(e) => run(() => toggleSubtask(s.id, e.target.checked))}
            />
            <label htmlFor={`sub-${s.id}`} className={cx("flex-1 text-sm", s.isDone && "text-muted line-through")}>
              {s.title}
            </label>
            <button
              type="button"
              className="text-xs text-muted hover:text-danger"
              onClick={() => run(() => deleteSubtask(s.id))}
              aria-label={`Delete subtask ${s.title}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) run(() => addSubtask(taskId, title), () => setTitle(""));
        }}
      >
        <label htmlFor="new-subtask" className="sr-only">
          New subtask
        </label>
        <Input id="new-subtask" placeholder="Add a subtask" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={pending || !title.trim()}>
          Add
        </Button>
      </form>
    </div>
  );
}

export function DependencyEditor({
  taskId,
  current,
  options,
}: {
  taskId: string;
  current: { id: string; title: string; done: boolean }[];
  options: { id: string; title: string }[];
}) {
  const router = useRouter();
  const { notify } = useCelebrate();
  const [choice, setChoice] = useState("");
  const [pending, start] = useTransition();
  const currentIds = new Set(current.map((c) => c.id));
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
    <div>
      {current.length === 0 ? <p className="mb-3 text-sm text-muted">This task isn&apos;t waiting on anything.</p> : null}
      <ul className="space-y-2">
        {current.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span aria-hidden className={c.done ? "text-success" : "text-muted"}>
                {c.done ? "✓ " : "○ "}
              </span>
              <Link href={`/checklist/${c.id}`} className="underline underline-offset-4 hover:text-primary">
                {c.title}
              </Link>
              {c.done ? <span className="sr-only"> (done)</span> : null}
            </span>
            <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => run(() => removeDependency(taskId, c.id))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (choice) run(() => addDependency(taskId, choice), () => setChoice(""));
        }}
      >
        <label htmlFor="dep-choice" className="sr-only">
          Task this depends on
        </label>
        <Select id="dep-choice" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Choose a task this depends on…</option>
          {options
            .filter((o) => !currentIds.has(o.id))
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
        </Select>
        <Button type="submit" variant="secondary" disabled={pending || !choice}>
          Add
        </Button>
      </form>
    </div>
  );
}
