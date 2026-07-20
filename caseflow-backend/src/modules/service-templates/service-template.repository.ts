import { prisma } from "../../config/prisma";
import { CreateServiceTemplateDto, UpdateServiceTemplateDto } from "./service-template.dto";

const include = {
  templateStages: {
    orderBy: { order: "asc" as const },
    include: { checklistItems: { orderBy: { order: "asc" as const } }, requiredDocuments: true },
  },
};

export const serviceTemplateRepository = {
  findMany(activeOnly: boolean) {
    return prisma.serviceTemplate.findMany({
      where: { deletedAt: null, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { name: "asc" },
      include,
    });
  },

  findById(id: string) {
    return prisma.serviceTemplate.findFirst({ where: { id, deletedAt: null }, include });
  },

  create(dto: CreateServiceTemplateDto) {
    return prisma.serviceTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        estimatedDays: dto.estimatedDays,
        defaultPriority: dto.defaultPriority,
        templateStages: {
          create: dto.stages.map((s) => ({
            name: s.name,
            order: s.order,
            color: s.color,
            checklistItems: { create: s.checklistItems },
            requiredDocuments: { create: s.requiredDocuments },
          })),
        },
      },
      include,
    });
  },

  // Replaces all stages/checklist/required-doc rows for simplicity — the
  // admin-facing template editor is low-frequency, so a full
  // delete-and-recreate of child rows is easier to reason about than a
  // diffing update, and cases keep their own snapshot (CaseStage) so this
  // never rewrites in-flight case history.
  async replaceStages(templateId: string, dto: UpdateServiceTemplateDto) {
    return prisma.$transaction(async (tx) => {
      if (dto.name || dto.description !== undefined || dto.estimatedDays !== undefined || dto.defaultPriority) {
        await tx.serviceTemplate.update({
          where: { id: templateId },
          data: {
            name: dto.name,
            description: dto.description,
            estimatedDays: dto.estimatedDays,
            defaultPriority: dto.defaultPriority,
          },
        });
      }

      if (dto.stages) {
        await tx.templateStage.deleteMany({ where: { serviceTemplateId: templateId } });
        for (const s of dto.stages) {
          await tx.templateStage.create({
            data: {
              serviceTemplateId: templateId,
              name: s.name,
              order: s.order,
              color: s.color,
              checklistItems: { create: s.checklistItems },
              requiredDocuments: { create: s.requiredDocuments },
            },
          });
        }
      }

      return tx.serviceTemplate.findUniqueOrThrow({ where: { id: templateId }, include });
    });
  },

  setActive(id: string, isActive: boolean) {
    return prisma.serviceTemplate.update({ where: { id }, data: { isActive } });
  },

  softDelete(id: string) {
    return prisma.serviceTemplate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  },
};
