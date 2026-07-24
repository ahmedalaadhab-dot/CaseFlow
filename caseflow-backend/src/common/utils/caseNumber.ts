import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

// Generates sequential, human-friendly case numbers like CF-2026-000123,
// backed by a dedicated per-year counter (CaseNumberCounter) rather than a
// count of existing Case rows — a row count drops whenever a case is
// deleted, so the next "generated" number would collide with one still in
// use (real bug: hit in production once case hard-delete shipped).
//
// `update` on a non-existent counter row throws P2025, which triggers a
// one-time seed: the counter is initialized from the highest existing
// sequence for the year (not a count) so it can't collide with cases
// created before this counter existed, even ones since deleted.
export async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CF-${year}-`;

  try {
    const counter = await prisma.caseNumberCounter.update({
      where: { year },
      data: { value: { increment: 1 } },
    });
    return `${prefix}${String(counter.value).padStart(6, "0")}`;
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2025") throw err;

    const maxSeq = await seedCounterFromExistingCases(year, prefix);
    try {
      const created = await prisma.caseNumberCounter.create({ data: { year, value: maxSeq + 1 } });
      return `${prefix}${String(created.value).padStart(6, "0")}`;
    } catch {
      // Lost a race to seed the row (concurrent first-case-of-the-year
      // request) — it exists now, so just increment it.
      const counter = await prisma.caseNumberCounter.update({ where: { year }, data: { value: { increment: 1 } } });
      return `${prefix}${String(counter.value).padStart(6, "0")}`;
    }
  }
}

async function seedCounterFromExistingCases(year: number, prefix: string): Promise<number> {
  const existing = await prisma.case.findMany({
    where: { caseNumber: { startsWith: prefix } },
    select: { caseNumber: true },
  });
  return existing.reduce((max, c) => {
    const seq = parseInt(c.caseNumber.slice(prefix.length), 10);
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
}
