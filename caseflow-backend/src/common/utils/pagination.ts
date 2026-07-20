import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export function toSkipTake(query: PaginationQuery) {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

export function buildMeta(query: PaginationQuery, totalCount: number) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / query.pageSize)),
  };
}
