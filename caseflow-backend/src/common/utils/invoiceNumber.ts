import { prisma } from "../../config/prisma";

// Generates invoice numbers like 260721001 — YYMMDD + a 3-digit counter
// that resets daily, derived from how many payments were already
// recorded today. Mirrors generateCaseNumber's approach (see caseNumber.ts).
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const countToday = await prisma.payment.count({
    where: { createdAt: { gte: startOfDay, lt: startOfNextDay } },
  });

  const sequence = String(countToday + 1).padStart(3, "0");
  return `${yy}${mm}${dd}${sequence}`;
}
