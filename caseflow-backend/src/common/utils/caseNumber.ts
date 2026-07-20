import { prisma } from "../../config/prisma";

// Generates sequential, human-friendly case numbers like CF-2026-000123.
// Uses a per-year counter derived from the count of cases created this
// year. Wrapped by the caller in a transaction when strict uniqueness
// under concurrency matters; the unique constraint on Case.caseNumber
// is the final safety net either way.
export async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const startOfNextYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const countThisYear = await prisma.case.count({
    where: { createdAt: { gte: startOfYear, lt: startOfNextYear } },
  });

  const sequence = String(countThisYear + 1).padStart(6, "0");
  return `CF-${year}-${sequence}`;
}
