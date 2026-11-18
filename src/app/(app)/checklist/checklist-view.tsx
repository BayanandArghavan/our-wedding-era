"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { TaskRow } from "@/components/task-row";
import { Button, EmptyState, Input, ProgressBar, Select, cx } from "@/components/ui";
import { addDays, formatMonth, monthStart } from "@/lib/planning/dates";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  isOpen,
  type Assignee,
  type PartnerNames,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

export interface ChecklistTask {
  id: string;
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: Assignee;
  categoryId: string | null;
  category: string | null;
  provisional: boolean;
}

type View = "all" | "overdue" | "upcoming" | "completed";
type Sort = "due" | "priority" | "title" | "category";
const PRIORITY_ORDER: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function ChecklistView({
  tasks,
  categories,
  names,
  today,
  initialView,
}: {
  tasks: ChecklistTask[];
  categories: { id: string; name: string }[];
  names: PartnerNames;
  today: string;
  initialView: View;
}) {
  const [view, setView] = useState<View>(initialView);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<Sort>("due");
  const [hideDone, setHideDone] = useState(false);
  const q = useDeferredValue(query.trim().toLowerCase());

  const months = useMemo(() => {
    const set = new Set(tasks.filter((t) => t.dueDate).map((t) => monthStart(t.dueDate!)));
    return [...set].sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    const horizon = addDays(today, 30);
    return tasks.filter((t) => {
      if (view === "overdue" && !(isOpen(t.status) && t.dueDate && t.dueDate < today)) return false;
      if (view === "upcoming" && !(isOpen(t.status) && t.dueDate && t.dueDate >= today && t.dueDate <= horizon)) return false;
      if (view === "completed" && t.status !== "completed") return false;
      if (hideDone && view !== "completed" && !isOpen(t.status)) return false;
      if (month && (!t.dueDate || monthStart(t.dueDate) !== month)) return false;
      if (category && (category === "none" ? t.categoryId !== null : t.categoryId !== category)) return false;
      if (assignee && t.assignee !== assignee) return false;
      if (priority && t.priority !== priority) return false;
      if (status && t.status !== status) return false;
      if (q && !`${t.title} ${t.description} ${t.notes} ${t.category ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, view, hideDone, month, category, assignee, priority, status, q, today]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const byDue = (a: ChecklistTask, b: ChecklistTask) =>
      (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : (a.dueDate ?? "9999") > (b.dueDate ?? "9999") ? 1 : 0;
    list.sort((a, b) => {
      if (sort === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || byDue(a, b);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "category") return (a.category ?? "~").localeCompare(b.category ?? "~") || byDue(a, b);
      return byDue(a, b) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });
    return list;
  }, [filtered, sort]);

  // Group by month when sorted by date; otherwise show a flat list.
  const groups = useMemo(() => {
    if (sort !== "due") return [{ key: "all", label: "", items: sorted }];
    const map = new Map<string, ChecklistTask[]>();
    for (const t of sorted) {
      const key = t.dueDate ? monthStart(t.dueDate) : "none";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()].map(([key, items]) => ({ key, label: key === "none" ? "No date" : formatMonth(key), items }));
  }, [sorted, sort]);

  const activeFilters = [month, category, assignee, priority, status, q].filter(Boolean).length + (hideDone ? 1 : 0);
  const clear = () => {
    setMonth("");
    setCategory("");
    setAssignee("");
    setPriority("");
    setStatus("");
    setQuery("");
    setHideDone(false);
  };

  const counts = {
    all: tasks.length,
    overdue: tasks.filter((t) => isOpen(t.status) && t.dueDate && t.dueDate < today).length,
    upcoming: tasks.filter((t) => isOpen(t.status) && t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 30)).length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Checklist views" className="flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
        {(["all", "overdue", "upcoming", "completed"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cx(
              "flex-1 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              view === v ? "bg-primary text-primary-fg" : "text-muted hover:text-text",
            )}
          >
            {v === "all" ? "All" : v === "overdue" ? "Overdue" : v === "upcoming" ? "Next 30 days" : "Completed"}
            <span className="ml-1.5 opacity-80">{counts[v]}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="search" className="sr-only">
            Search tasks
          </label>
          <Input id="search" type="search" placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <FilterSelect id="f-month" label="Month" value={month} onChange={setMonth}>
          <option value="">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonth(m)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="f-category" label="Category" value={category} onChange={setCategory}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">No category</option>
        </FilterSelect>
        <FilterSelect id="f-assignee" label="Assigned to" value={assignee} onChange={setAssignee}>
          <option value="">Anyone</option>
          <option value="partner1">{names.partner1}</option>
          <option value="partner2">{names.partner2}</option>
          <option value="together">Together</option>
          <option value="unassigned">Unassigned</option>
        </FilterSelect>
        <FilterSelect id="f-priority" label="Priority" value={priority} onChange={setPriority}>
          <option value="">Any priority</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="f-status" label="Status" value={status} onChange={setStatus}>
          <option value="">Any status</option>
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="f-sort" label="Sort by" value={sort} onChange={(v) => setSort(v as Sort)}>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
          <option value="category">Category</option>
          <option value="title">Title</option>
        </FilterSelect>
        <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            Hide completed and not-applicable
          </label>
          {activeFilters > 0 ? (
            <Button size="sm" variant="ghost" onClick={clear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        Showing {sorted.length} of {tasks.length} tasks
      </p>

      {sorted.length === 0 ? (
        <EmptyState title="No tasks match" action={activeFilters ? <Button variant="secondary" onClick={clear}>Clear filters</Button> : undefined}>
          {view === "overdue" ? "Nothing is overdue. Lovely." : "Try a different filter or search."}
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const done = g.items.filter((t) => t.status === "completed").length;
            const relevant = g.items.filter((t) => t.status !== "not_applicable").length;
            return (
              <section key={g.key} className="rounded-2xl border border-line bg-surface px-4 py-2 sm:px-6">
                {g.label ? (
                  <div className="flex items-center justify-between gap-4 border-b border-line py-3">
                    <h2 className="text-2xl">{g.label}</h2>
                    <div className="flex w-36 items-center gap-2">
                      <ProgressBar value={relevant ? (done / relevant) * 100 : 0} label={`${g.label} progress`} />
                      <span className="text-xs whitespace-nowrap text-muted">
                        {done}/{relevant}
                      </span>
                    </div>
                  </div>
                ) : null}
                <ul className="divide-y divide-line">
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} names={names} today={today} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </Select>
    </div>
  );
}
