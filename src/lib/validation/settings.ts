import { z } from "zod";
import { isIsoDate } from "@/lib/planning/dates";
import { isValidTimeZone } from "./setup";

const text = (max: number) => z.string().trim().min(1, "Required").max(max, `Keep it under ${max} characters`);
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Enter a time");

/** Everything in Wedding Settings except the date/month, which has its own confirmation flow. */
export const settingsSchema = z.object({
  partner1Name: text(60),
  partner2Name: text(60),
  venueName: text(120),
  venueLocation: text(160),
  venueTimeZone: z.string().refine(isValidTimeZone, "Choose a time zone"),
  planningTimeZone: z.string().refine(isValidTimeZone, "Choose a time zone"),
  estimatedGuestCount: z.coerce.number().int().min(1, "At least 1").max(2000),
  confirmedGuestCount: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 2000), "Enter a whole number"),
  ceremonyStart: time,
  eventEnd: time,
  ceremonySetting: text(60),
  receptionSetting: text(60),
  weddingStyle: text(200),
  ceremonyTradition: text(120),
  sofrehAghd: z.boolean(),
  alcoholServed: z.boolean(),
  cateringNotes: z.string().trim().max(500),
  outsideVendorNotes: z.string().trim().max(500),
  venueDepositStatus: z.string().trim().max(200),
  totalBudget: z
    .string()
    .trim()
    .transform((v) => v.replace(/[$,\s]/g, ""))
    .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 10_000_000), "Enter an amount like 85000"),
  reminderFrequency: z.enum(["daily", "weekly", "monthly", "none"]),
  checkinDay: z.string().refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 28), "1 to 28"),
  weeklySummary: z.boolean(),
  taskDivision: z.enum(["task_by_task", "balanced", "mostly_together"]),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export const timingSchema = z
  .object({
    weddingDate: z.string().refine((v) => v === "" || isIsoDate(v), "Enter a valid date"),
    weddingMonth: z.string().regex(/^\d{4}-\d{2}$/, "Choose a month"),
  })
  .refine((v) => v.weddingDate === "" || v.weddingDate.startsWith(v.weddingMonth), {
    message: "The date must be in the wedding month",
    path: ["weddingDate"],
  })
  .refine((v) => `${v.weddingMonth}-01` >= "2026-11-01", {
    message: "The wedding month must be after planning begins (November 2026)",
    path: ["weddingMonth"],
  });
export type TimingInput = z.input<typeof timingSchema>;
