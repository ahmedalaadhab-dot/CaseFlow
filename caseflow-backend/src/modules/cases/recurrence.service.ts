import { prisma } from "../../config/prisma";
import { caseRepository } from "./case.repository";
import { generateCaseNumber } from "../../common/utils/caseNumber";
import { computeNextRecurrenceDate } from "../../common/utils/recurrence";
import { notificationService } from "../notifications/notification.service";

// Finds recurring cases whose due date has arrived and haven't spawned
// their successor yet, and creates the next occurrence for each — cloning
// customer/service/pricing/recurrence settings, with the due date advanced
// by one recurrence period. `recurrenceGeneratedAt` on the source case is
// the idempotency guard: it's set exactly once per case, so re-running
// this (e.g. every scheduler tick, or via the manual trigger) never
// double-generates for the same due-date cycle.
export const recurrenceService = {
  async processDueRecurrences(): Promise<{ processed: number; created: string[] }> {
    const now = new Date();
    const dueCases = await prisma.case.findMany({
      where: {
        isRecurring: true,
        recurrenceGeneratedAt: null,
        deletedAt: null,
        isArchived: false,
        dueDate: { lte: now },
      },
    });

    const created: string[] = [];

    // Sequential on purpose: generateCaseNumber() counts existing cases to
    // derive the next sequence number, so concurrent creates could race
    // and collide on the same caseNumber.
    for (const source of dueCases) {
      if (!source.dueDate || !source.recurrencePeriod) continue; // guarded by the query, but keeps TS honest

      const nextDueDate = computeNextRecurrenceDate(
        source.dueDate,
        source.recurrencePeriod,
        source.recurrenceCustomValue,
        source.recurrenceCustomUnit
      );

      const caseNumber = await generateCaseNumber();
      const nextCase = await caseRepository.createWithStages({
        caseNumber,
        customerId: source.customerId,
        assignedEmployeeId: source.assignedEmployeeId ?? undefined,
        createdByUserId: source.createdByUserId,
        serviceTemplateId: source.serviceTemplateId,
        priority: source.priority,
        dueDate: nextDueDate,
        description: source.description ?? undefined,
        caseCost: source.caseCost ? Number(source.caseCost) : undefined,
        customerPrice: source.customerPrice ? Number(source.customerPrice) : undefined,
        isRecurring: true,
        recurrencePeriod: source.recurrencePeriod,
        recurrenceCustomValue: source.recurrenceCustomValue ?? undefined,
        recurrenceCustomUnit: source.recurrenceCustomUnit ?? undefined,
        recurrenceParentId: source.id,
      });

      await prisma.case.update({ where: { id: source.id }, data: { recurrenceGeneratedAt: now } });

      await caseRepository.addTimelineEvent({
        caseId: source.id,
        type: "RECURRENCE_GENERATED",
        message: `Recurring case generated: ${nextCase.caseNumber}`,
      });
      await caseRepository.addTimelineEvent({
        caseId: nextCase.id,
        type: "RECURRENCE_GENERATED",
        message: `Auto-generated from recurring case ${source.caseNumber}`,
      });

      if (source.assignedEmployeeId) {
        await notificationService.notify({
          recipientUserId: source.assignedEmployeeId,
          type: "RECURRING_CASE_CREATED",
          title: "Recurring case generated",
          body: `Case ${nextCase.caseNumber} was auto-generated from recurring case ${source.caseNumber}`,
          relatedCaseId: nextCase.id,
        });
      }

      created.push(nextCase.caseNumber);
    }

    return { processed: created.length, created };
  },
};
