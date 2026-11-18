/**
 * Suggested due dates.
 *
 * Rules:
 *  - With an exact wedding date and a task-specific `daysBefore`, the
 *    suggestion is weddingDate - daysBefore.
 *  - Otherwise the suggestion is the last day of the task's roadmap month,
 *    counted back from the wedding month.
 *  - Wedding-month tasks without an exact date fall on the 1st of the wedding
 *    month (end of month could land after the wedding). These are marked
 *    provisional in the UI until the exact date is entered.
 *  - Wedding-month tasks with an exact date but no daysBefore fall the day
 *    before the wedding at the latest.
 */

import { addDays, addMonthsToMonthStart, endOfMonth, monthStart, type IsoDate } from "./dates";
import type { DateSource, TaskStatus } from "@/lib/types";

export interface WeddingTiming {
  weddingDate: IsoDate | null;
  weddingMonth: IsoDate; // first of month
}

export interface PlanningMeta {
  monthsBefore: number | null;
  daysBefore: number | null;
}

export function suggestDueDate(meta: PlanningMeta, timing: WeddingTiming): IsoDate | null {
  const { monthsBefore, daysBefore } = meta;
  const weddingMonth = monthStart(timing.weddingMonth);

  if (timing.weddingDate && daysBefore !== null && daysBefore !== undefined) {
    return addDays(timing.weddingDate, -daysBefore);
  }
  if (monthsBefore === null || monthsBefore === undefined) return null;

  const roadmapMonth = addMonthsToMonthStart(weddingMonth, -monthsBefore);
  if (monthsBefore === 0) {
    return timing.weddingDate ? addDays(timing.weddingDate, -1) : weddingMonth;
  }
  return endOfMonth(roadmapMonth);
}

/** A suggestion is provisional when it depends on a wedding date we don't have yet. */
export function isProvisional(meta: PlanningMeta, timing: WeddingTiming): boolean {
  if (timing.weddingDate) return false;
  return meta.monthsBefore !== null || meta.daysBefore !== null;
}

export interface SchedulableTask extends PlanningMeta {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: IsoDate | null;
  dateSource: DateSource;
}

export interface ProposedChange {
  taskId: string;
  title: string;
  from: IsoDate | null;
  to: IsoDate;
  isPast: boolean;
}

export interface DateChangePlan {
  /** Tasks still on a suggested date: proposed to move, pre-selected. */
  suggested: ProposedChange[];
  /** Tasks someone dated by hand: listed separately, never pre-selected. */
  manual: ProposedChange[];
}

/**
 * Work out which open tasks would move if the wedding timing changed.
 * Completed and not-applicable tasks never move. Nothing is applied here;
 * the couple confirms the list first.
 */
export function planDateChange(tasks: SchedulableTask[], next: WeddingTiming, today: IsoDate): DateChangePlan {
  const plan: DateChangePlan = { suggested: [], manual: [] };
  for (const task of tasks) {
    if (task.status === "completed" || task.status === "not_applicable") continue;
    const to = suggestDueDate(task, next);
    if (!to || to === task.dueDate) continue;
    const change: ProposedChange = { taskId: task.id, title: task.title, from: task.dueDate, to, isPast: to < today };
    if (task.dateSource === "manual") plan.manual.push(change);
    else plan.suggested.push(change);
  }
  const byDate = (a: ProposedChange, b: ProposedChange) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0);
  plan.suggested.sort(byDate);
  plan.manual.sort(byDate);
  return plan;
}
