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

  // Profit per case (customerPrice - caseCost) isn't stored — same
  // derivation the case detail "Financials" card uses — summed across all
  // non-deleted cases. Prisma can't subtract two columns in an aggregate,
  // so this reduces in JS rather than a groupBy/aggregate query.
  async profit() {
    const cases = await prisma.case.findMany({
      where: { deletedAt: null },
      select: { caseCost: true, customerPrice: true },
    });
    const totalProfit = cases.reduce((sum, c) => sum + (Number(c.customerPrice ?? 0) - Number(c.caseCost ?? 0)), 0);
    return { totalProfit };
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
  profit: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.profit())),
  servicePopularity: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.servicePopularity())),
  averageCompletionTime: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.averageCompletionTime())),
  overdueCases: asyncHandler(async (_req: Request, res: Response) => ok(res, await reportsService.overdueCases())),
  customerHistory: asyncHandler(async (req: Request, res: Response) => ok(res, await reportsService.customerHistory(req.params.customerId))),
};

const router = Router();
router.use(requireAuth, requireRole("MANAGER", "EMPLOYEE"));

router.get("/cases-by-employee", reportsController.casesByEmployee);
router.get("/profit", reportsController.profit);
router.get("/service-popularity", reportsController.servicePopularity);
router.get("/average-completion-time", reportsController.averageCompletionTime);
router.get("/overdue-cases", reportsController.overdueCases);
router.get("/customer-history/:customerId", reportsController.customerHistory);

export default router;
