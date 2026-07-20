import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { requireAuth, requireRole } from "../../common/middleware/auth";

const reportsService = {
  async casesByEmployee() {
    const rows = await prisma.case.groupBy({
      by: ["assignedEmployeeId"],
      where: { deletedAt: null, assignedEmployeeId: { not: null } },
      _count: true,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.assignedEmployeeId!) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const nameById = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
    return rows.map((r) => ({ employee: nameById.get(r.assignedEmployeeId!) ?? "Unknown", caseCount: r._count }));
  },

  async revenue() {
    const { _sum } = await prisma.payment.aggregate({ where: { paidAt: { not: null } }, _sum: { amount: true } });
    const byMethod = await prisma.payment.groupBy({ by: ["method"], where: { paidAt: { not: null } }, _sum: { amount: true } });
    return {
      totalRevenue: Number(_sum.amount ?? 0),
      byMethod: byMethod.map((m) => ({ method: m.method, total: Number(m._sum.amount ?? 0) })),
    };
  },

  async servicePopularity() {
    const rows = await prisma.case.groupBy({ by: ["serviceTemplateId"], where: { deletedAt: null }, _count: true });
    const templates = await prisma.serviceTemplate.findMany({
      where: { id: { in: rows.map((r) => r.serviceTemplateId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(templates.map((t) => [t.id, t.name]));
    return rows
      .map((r) => ({ service: nameById.get(r.serviceTemplateId) ?? "Unknown", caseCount: r._count }))
      .sort((a, b) => b.caseCount - a.caseCount);
  },

  async averageCompletionTime() {
    const completed = await prisma.case.findMany({
      where: { status: "COMPLETED", deletedAt: null },
      select: { createdAt: true, updatedAt: true },
    });
    if (completed.length === 0) return { averageDays: 0, sampleSize: 0 };
    const totalDays = completed.reduce((sum, c) => sum + (c.updatedAt.getTime() - c.createdAt.getTime()) / 86_400_000, 0);
    return { averageDays: Math.round((totalDays / completed.length) * 10) / 10, sampleSize: completed.length };
  },

  async overdueCases() {
    return prisma.case.findMany({
      where: { deletedAt: null, isArchived: false, dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { customer: { select: { fullName: true } }, assignedEmployee: { select: { firstName: true, lastName: true } } },
      orderBy: { dueDate: "asc" },
    });
  },

  async customerHistory(customerId: string) {
    return prisma.case.findMany({
      where: { customerId, deletedAt: null },
      include: { serviceTemplate: { select: { name: true } }, payments: true },
      orderBy: { createdAt: "desc" },
    });
  },
};

const reportsController = {
  casesByEmployee: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.casesByEmployee())),
  revenue: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.revenue())),
  servicePopularity: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.servicePopularity())),
  averageCompletionTime: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.averageCompletionTime())),
  overdueCases: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.overdueCases())),
  customerHistory: asyncHandler(async (req: Request, res: Response) => ok(res, await reportsService.customerHistory(req.params.customerId))),
};

const router = Router();
router.use(requireAuth, requireRole("MANAGER", "EMPLOYEE"));

router.get("/cases-by-employee", reportsController.casesByEmployee);
router.get("/revenue", reportsController.revenue);
router.get("/service-popularity", reportsController.servicePopularity);
router.get("/average-completion-time", reportsController.averageCompletionTime);
router.get("/overdue-cases", reportsController.overdueCases);
router.get("/customer-history/:customerId", reportsController.customerHistory);

export default router;
