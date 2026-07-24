import { RecurrencePeriod, RecurrenceUnit } from "@prisma/client";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Adds calendar months, clamping to the last day of the target month
// instead of JS's default overflow-rollover (e.g. Jan 31 + 1 month lands
// on Feb 28/29, not Mar 3).
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfTargetMonth));
  return d;
}

export function computeNextRecurrenceDate(
  fromDate: Date,
  period: RecurrencePeriod,
  customValue?: number | null,
  customUnit?: RecurrenceUnit | null
): Date {
  switch (period) {
    case "WEEKLY":
      return addDays(fromDate, 7);
    case "MONTHLY":
      return addMonths(fromDate, 1);
    case "QUARTERLY":
      return addMonths(fromDate, 3);
    case "BIANNUALLY":
      return addMonths(fromDate, 6);
    case "ANNUALLY":
      return addMonths(fromDate, 12);
    case "CUSTOM": {
      const value = customValue && customValue > 0 ? customValue : 1;
      switch (customUnit) {
        case "WEEKS":
          return addDays(fromDate, value * 7);
        case "MONTHS":
          return addMonths(fromDate, value);
        case "DAYS":
        default:
          return addDays(fromDate, value);
      }
    }
  }
}
