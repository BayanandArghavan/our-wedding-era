import { z } from "zod";
import { isIsoDate } from "@/lib/planning/dates";

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || isIsoDate(v), "Enter a valid date")
  .optional()
  .transform((v) => (v ? v : null));

const optionalMoney = z
  .string()
  .trim()
  .transform((v) => v.replace(/[$,\s]/g, ""))
  .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 10_000_000), "Enter an amount like 85000")
  .transform((v) => (v === "" ? null : v));

const optionalCount = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 2000), "Enter a whole number")
  .transform((v) => (v === "" ? null : Number(v)));

export const detailsSchema = z.object({
  partnerSlot: z.enum(["1", "2"], { message: "Choose who you are" }),
  partner1Name: z.string().trim().min(1, "Required").max(60),
  partner2Name: z.string().trim().min(1, "Required").max(60),
  weddingDate: optionalDate,
  totalBudget: optionalMoney,
  estimatedGuestCount: z.coerce.number().int().min(1, "Enter at least 1").max(2000),
  confirmedGuestCount: optionalCount,
  planningTimeZone: z.string().min(1).max(64).refine(isValidTimeZone, "Choose a time zone"),
});
export type DetailsInput = z.input<typeof detailsSchema>;


export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const COMMON_TIME_ZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Central Europe (Paris)" },
  { value: "Asia/Tehran", label: "Tehran" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Jerusalem", label: "Haifa / Jerusalem" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "UTC", label: "UTC" },
];
