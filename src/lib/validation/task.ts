import { z } from "zod";
import { isIsoDate } from "@/lib/planning/dates";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title").max(200, "Keep the title under 200 characters"),
  description: z.string().max(4000, "Too long").default(""),
  notes: z.string().max(8000, "Too long").default(""),
  categoryId: z.string().default(""),
  assignee: z.enum(["unassigned", "partner1", "partner2", "together"]),
  status: z.enum(["not_started", "in_progress", "waiting", "blocked", "completed", "not_applicable"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  dueDate: z
    .string()
    .default("")
    .refine((v) => v === "" || isIsoDate(v), "Enter a valid date"),
});

export type TaskInput = z.input<typeof taskSchema>;
