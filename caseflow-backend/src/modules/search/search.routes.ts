import { z } from "zod";
import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { requireAuth } from "../../common/middleware/auth";

const querySchema = z.object({ q: z.string().min(1) });

const searchService = {
  async search(q: string) {
    const [cases, customers] = await Promise.all([
      prisma.case.findMany({
        where: {
          deletedAt: null,
          OR: [
            { caseNumber: { contains: q, mode: "insensitive" } },
            { governmentReferenceNumber: { contains: q, mode: "insensitive" } },
            { governmentTrackingNumber: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
        include: { customer: { select: { fullName: true } } },
      }),
      prisma.customer.findMany({
        where: {
          deletedAt: null,
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { cpr: { contains: q, mode: "insensitive" } },
            { passportNumber: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { employer: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
    ]);
    return { cases, customers };
  },
};

const searchController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const { q } = querySchema.parse(req.query);
    return ok(res, await searchService.search(q));
  }),
};

const router = Router();
router.use(requireAuth);
router.get("/", searchController.search);

export default router;
