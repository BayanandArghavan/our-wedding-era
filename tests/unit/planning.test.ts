import { describe, expect, it } from "vitest";
import { addDays, diffDays, endOfMonth, isIsoDate, todayInZone } from "@/lib/planning/dates";
import { CATEGORIES, SEED_MILESTONES, SEED_TASKS } from "@/lib/planning/catalog";
import { planDateChange, suggestDueDate, type SchedulableTask } from "@/lib/planning/schedule";
import {
  computeProgress,
  rankPriorities,
  upcomingDeadlines,
  weddingCountdown,
  type InsightTask,
} from "@/lib/planning/insights";
import { buildSeedPayload } from "@/lib/planning/seed";

const SEPT_2027 = { weddingDate: null, weddingMonth: "2027-09-01" };

describe("dates", () => {
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-9-1")).toBe(false);
  });

  it("handles month ends and leap years", () => {
    expect(endOfMonth("2027-02-10")).toBe("2027-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(endOfMonth("2026-12-01")).toBe("2026-12-31");
  });

  it("counts days across a daylight saving change without drifting", () => {
    // US clocks fall back on 2026-11-01.
    expect(diffDays("2026-10-31", "2026-11-02")).toBe(2);
    expect(addDays("2027-03-13", 1)).toBe("2027-03-14");
  });

  it("reads today's date in the venue time zone, not UTC", () => {
    // 2026-11-15 05:30 UTC is still Nov 14 in Los Angeles.
    const instant = new Date("2026-11-15T05:30:00Z");
    expect(todayInZone("America/Los_Angeles", instant)).toBe("2026-11-14");
    expect(todayInZone("UTC", instant)).toBe("2026-11-15");
  });
});

