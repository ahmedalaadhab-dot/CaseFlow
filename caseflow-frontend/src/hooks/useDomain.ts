import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api-client";
import type {
  ServiceTemplate,
  ServiceTemplateInput,
  DashboardSummary,
  DashboardCharts,
  Document,
  Task,
  Payment,
  SearchResults,
} from "@/lib/types";

export function useServiceTemplates(activeOnly = true) {
  return useQuery({
    queryKey: ["service-templates", activeOnly],
    queryFn: () => unwrap<ServiceTemplate[]>(api.get("/service-templates", { params: { activeOnly } })),
  });
}

export function useServiceTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["service-templates", id],
    queryFn: () => unwrap<ServiceTemplate>(api.get(`/service-templates/${id}`)),
    enabled: !!id,
  });
}

export function useCreateServiceTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ServiceTemplateInput) => unwrap<ServiceTemplate>(api.post("/service-templates", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-templates"] }),
  });
}

export function useUpdateServiceTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceTemplateInput> }) =>
      unwrap<ServiceTemplate>(api.patch(`/service-templates/${id}`, data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-templates"] }),
  });
}

export function useSetServiceTemplateActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      unwrap<ServiceTemplate>(api.patch(`/service-templates/${id}/active`, { isActive })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-templates"] }),
  });
}

export function useDeleteServiceTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/service-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-templates"] }),
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => unwrap<DashboardSummary>(api.get("/dashboard/summary")),
    refetchInterval: 60_000,
  });
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: () => unwrap<DashboardCharts>(api.get("/dashboard/charts")),
  });
}

export function useCaseDocuments(caseId: string | undefined) {
  return useQuery({
    queryKey: ["documents", caseId],
    queryFn: () => unwrap<Document[]>(api.get(`/documents/case/${caseId}`)),
    enabled: !!caseId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseId, file, category }: { caseId: string; file: File; category: string }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      return unwrap<Document>(api.post(`/documents/case/${caseId}`, form, { headers: { "Content-Type": "multipart/form-data" } }));
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["documents", vars.caseId] });
      qc.invalidateQueries({ queryKey: ["cases", vars.caseId] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; caseId: string }) => api.delete(`/documents/${id}`),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["documents", vars.caseId] }),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task> & { caseId: string; title: string }) => unwrap<Task>(api.post("/tasks", data)),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["cases", vars.caseId] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, caseId, data }: { id: string; caseId: string; data: Partial<Task> }) =>
      unwrap<Task>(api.patch(`/tasks/${id}`, data)),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["cases", vars.caseId] }),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { caseId: string; amount: number; method: string; invoiceNumber?: string }) =>
      unwrap<Payment>(api.post("/payments", data)),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["cases", vars.caseId] }),
  });
}

export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () => unwrap<SearchResults>(api.get("/search", { params: { q } })),
    enabled: q.trim().length > 1,
  });
}
