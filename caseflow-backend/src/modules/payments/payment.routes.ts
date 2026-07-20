import { z } from "zod";
import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { NotFoundError, UnauthorizedError } from "../../common/errors/AppError";
import { caseRepository } from "../cases/case.repository";
import { generateInvoiceNumber } from "../../common/utils/invoiceNumber";

const createPaymentSchema = z.object({
  caseId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "bank_transfer", "benefitpay", "other"]),
  receiptFileKey: z.string().optional(),
  paidAt: z.coerce.date().optional(),
});

const paymentRepository = {
  findByCaseId(caseId: string) {
    return prisma.payment.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } });
  },
  create(data: z.infer<typeof createPaymentSchema> & { invoiceNumber: string; paidAt: Date }) {
    return prisma.payment.create({ data });
  },
  sumPaidForCase(caseId: string) {
    return prisma.payment.aggregate({ where: { caseId, paidAt: { not: null } }, _sum: { amount: true } });
  },
};

const paymentService = {
  listForCase: (caseId: string) => paymentRepository.findByCaseId(caseId),

  async create(dto: z.infer<typeof createPaymentSchema>, actorId: string) {
    const invoiceNumber = await generateInvoiceNumber();
    const created = await paymentRepository.create({ ...dto, invoiceNumber, paidAt: dto.paidAt ?? new Date() });

    // Recompute payment status: fully paid once total payments >= customerPrice.
    const caseRecord = await prisma.case.findUnique({ where: { id: dto.caseId } });
    if (!caseRecord) throw new NotFoundError("Case");

    const { _sum } = await paymentRepository.sumPaidForCase(dto.caseId);
    const totalPaid = Number(_sum.amount ?? 0);
    const price = Number(caseRecord.customerPrice ?? 0);

    const paymentStatus = totalPaid <= 0 ? "UNPAID" : price > 0 && totalPaid >= price ? "PAID" : "PARTIALLY_PAID";

    await prisma.case.update({ where: { id: dto.caseId }, data: { paymentStatus } });
    await caseRepository.addTimelineEvent({
      caseId: dto.caseId,
      actorId,
      type: "PAYMENT_ADDED",
      message: `Payment of ${dto.amount} BHD recorded (${dto.method})`,
    });

    return created;
  },
};

const paymentController = {
  listForCase: asyncHandler(async (req: Request, res: Response) => {
    const items = await paymentService.listForCase(req.params.caseId);
    return ok(res, items);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const dto = createPaymentSchema.parse(req.body);
    const created = await paymentService.create(dto, req.user.id);
    return ok(res, created, undefined, 201);
  }),
};

const router = Router();
router.use(requireAuth);

router.get("/case/:caseId", paymentController.listForCase);
router.post("/", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), paymentController.create);

export default router;
