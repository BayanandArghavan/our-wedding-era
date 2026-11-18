"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCelebrate } from "@/components/shell/celebration";
import { Button, Field, Input, Textarea, cx } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { addCustomMilestone, deleteCustomMilestone, setMilestoneCompleted, setMilestoneDate } from "@/app/(app)/actions/milestones";
import { formatLongDate } from "@/lib/planning/dates";

export interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  completedOn: string | null;
  isCustom: boolean;
  isWeddingDay: boolean;
  tasks: { id: string; title: string; done: boolean }[];
}

export function MilestoneJourney({ milestones, today, weddingDate }: { milestones: JourneyMilestone[]; today: string; weddingDate: string | null }) {
  const [adding, setAdding] = useState(false);
  const done = milestones.filter((m) => m.isCompleted).length;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        {done} of {milestones.length} reached
      </p>
      <ol className="relative space-y-4 border-l border-accent/50 pl-6 sm:pl-8">
        {milestones.map((m) => (
          <MilestoneItem key={m.id} m={m} today={today} weddingDate={weddingDate} />
        ))}
      </ol>
      <Button variant="secondary" onClick={() => setAdding(true)}>
        Add a custom milestone
      </Button>
      <AddMilestoneDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function MilestoneItem({ m, today, weddingDate }: { m: JourneyMilestone; today: string; weddingDate: string | null }) {
  const router = useRouter();
  const { celebrate, notify } = useCelebrate();
  const [pending, start] = useTransition();
  const [editingDate, setEditingDate] = useState(false);
  const [date, setDate] = useState(m.completedOn ?? today);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; celebrate?: string[] }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) notify(res.error ?? "Something went wrong");
      else {
        celebrate(res.celebrate);
        router.refresh();
      }
    });

  return (
    <li className="relative">
      <span
        aria-hidden
        className={cx(
          "absolute top-5 -left-[1.95rem] flex h-4 w-4 items-center justify-center rounded-full border sm:-left-[2.45rem]",
          m.isCompleted ? "border-accent bg-accent" : "border-line-strong bg-bg",
        )}
      />
      <div className={cx("rounded-2xl border bg-surface p-4 sm:p-5", m.isCompleted ? "border-accent/60" : "border-line")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl leading-tight">{m.title}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {m.isCompleted
                ? m.completedOn
                  ? `Reached ${formatLongDate(m.completedOn)}`
                  : "Reached (date not recorded)"
                : m.isWeddingDay && weddingDate
                  ? formatLongDate(weddingDate)
                  : "Not yet"}
            </p>
            {m.description ? <p className="mt-2 text-sm">{m.description}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {m.isCompleted ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditingDate(!editingDate)}>
                  {m.completedOn ? "Change date" : "Add date"}
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setMilestoneCompleted(m.id, false, null))}>
                  Mark not reached
                </Button>
              </>
            ) : (
              <Button size="sm" disabled={pending} onClick={() => run(() => setMilestoneCompleted(m.id, true, null))}>
                Mark reached
              </Button>
            )}
            {m.isCustom ? (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteCustomMilestone(m.id))}>
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        {editingDate ? (
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => setMilestoneDate(m.id, date || null));
              setEditingDate(false);
            }}
          >
            <Field label="Date reached" htmlFor={`ms-date-${m.id}`}>
              <Input id={`ms-date-${m.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Button type="submit" size="md" variant="secondary">
              Save
            </Button>
          </form>
        ) : null}
        {m.tasks.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {m.tasks.map((t) => (
              <li key={t.id}>
                <span aria-hidden className={t.done ? "text-success" : "text-muted"}>
                  {t.done ? "✓ " : "○ "}
                </span>
                <Link href={`/checklist/${t.id}`} className={cx("underline-offset-4 hover:underline", t.done && "text-muted")}>
                  {t.title}
                </Link>
                {t.done ? <span className="sr-only"> (done)</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function AddMilestoneDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { notify } = useCelebrate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onClose={onClose} title="Add a milestone">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await addCustomMilestone({ title, description });
            if (!res.ok) setError(res.fieldErrors?.title ?? res.error);
            else {
              notify("Milestone added");
              setTitle("");
              setDescription("");
              onClose();
              router.refresh();
            }
          });
        }}
      >
        <Field label="Milestone" htmlFor="ms-title" error={error ?? undefined}>
          <Input id="ms-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Engagement party" />
        </Field>
        <Field label="Description (optional)" htmlFor="ms-desc">
          <Textarea id="ms-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            Add milestone
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
