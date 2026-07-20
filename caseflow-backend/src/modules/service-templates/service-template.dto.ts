import { z } from "zod";
import { Priority } from "@prisma/client";

export const checklistItemInput = z.object({
  label: z.string().min(1),
  isMandatory: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const requiredDocumentInput = z.object({
  category: z.enum([
    "PASSPORT", "CPR", "PHOTOS", "MEDICAL", "CONTRACTS", "INVOICES", "GOVERNMENT_FORMS", "OTHER",
  ]),
  label: z.string().min(1),
  isMandatory: z.boolean().default(true),
});

export const stageInput = z.object({
  id: z.string().optional(), // present when updating an existing stage
  name: z.string().min(1),
  order: z.number().int(),
  color: z.string().default("#1e3a5f"),
  checklistItems: z.array(checklistItemInput).default([]),
  requiredDocuments: z.array(requiredDocumentInput).default([]),
});

export const createServiceTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  estimatedDays: z.number().int().positive().optional(),
  defaultPriority: z.nativeEnum(Priority).default("NORMAL"),
  stages: z.array(stageInput).min(1, "At least one stage is required"),
});
export type CreateServiceTemplateDto = z.infer<typeof createServiceTemplateSchema>;

export const updateServiceTemplateSchema = createServiceTemplateSchema.partial();
export type UpdateServiceTemplateDto = z.infer<typeof updateServiceTemplateSchema>;
