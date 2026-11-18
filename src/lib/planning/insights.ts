/**
 * Dashboard numbers, all derived from stored task records.
 */

import { addDays, diffDays, endOfMonth, isSameMonth, monthStart, type IsoDate } from "./dates";
import { isOpen, type Assignee, type TaskPriority, type TaskStatus } from "@/lib/types";

export interface InsightTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: IsoDate | null;
  completedAt: string | null; // timestamptz
  isBooking: boolean;
  assignee: Assignee;
}

export interface Dependency {
  taskId: string;
  dependsOnTaskId: string;
}

export interface ProgressStats {
  total: number;
  completed: number;
  remaining: number;
  overdue: number;
  dueNext30: number;
  percent: number;
  monthTotal: number;
  monthCompleted: number;
  monthPercent: number;
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

/**
 * Not-applicable tasks are excluded from every count.
 * "This month" means tasks due this calendar month, plus tasks completed this
 * month that were due earlier (so catching up counts toward the month).
 */
export function computeProgress(tasks: InsightTask[], today: IsoDate, timeZone: string): ProgressStats {
  const relevant = tasks.filter((t) => t.status !== "not_applicable");
  const completed = relevant.filter((t) => t.status === "completed");
  const open = relevant.filter((t) => isOpen(t.status));
  const horizon = addDays(today, 30);

  const completedMonthOf = (t: InsightTask) => (t.completedAt ? dateInZone(t.completedAt, timeZone) : null);
  const inMonth = relevant.filter((t) => {
    if (t.dueDate && isSameMonth(t.dueDate, today)) return true;
    const doneOn = completedMonthOf(t);
    return t.status === "completed" && doneOn !== null && isSameMonth(doneOn, today);
  });
  const monthCompleted = inMonth.filter((t) => t.status === "completed").length;

  return {
    total: relevant.length,
    completed: completed.length,
    remaining: open.length,
    overdue: open.filter((t) => t.dueDate !== null && t.dueDate < today).length,
    dueNext30: open.filter((t) => t.dueDate !== null && t.dueDate >= today && t.dueDate <= horizon).length,
    percent: pct(completed.length, relevant.length),
    monthTotal: inMonth.length,
    monthCompleted,
    monthPercent: pct(monthCompleted, inMonth.length),
  };
}

export function dateInZone(timestamp: string, timeZone: string): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(timestamp),
  );
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { critical: 40, high: 30, medium: 20, low: 10 };

export interface RankedTask extends InsightTask {
  score: number;
  reasons: string[];
  blockedBy: number;
}

/**
 * The most important open tasks for the current month.
 * Candidates: open tasks due on or before the end of this month (overdue included).
 * Score combines priority, how soon it's due, booking urgency, how many other
 * open tasks it unblocks, and whether it's itself waiting on something.
 */
export function rankPriorities(
  tasks: InsightTask[],
  deps: Dependency[],
  today: IsoDate,
  limit = 5,
): RankedTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const monthEnd = endOfMonth(today);

  const unblocks = new Map<string, number>();
  const blockedBy = new Map<string, number>();
  for (const d of deps) {
    const dependent = byId.get(d.taskId);
    const prerequisite = byId.get(d.dependsOnTaskId);
    if (!dependent || !prerequisite) continue;
    if (isOpen(dependent.status) && isOpen(prerequisite.status)) {
      unblocks.set(prerequisite.id, (unblocks.get(prerequisite.id) ?? 0) + 1);
      blockedBy.set(dependent.id, (blockedBy.get(dependent.id) ?? 0) + 1);
    }
  }

  const ranked: RankedTask[] = [];
  for (const task of tasks) {
    if (!isOpen(task.status) || !task.dueDate || task.dueDate > monthEnd) continue;
    const reasons: string[] = [];
    let score = PRIORITY_WEIGHT[task.priority];

    const daysLeft = diffDays(today, task.dueDate);
    if (daysLeft < 0) {
      score += 30 + Math.min(-daysLeft, 30) / 3;
      reasons.push("Overdue");
    } else if (daysLeft <= 7) {
      score += 20;
      reasons.push("Due this week");
    } else if (daysLeft <= 14) {
      score += 12;
    } else {
      score += 6;
    }

    if (task.isBooking) {
      score += 15;
      reasons.push("Vendor booking");
    }

    const opens = unblocks.get(task.id) ?? 0;
    if (opens > 0) {
      score += Math.min(opens * 5, 15);
      reasons.push(opens === 1 ? "Unblocks 1 task" : `Unblocks ${opens} tasks`);
    }

    const waitingOn = blockedBy.get(task.id) ?? 0;
    if (waitingOn > 0 || task.status === "blocked") {
      score -= 25;
      reasons.push("Waiting on another task");
    } else if (task.status === "waiting") {
      score -= 10;
      reasons.push("Waiting on someone");
    }

    ranked.push({ ...task, score, reasons, blockedBy: waitingOn });
  }

  ranked.sort((a, b) => b.score - a.score || (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0) || a.title.localeCompare(b.title));
  return ranked.slice(0, limit);
}

/** Open tasks due between today and today + days, soonest first. Overdue excluded (shown separately). */
export function upcomingDeadlines(tasks: InsightTask[], today: IsoDate, days = 30): InsightTask[] {
  const horizon = addDays(today, days);
  return tasks
    .filter((t) => isOpen(t.status) && t.dueDate !== null && t.dueDate >= today && t.dueDate <= horizon)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : a.title.localeCompare(b.title)));
}

export function overdueTasks(tasks: InsightTask[], today: IsoDate): InsightTask[] {
  return tasks
    .filter((t) => isOpen(t.status) && t.dueDate !== null && t.dueDate < today)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
}

export interface Countdown {
  days: number;
  label: string;
}

export function weddingCountdown(weddingDate: IsoDate | null, today: IsoDate): Countdown | null {
  if (!weddingDate) return null;
  const days = diffDays(today, weddingDate);
  if (days > 1) return { days, label: `${days} Days Until We Say I Do` };
  if (days === 1) return { days, label: "1 Day Until We Say I Do" };
  if (days === 0) return { days, label: "Today We Say I Do" };
  const since = -days;
  return { days, label: since === 1 ? "Married 1 Day" : `Married ${since} Days` };
}

export interface Workload {
  assignee: Assignee;
  open: number;
  dueNext30: number;
  overdue: number;
}

export function workloadByAssignee(tasks: InsightTask[], today: IsoDate): Workload[] {
  const horizon = addDays(today, 30);
  const order: Assignee[] = ["partner1", "partner2", "together", "unassigned"];
  return order.map((assignee) => {
    const mine = tasks.filter((t) => t.assignee === assignee && isOpen(t.status));
    return {
      assignee,
      open: mine.length,
      dueNext30: mine.filter((t) => t.dueDate !== null && t.dueDate >= today && t.dueDate <= horizon).length,
      overdue: mine.filter((t) => t.dueDate !== null && t.dueDate < today).length,
    };
  });
}

export function greeting(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export { monthStart };
