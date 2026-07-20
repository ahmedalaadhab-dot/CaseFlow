import { prisma } from "../../config/prisma";
import { caseRepository } from "./case.repository";
import { CreateCaseDto, UpdateCaseDto, CaseQueryDto } from "./case.dto";
import { generateCaseNumber } from "../../common/utils/caseNumber";
import { NotFoundError, ValidationError, ForbiddenError } from "../../common/errors/AppError";
import { buildMeta } from "../../common/utils/pagination";
import { notificationService } from "../notifications/notification.service";

export const caseService = {
  async list(query: CaseQueryDto) {
    const { items, totalCount } = await caseRepository.findMany(query);
    return { items, meta: buildMeta(query, totalCount) };
  },

  async getById(id: string) {
    const found = await caseRepository.findById(id);
    if (!found) throw new NotFoundError("Case");
    return found;
  },

  async create(dto: CreateCaseDto, createdByUserId: string) {
    const caseNumber = await generateCaseNumber();
    const created = await caseRepository.createWithStages({
      caseNumber,
      customerId: dto.customerId,
      assignedEmployeeId: dto.assignedEmployeeId,
      createdByUserId,
      serviceTemplateId: dto.serviceTemplateId,
      priority: dto.priority ?? "NORMAL",
      dueDate: dto.dueDate,
      description: dto.description,
      caseCost: dto.caseCost,
      customerPrice: dto.customerPrice,
    });

    if (dto.assignedEmployeeId) {
      await notificationService.notify({
        recipientUserId: dto.assignedEmployeeId,
        type: "CASE_ASSIGNED",
        title: "New case assigned",
        body: `You've been assigned case ${created.caseNumber}`,
        relatedCaseId: created.id,
      });
    }

    return created;
  },

  async update(id: string, dto: UpdateCaseDto, actorId: string) {
    const existing = await this.getById(id);

    const wasReassigned = dto.assignedEmployeeId && dto.assignedEmployeeId !== existing.assignedEmployeeId;

    const updated = await caseRepository.update(id, dto);

    if (dto.status && dto.status !== existing.status) {
      await caseRepository.addTimelineEvent({
        caseId: id,
        actorId,
        type: "STATUS_CHANGED",
        message: `Status changed from ${existing.status} to ${dto.status}`,
      });
    }

    if (wasReassigned && dto.assignedEmployeeId) {
      await caseRepository.addTimelineEvent({
        caseId: id,
        actorId,
        type: "USER_ASSIGNED",
        message: `Case reassigned`,
      });
      await notificationService.notify({
        recipientUserId: dto.assignedEmployeeId,
        type: "CASE_ASSIGNED",
        title: "Case assigned to you",
        body: `Case ${existing.caseNumber} has been assigned to you`,
        relatedCaseId: id,
      });
    }

    return updated;
  },

  async toggleChecklistItem(caseId: string, itemId: string, isCompleted: boolean, actorId: string) {
    const item = await prisma.caseChecklistItem.findFirst({
      where: { id: itemId, caseStage: { caseId } },
    });
    if (!item) throw new NotFoundError("Checklist item");

    const updated = await prisma.caseChecklistItem.update({
      where: { id: itemId },
      data: { isCompleted, completedAt: isCompleted ? new Date() : null },
    });

    await caseRepository.addTimelineEvent({
      caseId,
      actorId,
      type: "CHECKLIST_UPDATED",
      message: `Checklist item "${item.label}" marked ${isCompleted ? "complete" : "incomplete"}`,
    });

    return updated;
  },

  /**
   * Advance a case to a target stage. Enforces that all mandatory
   * checklist items on the *current* stage are completed first — this is
   * the "cannot move to next stage until mandatory checklist items are
   * done" rule from the spec.
   */
  async advanceStage(caseId: string, targetCaseStageId: string, actorId: string) {
    const found = await this.getById(caseId);

    if (found.currentCaseStageId) {
      const currentStage = found.caseStages.find((s) => s.id === found.currentCaseStageId);
      const incompleteMandatory = currentStage?.checklistItems.filter((i) => i.isMandatory && !i.isCompleted) ?? [];
      if (incompleteMandatory.length > 0) {
        throw new ValidationError(
          { incompleteItems: incompleteMandatory.map((i) => i.label) },
          "Cannot advance: mandatory checklist items are incomplete"
        );
      }
    }

    const targetStage = found.caseStages.find((s) => s.id === targetCaseStageId);
    if (!targetStage) throw new NotFoundError("Target stage");

    const now = new Date();

    await prisma.$transaction([
      prisma.caseStage.update({
        where: { id: found.currentCaseStageId ?? targetCaseStageId },
        data: { completedAt: found.currentCaseStageId ? now : undefined },
      }),
      prisma.caseStage.update({ where: { id: targetCaseStageId }, data: { enteredAt: now } }),
      prisma.case.update({ where: { id: caseId }, data: { currentCaseStageId: targetCaseStageId } }),
    ]);

    await caseRepository.addTimelineEvent({
      caseId,
      actorId,
      type: "STAGE_CHANGED",
      message: `Moved to stage "${targetStage.name}"`,
    });

    return this.getById(caseId);
  },

  async archive(id: string, actorId: string) {
    const found = await this.getById(id);
    if (found.status !== "COMPLETED") {
      throw new ValidationError(undefined, "Only completed cases can be archived");
    }
    const updated = await caseRepository.update(id, { status: "ARCHIVED" } as UpdateCaseDto);
    await prisma.case.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() } });
    await caseRepository.addTimelineEvent({ caseId: id, actorId, type: "ARCHIVED", message: "Case archived" });
    return updated;
  },

  async restore(id: string, actorId: string, userRole: string) {
    if (!["OWNER", "MANAGER"].includes(userRole)) throw new ForbiddenError();
    await this.getById(id);
    const updated = await prisma.case.update({
      where: { id },
      data: { isArchived: false, archivedAt: null, status: "COMPLETED" },
    });
    await caseRepository.addTimelineEvent({ caseId: id, actorId, type: "RESTORED", message: "Case restored from archive" });
    return updated;
  },

  async remove(id: string) {
    await this.getById(id);
    return caseRepository.softDelete(id);
  },
};