describe("seed catalog", () => {
  it("has unique keys and no duplicate titles", () => {
    const keys = SEED_TASKS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    const titles = SEED_TASKS.map((t) => t.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("only references tasks that exist", () => {
    const keys = new Set(SEED_TASKS.map((t) => t.key));
    for (const t of SEED_TASKS) for (const d of t.dependsOn ?? []) expect(keys.has(d), `${t.key} -> ${d}`).toBe(true);
    for (const m of SEED_MILESTONES) for (const k of m.taskKeys) expect(keys.has(k), `${m.key} -> ${k}`).toBe(true);
  });

  it("has no dependency cycles", () => {
    const deps = new Map(SEED_TASKS.map((t) => [t.key, t.dependsOn ?? []]));
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (k: string) => {
      if (done.has(k)) return;
      expect(visiting.has(k), `cycle at ${k}`).toBe(false);
      visiting.add(k);
      deps.get(k)!.forEach(visit);
      visiting.delete(k);
      done.add(k);
    };
    SEED_TASKS.forEach((t) => visit(t.key));
  });

  it("puts every task in a known category", () => {
    for (const t of SEED_TASKS) expect(CATEGORIES).toContain(t.category);
  });

  it("starts with only We Said Yes and Venue Secured completed", () => {
    expect(SEED_MILESTONES.filter((m) => m.isCompleted).map((m) => m.key)).toEqual(["said_yes", "venue_secured"]);
  });

  it("schedules November 2026 roadmap items in November 2026 before a date is set", () => {
    const payload = buildSeedPayload(SEPT_2027);
    const nov = payload.p_tasks.filter((t) => t.due_date === "2026-11-30").map((t) => t.title);
    for (const title of [
      "Obtain written deposit confirmation",
      "Review venue inclusions",
      "Set total budget",
      "Draft guest list",
      "Research planners",
      "Research photographers",
      "Research videographers",
      "Research DJs",
      "Design save-the-dates",
    ]) {
      expect(nov).toContain(title);
    }
  });
});

describe("suggestDueDate", () => {
  it("uses the end of the roadmap month without an exact date", () => {
    expect(suggestDueDate({ monthsBefore: 10, daysBefore: null }, SEPT_2027)).toBe("2026-11-30");
    expect(suggestDueDate({ monthsBefore: -1, daysBefore: null }, SEPT_2027)).toBe("2027-10-31");
  });

  it("never puts a wedding-month task after the wedding", () => {
    expect(suggestDueDate({ monthsBefore: 0, daysBefore: null }, SEPT_2027)).toBe("2027-09-01");
    expect(suggestDueDate({ monthsBefore: 0, daysBefore: null }, { weddingDate: "2027-09-18", weddingMonth: "2027-09-01" })).toBe(
      "2027-09-17",
    );
  });

  it("uses daysBefore once the exact date is known", () => {
    const timing = { weddingDate: "2027-09-18", weddingMonth: "2027-09-01" };
    expect(suggestDueDate({ monthsBefore: 3, daysBefore: 84 }, timing)).toBe("2027-06-26");
    expect(suggestDueDate({ monthsBefore: -1, daysBefore: -7 }, timing)).toBe("2027-09-25");
  });

  it("ignores daysBefore until the exact date is known", () => {
    expect(suggestDueDate({ monthsBefore: 3, daysBefore: 84 }, SEPT_2027)).toBe("2027-06-30");
  });
});

describe("planDateChange", () => {
  const base = (over: Partial<SchedulableTask>): SchedulableTask => ({
    id: "t",
    title: "Task",
    status: "not_started",
    dueDate: "2027-06-30",
    dateSource: "suggested",
    monthsBefore: 3,
    daysBefore: 84,
    ...over,
  });

  it("separates suggested dates from hand-edited dates", () => {
    const plan = planDateChange(
      [base({ id: "a" }), base({ id: "b", dateSource: "manual", dueDate: "2027-06-01" })],
      { weddingDate: "2027-09-18", weddingMonth: "2027-09-01" },
      "2026-11-14",
    );
    expect(plan.suggested.map((c) => c.taskId)).toEqual(["a"]);
    expect(plan.manual.map((c) => c.taskId)).toEqual(["b"]);
  });

  it("never moves completed or not-applicable tasks", () => {
    const plan = planDateChange(
      [base({ id: "a", status: "completed" }), base({ id: "b", status: "not_applicable" })],
      { weddingDate: "2027-09-18", weddingMonth: "2027-09-01" },
      "2026-11-14",
    );
    expect(plan.suggested).toHaveLength(0);
    expect(plan.manual).toHaveLength(0);
  });

  it("flags suggestions that are already in the past", () => {
    const plan = planDateChange(
      [base({ id: "photo", monthsBefore: 9, daysBefore: 300, dueDate: "2026-12-31" })],
      { weddingDate: "2027-09-04", weddingMonth: "2027-09-01" },
      "2026-11-14",
    );
    expect(plan.suggested[0]).toMatchObject({ to: "2026-11-08", isPast: true });
  });

  it("skips tasks whose date would not change", () => {
    const plan = planDateChange([base({ dueDate: "2027-06-26" })], { weddingDate: "2027-09-18", weddingMonth: "2027-09-01" }, "2026-11-14");
    expect(plan.suggested).toHaveLength(0);
  });
});

const task = (over: Partial<InsightTask>): InsightTask => ({
  id: Math.random().toString(36).slice(2),
  title: "Task",
  status: "not_started",
  priority: "medium",
  dueDate: null,
  completedAt: null,
  isBooking: false,
  assignee: "unassigned",
  ...over,
});

describe("computeProgress", () => {
  const today = "2026-11-14";

  it("excludes not-applicable tasks and counts overdue and upcoming", () => {
    const stats = computeProgress(
      [
        task({ status: "completed", completedAt: "2026-11-10T18:00:00Z", dueDate: "2026-11-30" }),
        task({ dueDate: "2026-11-01" }),
        task({ dueDate: "2026-11-20" }),
        task({ dueDate: "2027-03-01" }),
        task({ status: "not_applicable", dueDate: "2026-11-02" }),
      ],
      today,
      "America/Los_Angeles",
    );
    expect(stats).toMatchObject({ total: 4, completed: 1, remaining: 3, overdue: 1, dueNext30: 1, percent: 25 });
    expect(stats.monthTotal).toBe(3);
    expect(stats.monthCompleted).toBe(1);
    expect(stats.monthPercent).toBe(33);
  });

  it("does not count a past due date as done", () => {
    const stats = computeProgress([task({ dueDate: "2026-10-01" })], today, "UTC");
    expect(stats.completed).toBe(0);
    expect(stats.overdue).toBe(1);
  });

  it("returns 0% rather than NaN with no tasks", () => {
    expect(computeProgress([], today, "UTC").percent).toBe(0);
  });
});

describe("rankPriorities", () => {
  const today = "2026-11-14";

  it("puts an overdue critical task above a later low-priority one", () => {
    const a = task({ id: "a", title: "Low later", priority: "low", dueDate: "2026-11-29" });
    const b = task({ id: "b", title: "Critical overdue", priority: "critical", dueDate: "2026-11-05" });
    expect(rankPriorities([a, b], [], today).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("demotes a task waiting on an open prerequisite and promotes the prerequisite", () => {
    const research = task({ id: "r", title: "Research", priority: "medium", dueDate: "2026-11-30" });
    const book = task({ id: "k", title: "Book", priority: "high", dueDate: "2026-11-30", isBooking: true });
    const ranked = rankPriorities([research, book], [{ taskId: "k", dependsOnTaskId: "r" }], today);
    expect(ranked[0].id).toBe("r");
    expect(ranked.find((t) => t.id === "k")!.reasons).toContain("Waiting on another task");
  });

  it("only considers open tasks due by the end of this month and caps at five", () => {
    const tasks = [
      ...Array.from({ length: 7 }, (_, i) => task({ id: `n${i}`, dueDate: "2026-11-30" })),
      task({ id: "dec", dueDate: "2026-12-01", priority: "critical" }),
      task({ id: "done", dueDate: "2026-11-15", status: "completed", completedAt: "2026-11-14T00:00:00Z" }),
    ];
    const ranked = rankPriorities(tasks, [], today);
    expect(ranked).toHaveLength(5);
    expect(ranked.map((t) => t.id)).not.toContain("dec");
    expect(ranked.map((t) => t.id)).not.toContain("done");
  });
});

describe("upcomingDeadlines", () => {
  it("includes today and the 30th day, excludes overdue and completed", () => {
    const today = "2026-11-14";
    const list = upcomingDeadlines(
      [
        task({ id: "today", dueDate: today }),
        task({ id: "edge", dueDate: "2026-12-14" }),
        task({ id: "past", dueDate: "2026-11-13" }),
        task({ id: "far", dueDate: "2026-12-15" }),
        task({ id: "done", dueDate: "2026-11-20", status: "completed", completedAt: "2026-11-14T00:00:00Z" }),
      ],
      today,
    );
    expect(list.map((t) => t.id)).toEqual(["today", "edge"]);
  });
});

describe("weddingCountdown", () => {
  it("computes the countdown from the stored date", () => {
    expect(weddingCountdown("2027-09-18", "2026-11-14")).toEqual({ days: 308, label: "308 Days Until We Say I Do" });
    expect(weddingCountdown("2027-09-18", "2027-09-17")!.label).toBe("1 Day Until We Say I Do");
    expect(weddingCountdown("2027-09-18", "2027-09-18")!.label).toBe("Today We Say I Do");
    expect(weddingCountdown(null, "2026-11-14")).toBeNull();
  });
});
