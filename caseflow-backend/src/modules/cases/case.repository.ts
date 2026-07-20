import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { CaseQueryDto, UpdateCaseDto } from "./case.dto";

const caseListInclude = {
  customer: { select: { id: true, fullName: true, phone: true } },
  assignedEmployee: { select: { id: true, firstName: true, lastName: true } },
  serviceTemplate: { select: { id: true, name: true } },
  currentCaseStage: true,
} satisfies Prisma.CaseInclude;

const caseDetailInclude = {
  ...caseListInclude,
  // Wider than the list select — invoices need CPR/passport/address for
  // the Bill To section.
  customer: { select: { id: true, fullName: true, phone: true, cpr: true, passportNumber: true, address: true } },
  caseStages: { orderBy: { order: "asc" as const }, include: { checklistItems: true } },
  documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" as const } },
  tasks: { orderBy: { deadline: "asc" as const } },
  timelineEvents: { orderBy: { createdAt: "desc" as const }, take: 50, include: { actor: { select: { id: true, firstName: true, lastName: true } } } },
  payments: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.CaseInclude;

export const caseRepository = {
  async findMany(query: CaseQueryDto) {
    const where: Prisma.CaseWhereInput = {
      deletedAt: null,
      isArchived: query.isArchived ?? false,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assignedEmployeeId ? { assignedEmployeeId: query.assignedEmployeeId } : {}),
      ...(query.serviceTemplateId ? { serviceTemplateId: query.serviceTemplateId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.dueBefore || query.dueAfter
        ? {
            dueDate: {
              ...(query.dueBefore ? { lte: query.dueBefore } : {}),
              ...(query.dueAfter ? { gte: query.dueAfter } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { caseNumber: { contains: query.search, mode: "insensitive" } },
              { governmentReferenceNumber: { contains: query.search, mode: "insensitive" } },
              { governmentTrackingNumber: { contains: query.search, mode: "insensitive" } },
              { customer: { fullName: { contains: query.search, mode: "insensitive" } } },
              { customer: { cpr: { contains: query.search, mode: "insensitive" } } },
              { customer: { phone: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: caseListInclude,
      }),
      prisma.case.count({ where }),
    ]);

    return { items, totalCount };
  },

  findById(id: string) {
    return prisma.case.findFirst({ where: { id, deletedAt: null }, include: caseDetailInclude });
  },

  async createWithStages(params: {
    caseNumber: string;
    customerId: string;
    assignedEmployeeId?: string;
    createdByUserId: string;
    serviceTemplateId: string;
    priority: Prisma.CaseCreateInput["priority"];
    dueDate?: Date;
    description?: string;
    caseCost?: number;
    customerPrice?: number;
  }) {
    // Snapshot the template's stages/checklist onto the case at creation
    // time, so later edits to the template don't rewrite case history.
    const template = await prisma.serviceTemplate.findUniqueOrThrow({
      where: { id: params.serviceTemplateId },
      include: { templateStages: { orderBy: { order: "asc" }, include: { checklistItems: true } } },
    });

    return prisma.$transaction(async (tx) => {
      const created = await tx.case.create({
        data: {
          caseNumber: params.caseNumber,
          customerId: params.customerId,
          assignedEmployeeId: params.assignedEmployeeId,
          createdByUserId: params.createdByUserId,
          serviceTemplateId: params.serviceTemplateId,
          priority: params.priority,
          dueDate: params.dueDate,
          description: params.description,
          caseCost: params.caseCost,
          customerPrice: params.customerPrice,
        },
      });

      let firstStageId: string | null = null;

      for (const templateStage of template.templateStages) {
        const caseStage: { id: string } = await tx.caseStage.create({
          data: {
            caseId: created.id,
            templateStageId: templateStage.id,
            name: templateStage.name,
            order: templateStage.order,
            color: templateStage.color,
            enteredAt: firstStageId === null ? new Date() : null,
            checklistItems: {
              create: templateStage.checklistItems.map((item) => ({
                label: item.label,
                isMandatory: item.isMandatory,
                order: item.order,
              })),
            },
          },
        });
        if (firstStageId === null) firstStageId = caseStage.id;
      }

      const updated = await tx.case.update({
        where: { id: created.id },
        data: { currentCaseStageId: firstStageId },
        include: caseDetailInclude,
      });

      await tx.timelineEvent.create({
        data: {
          caseId: created.id,
          actorId: params.createdByUserId,
          type: "CASE_CREATED",
          message: `Case ${created.caseNumber} created`,
        },
      });

      return updated;
    });
  },

  update(id: string, data: UpdateCaseDto) {
    return prisma.case.update({ where: { id }, data, include: caseDetailInclude });
  },

  softDelete(id: string) {
    return prisma.case.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  addTimelineEvent(params: { caseId: string; actorId?: string; type: string; message: string; metadata?: Prisma.InputJsonValue }) {
    return prisma.timelineEvent.create({ data: params });
  },
};
