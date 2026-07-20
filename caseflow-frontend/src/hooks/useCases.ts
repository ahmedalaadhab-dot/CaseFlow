import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api-client";
import type { Case, CaseStatus, Priority, PaginatedMeta } from "@/lib/types";

export interface CaseQuery {
  search?: string;
  status?: CaseStatus;
  priority?: Priority;
  assignedEmployeeId?: string;
  serviceTemplateId?: string;
  customerId?: string;
  isArchived?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "updatedAt" | "dueDate" | "priority" | "caseNumber";
  sortDir?: "asc" | "desc";
}

export function useCases(query: CaseQuery) {
  return useQuery({
    queryKey: ["cases", query],
    queryFn: async () => {
      const res = await api.get<{ data: Case[]; meta: PaginatedMeta }>("/cases", { params: query });
      return { items: res.data.data, meta: res.data.meta! };
    },
    placeholderData: (prev) => prev,
  });
}

export function useCase(id: string | undefined) {
  return useQuery({
    queryKey: ["cases", id],
    queryFn: () => unwrap<Case>(api.get(`/cases/${id}`)),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      customerId: string;
      serviceTemplateId: string;
      assignedEmployeeId?: string;
      priority?: Priority;
      dueDate?: string;
      description?: string;
      caseCost?: number;
      customerPrice?: number;
    }) => unwrap<Case>(api.post("/cases", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
}

export function useUpdateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Case> }) => unwrap<Case>(api.patch(`/cases/${id}`, data)),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["cases", vars.id] });
    },
  });
}

export function useAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, targetCaseStageId }: { caseId: string; targetCaseStageId: string }) =>
      unwrap<Case>(api.post(`/cases/${caseId}/advance-stage`, { targetCaseStageId })),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["cases", vars.caseId] });
    },
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, itemId, isCompleted }: { caseId: string; itemId: string; isCompleted: boolean }) =>
      unwrap(api.patch(`/cases/${caseId}/checklist/${itemId}`, { isCompleted })),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["cases", vars.caseId] }),
  });
}

export function useArchiveCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<Case>(api.post(`/cases/${id}/archive`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
}

export function useRestoreCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<Case>(api.post(`/cases/${id}/restore`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
}
