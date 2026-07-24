import { z } from "zod";

export const createCustomerSchema = z.object({
  fullName: z.string().min(1),
  nationality: z.string().optional(),
  cpr: z.string().optional(),
  passportNumber: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  employer: z.string().optional(),
  notes: z.string().optional(),
  profilePicture: z.string().optional(),
  ekeyUsername: z.string().optional(),
  ekeyPassword: z.string().optional(),
  molUsername: z.string().optional(),
  molPassword: z.string().optional(),
  tamkeenUsername: z.string().optional(),
  tamkeenPassword: z.string().optional(),
  sioUsername: z.string().optional(),
  sioPassword: z.string().optional(),
});
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;

export const customerQuerySchema = z.object({
  search: z.string().optional(), // matches name, CPR, passport, phone
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["fullName", "createdAt", "updatedAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
export type CustomerQueryDto = z.infer<typeof customerQuerySchema>;
