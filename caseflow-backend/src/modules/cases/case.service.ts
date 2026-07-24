import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { caseRepository } from "./case.repository";
import { CreateCaseDto, UpdateCaseDto, CaseQueryDto } from "./case.dto";
import { generateCaseNumber } from "../../common/utils/caseNumber";
import { NotFoundError, ValidationError, ForbiddenError } from "../../common/errors/AppError";
import { buildMeta } from "../../common/utils/pagination";
import { notificationService } from "../notifications/notification.service";
import { storage } from "../../common/storage";

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
      isRecurring: dto.isRecurring ?? false,
      recurrencePeriod: dto.isRecurring ? dto.recurrencePeriod : undefined,
      recurrenceCustomValue: dto.isRecurring && dto.recurrencePeriod === "CUSTOM" ? dto.recurrenceCustomValue : undefined,
      recurrenceCustomUnit: dto.isRecurring && dto.recurrencePeriod === "CUSTOM" ? dto.recurrenceCustomUnit : undefined,
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

    // A PATCH can touch just one of these two fields, so the DTO-level
    // check (case.dto.ts) can't see the whole picture — compare against
    // whichever value isn't being changed too.
    const effectiveCaseCost = dto.caseCost !== undefined ? dto.caseCost : Number(existing.caseCost ?? 0);
    const effectiveCustomerPrice =
      dto.customerPrice !== undefined ? dto.customerPrice : Number(existing.customerPrice ?? 0);
    if (effectiveCustomerPrice < effectiveCaseCost) {
      throw new ValidationError(undefined, "Customer price cannot be less than case cost");
    }

    const wasReassigned = dto.assignedEmployeeId && dto.assignedEmployeeId !== existing.assignedEmployeeId;

    // A PATCH can touch just one recurrence field, so validate against the
    // merged effective state (mirrors the cost/price check above).
    const effectiveIsRecurring = dto.isRecurring ?? existing.isRecurring;
    let recurrenceGeneratedAt: Date | null | undefined;
    if (effectiveIsRecurring) {
      const effectiveDueDate = dto.dueDate !== undefined ? dto.dueDate : existing.dueDate;
      const effectivePeriod = dto.recurrencePeriod ?? existing.recurrencePeriod ?? undefined;
      if (!effectiveDueDate) throw new ValidationError(undefined, "Recurring cases require a due date");
      if (!effectivePeriod) throw new ValidationError(undefined, "Select a recurrence period");
      if (effectivePeriod === "CUSTOM") {
        const effectiveCustomValue = dto.recurrenceCustomValue ?? existing.recurrenceCustomValue ?? undefined;
        const effectiveCustomUnit = dto.recurrenceCustomUnit ?? existing.recurrenceCustomUnit ?? undefined;
        if (!effectiveCustomValue || !effectiveCustomUnit) {
          throw new ValidationError(undefined, "Custom recurrence needs an interval and unit");
        }
      }

      // Recurrence was just turned on, or the due date moved — either way
      // this case hasn't generated a successor for its (new) due date yet,
      // so clear any stale "already generated" marker.
      const recurringJustEnabled = dto.isRecurring === true && !existing.isRecurring;
      const dueDateChanged =
        dto.dueDate !== undefined && (dto.dueDate?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null);
      if (existing.recurrenceGeneratedAt && (recurringJustEnabled || dueDateChanged)) {
        recurrenceGeneratedAt = null;
      }
    }

    const updated = await caseRepository.update(id, { ...dto, ...(recurrenceGeneratedAt !== undefined ? { recurrenceGeneratedAt } : {}) });

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

  // Irreversible: wipes the case and every related row (documents, folders,
  // tasks, timeline, payments, stages/checklist) from the DB, plus the
  // underlying document/receipt files from storage. Deliberately looks the
  // case up directly rather than via getById(), which filters out
  // already-soft-deleted/archived cases — this should work regardless of
  // status since "permanently delete" is a stronger, independent action.
  async hardDelete(id: string, actorId: string) {
    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Case");

    const { documentKeys, receiptKeys } = await caseRepository.getStorageKeys(id);

    const snapshot = {
      caseNumber: existing.caseNumber,
      customerId: existing.customerId,
      serviceTemplateId: existing.serviceTemplateId,
      status: existing.status,
      createdAt: existing.createdAt.toISOString(),
    } satisfies Prisma.InputJsonValue;

    await caseRepository.hardDelete(id, actorId, snapshot);

    // DB rows are already gone at this point — a file that's missing or
    // fails to delete shouldn't undo (or fail to report) the DB deletion.
    await Promise.allSettled([...documentKeys, ...receiptKeys].map((key) => storage.delete(key)));
  },
};
