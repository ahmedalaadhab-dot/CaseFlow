import type { RecurrencePeriod, RecurrenceUnit } from "./types";

export const RECURRENCE_PERIODS: RecurrencePeriod[] = [
  "WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUALLY", "ANNUALLY", "CUSTOM",
];

export const RECURRENCE_PERIOD_LABELS: Record<RecurrencePeriod, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  BIANNUALLY: "Biannually",
  ANNUALLY: "Annually",
  CUSTOM: "Custom",
};

export const RECURRENCE_UNITS: RecurrenceUnit[] = ["DAYS", "WEEKS", "MONTHS"];

export const RECURRENCE_UNIT_LABELS: Record<RecurrenceUnit, string> = {
  DAYS: "day(s)",
  WEEKS: "week(s)",
  MONTHS: "month(s)",
};

export function describeRecurrence(
  period?: RecurrencePeriod | null,
  customValue?: number | null,
  customUnit?: RecurrenceUnit | null
): string {
  if (!period) return "One-time";
  if (period === "CUSTOM") {
    if (!customValue || !customUnit) return "Custom";
    return `Every ${customValue} ${RECURRENCE_UNIT_LABELS[customUnit]}`;
  }
  return RECURRENCE_PERIOD_LABELS[period];
}
