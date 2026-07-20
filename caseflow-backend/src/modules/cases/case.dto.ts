import { z } from "zod";
import { CaseStatus, Priority } from "@prisma/client";

export const createCaseSchema = z.object({
  customerId: z.string().min(1),
  serviceTemplateId: z.string().min(1),
  assignedEmployeeId: z.string().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.coerce.date().optional(),
  description: z.string().optional(),
  caseCost: z.number().nonnegative().optional(),
  customerPrice: z.number().nonnegative().optional(),
});
export type CreateCaseDto = z.infer<typeof createCaseSchema>;

export const updateCaseSchema = z.object({
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
});
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
