import { z } from "zod";
import { Priority } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { NotFoundError, UnauthorizedError } from "../../common/errors/AppError";
import { Router, Request, Response } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { notificationService } from "../notifications/notification.service";

const createTaskSchema = z.object({
  caseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assignedUserId: z.string().optional(),
  deadline: z.coerce.date().optional(),
  priority: z.nativeEnum(Priority).default("NORMAL"),
});

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
  deadline: z.coerce.date().nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  isCompleted: z.boolean().optional(),
});

const taskRepository = {
  findByCaseId(caseId: string) {
    return prisma.task.findMany({ where: { caseId }, orderBy: { deadline: "asc" } });
  },
  findById(id: string) {
    return prisma.task.findUnique({ where: { id } });
  },
  create(data: z.infer<typeof createTaskSchema>) {
    return prisma.task.create({ data });
  },
  update(id: string, data: z.infer<typeof updateTaskSchema>) {
    return prisma.task.update({
      where: { id },
      data: { ...data, completedAt: data.isCompleted === undefined ? undefined : data.isCompleted ? new Date() : null },
    });
  },
  remove(id: string) {
    return prisma.task.delete({ where: { id } });
  },
};

const taskService = {
  listForCase: (caseId: string) => taskRepository.findByCaseId(caseId),

  async create(dto: z.infer<typeof createTaskSchema>) {
    const created = await taskRepository.create(dto);
    if (dto.assignedUserId) {
      await notificationService.notify({
        recipientUserId: dto.assignedUserId,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        body: `You've been assigned: ${dto.title}`,
        relatedCaseId: dto.caseId,
      });
    }
    return created;
  },

  async update(id: string, dto: z.infer<typeof updateTaskSchema>) {
    const found = await taskRepository.findById(id);
    if (!found) throw new NotFoundError("Task");
    return taskRepository.update(id, dto);
  },

  async remove(id: string) {
    const found = await taskRepository.findById(id);
    if (!found) throw new NotFoundError("Task");
    return taskRepository.remove(id);
  },
};

const taskController = {
  listForCase: asyncHandler(async (req: Request, res: Response) => {
    const items = await taskService.listForCase(req.params.caseId);
    return ok(res, items);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const dto = createTaskSchema.parse(req.body);
    const created = await taskService.create(dto);
    return ok(res, created, undefined, 201);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const dto = updateTaskSchema.parse(req.body);
    const updated = await taskService.update(req.params.id, dto);
    return ok(res, updated);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await taskService.remove(req.params.id);
    return ok(res, { message: "Task deleted" });
  }),
};

const router = Router();
router.use(requireAuth);

router.get("/case/:caseId", taskController.listForCase);
router.post("/", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), taskController.create);
router.patch("/:id", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), taskController.update);
router.delete("/:id", requireRole("MANAGER", "EMPLOYEE"), taskController.remove);

export default router;
