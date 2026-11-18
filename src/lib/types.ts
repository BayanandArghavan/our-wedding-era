import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type TaskRow = Tables["tasks"]["Row"];
export type TaskCategoryRow = Tables["task_categories"]["Row"];
export type SubtaskRow = Tables["task_subtasks"]["Row"];
export type DependencyRow = Tables["task_dependencies"]["Row"];
export type TaskActivityRow = Tables["task_activity"]["Row"];
export type SettingsRow = Tables["wedding_settings"]["Row"];
export type MemberRow = Tables["workspace_members"]["Row"];
export type InvitationRow = Tables["workspace_invitations"]["Row"];
export type MilestoneRow = Tables["milestones"]["Row"];
export type MilestoneTaskRow = Tables["milestone_tasks"]["Row"];
export type VendorNeedRow = Tables["vendor_needs"]["Row"];
export type ActivityRow = Tables["activity_log"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];

export type TaskStatus = Enums["task_status"];
export type TaskPriority = Enums["task_priority"];
export type Assignee = Enums["assignee_kind"];
export type DateSource = Enums["date_source"];
export type VendorNeedStatus = Enums["vendor_need_status"];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting on Someone" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "not_applicable", label: "Not Applicable" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const STATUS_LABEL = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, s.label])) as Record<
  TaskStatus,
  string
>;
export const PRIORITY_LABEL = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p.label])) as Record<
  TaskPriority,
  string
>;

export const VENDOR_NEED_LABEL: Record<VendorNeedStatus, string> = {
  not_booked: "Not booked",
  booked: "Booked",
  not_needed: "Not needed",
};

export interface PartnerNames {
  partner1: string;
  partner2: string;
}

export function assigneeLabel(a: Assignee, names: PartnerNames): string {
  switch (a) {
    case "partner1":
      return names.partner1;
    case "partner2":
      return names.partner2;
    case "together":
      return "Together";
    default:
      return "Unassigned";
  }
}

export function isOpen(status: TaskStatus): boolean {
  return status !== "completed" && status !== "not_applicable";
}
