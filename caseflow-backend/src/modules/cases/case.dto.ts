import { z } from "zod";
import { CaseStatus, Priority } from "@prisma/client";

function isPastDate(date: Date): boolean {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return date < startOfToday;
}

// Only catches the case where both caseCost and customerPrice are sent in
// the same request. The authoritative check for updates (merged with the
// case's existing stored values, since a PATCH can touch just one of the
// two) lives in case.service.ts's update().
function validateCostAndDueDate(
  data: { dueDate?: Date | null; caseCost?: number; customerPrice?: number },
  ctx: z.RefinementCtx
) {
  if (data.dueDate && isPastDate(data.dueDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dueDate"], message: "Due date cannot be in the past" });
  }
  if (data.caseCost !== undefined && data.customerPrice !== undefined && data.customerPrice < data.caseCost) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerPrice"],
      message: "Customer price cannot be less than case cost",
    });
  }
}

export const createCaseSchema = z
  .object({
    customerId: z.string().min(1),
    serviceTemplateId: z.string().min(1),
    assignedEmployeeId: z.string().optional(),
    priority: z.nativeEnum(Priority).optional(),
    dueDate: z.coerce.date().optional(),
    description: z.string().optional(),
    caseCost: z.number().nonnegative().optional(),
    customerPrice: z.number().nonnegative().optional(),
  })
  .superRefine(validateCostAndDueDate);
export type CreateCaseDto = z.infer<typeof createCaseSchema>;

export const updateCaseSchema = z
  .object({
    assignedEmployeeId: z.string().nullable().optional(),
    priority: z.nativeEnum(Priority).optional(),
    status: z.nativeEnum(CaseStatus).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    description: z.string().optional(),
    internalNotes: z.string().optional(),
    governmentReferenceNumber: z.string().optional(),
    governmentTrackingNumber: z.string().optional(),
    caseCost: z.number().nonnegative().optional(),
    customerPrice: z.number().nonnegative().optional(),
  })
  .superRefine(validateCostAndDueDate);
export type UpdateCaseDto = z.infer<typeof updateCaseSchema>;

export const advanceStageSchema = z.object({
  targetCaseStageId: z.string().min(1),
});
export type AdvanceStageDto = z.infer<typeof advanceStageSchema>;

export const toggleChecklistItemSchema = z.object({
  isCompleted: z.boolean(),
});
export type ToggleChecklistItemDto = z.infer<typeof toggleChecklistItemSchema>;

export const caseQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(CaseStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assignedEmployeeId: z.string().optional(),
  serviceTemplateId: z.string().optional(),
  customerId: z.string().optional(),
  // z.coerce.boolean() would coerce the string "false" to `true` (any
  // non-empty string is truthy) — parse the literal query values instead.
  isArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "dueDate", "priority", "caseNumber"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
export type CaseQueryDto = z.infer<typeof caseQuerySchema>;
