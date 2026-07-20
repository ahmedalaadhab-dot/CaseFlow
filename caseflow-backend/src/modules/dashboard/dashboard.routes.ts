import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { requireAuth } from "../../common/middleware/auth";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const dashboardService = {
  async summary() {
    const today = startOfDay();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = startOfMonth();
    const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const baseWhere = { deletedAt: null as null, isArchived: false };

    const [
      active,
      waitingClient,
      waitingGovernment,
      waitingPayment,
      readyToDeliver,
      completedToday,
      completedThisMonth,
      overdue,
      urgent,
      upcomingDeadlines,
    ] = await Promise.all([
      prisma.case.count({ where: { ...baseWhere, status: { in: ["NEW", "IN_PROGRESS"] } } }),
      prisma.case.count({ where: { ...baseWhere, status: "WAITING_FOR_CLIENT" } }),
      prisma.case.count({ where: { ...baseWhere, status: "WAITING_FOR_GOVERNMENT" } }),
      prisma.case.count({ where: { ...baseWhere, status: "WAITING_FOR_PAYMENT" } }),
      prisma.case.count({ where: { ...baseWhere, currentCaseStage: { name: "Printing" } } }),
      prisma.case.count({ where: { status: "COMPLETED", updatedAt: { gte: today, lt: tomorrow } } }),
      prisma.case.count({ where: { status: "COMPLETED", updatedAt: { gte: monthStart } } }),
      prisma.case.count({ where: { ...baseWhere, dueDate: { lt: today }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      prisma.case.count({ where: { ...baseWhere, priority: "URGENT", status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      prisma.case.count({ where: { ...baseWhere, dueDate: { gte: today, lte: weekAhead }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    ]);

    return {
      activeCases: active,
      waitingForClient: waitingClient,
      waitingForGovernment: waitingGovernment,
      waitingForPayment: waitingPayment,
      readyToDeliver,
      completedToday,
      completedThisMonth,
      overdueCases: overdue,
      urgentCases: urgent,
      upcomingDeadlines,
    };
  },

  async charts() {
    const [byStatus, byService, monthlyPayments] = await Promise.all([
      prisma.case.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
      prisma.case.groupBy({ by: ["serviceTemplateId"], where: { deletedAt: null }, _count: true }),
      prisma.payment.findMany({ where: { paidAt: { not: null } }, select: { amount: true, paidAt: true } }),
    ]);

    const templates = await prisma.serviceTemplate.findMany({
      where: { id: { in: byService.map((s) => s.serviceTemplateId) } },
      select: { id: true, name: true },
    });
    const templateNameById = new Map(templates.map((t) => [t.id, t.name]));

    // Monthly completed cases (last 6 months) + monthly revenue from payments.
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString("en", { month: "short" }) };
    });

    const completedCases = await prisma.case.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: new Date(months[0].year, months[0].month, 1) } },
      select: { updatedAt: true },
    });

    const monthlyCompleted = months.map(({ year, month, label }) => ({
      month: label,
      count: completedCases.filter((c) => c.updatedAt.getFullYear() === year && c.updatedAt.getMonth() === month).length,
    }));

    const monthlyRevenue = months.map(({ year, month, label }) => ({
      month: label,
      revenue: monthlyPayments
        .filter((p) => p.paidAt && p.paidAt.getFullYear() === year && p.paidAt.getMonth() === month)
        .reduce((sum, p) => sum + Number(p.amount), 0),
    }));

    return {
      casesByStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      casesByService: byService.map((s) => ({ service: templateNameById.get(s.serviceTemplateId) ?? "Unknown", count: s._count })),
      monthlyCompletedCases: monthlyCompleted,
      monthlyRevenue,
    };
  },
};

const dashboardController = {
  summary: asyncHandler(async (_req: Request, res: Response) => ok(res, await dashboardService.summary())),
  charts: asyncHandler(async (_req: Request, res: Response) => ok(res, await dashboardService.charts())),
};

const router = Router();
router.use(requireAuth);
router.get("/summary", dashboardController.summary);
router.get("/charts", dashboardController.charts);

export default router;
