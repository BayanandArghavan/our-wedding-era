import { CATEGORIES, SEED_MILESTONES, SEED_TASKS, SEED_VENDOR_NEEDS } from "./catalog";
import { suggestDueDate, type WeddingTiming } from "./schedule";

/** Builds the JSON arguments for the create_workspace database function. */
export function buildSeedPayload(timing: WeddingTiming) {
  return {
    p_categories: CATEGORIES.map((name, i) => ({ name, sort_order: i })),
    p_tasks: SEED_TASKS.map((task, i) => ({
      seed_key: task.key,
      title: task.title,
      description: task.description ?? "",
      category: task.category,
      priority: task.priority,
      months_before: task.monthsBefore,
      days_before: task.daysBefore ?? null,
      is_booking: task.isBooking ?? false,
      depends_on: task.dependsOn ?? [],
      due_date: suggestDueDate({ monthsBefore: task.monthsBefore, daysBefore: task.daysBefore ?? null }, timing),
      sort_order: i,
    })),
    p_milestones: SEED_MILESTONES.map((m, i) => ({
      seed_key: m.key,
      title: m.title,
      sort_order: i,
      is_completed: m.isCompleted ?? false,
      task_keys: m.taskKeys,
    })),
    p_vendor_needs: SEED_VENDOR_NEEDS.map((v, i) => ({ ...v, sort_order: i })),
  };
}
