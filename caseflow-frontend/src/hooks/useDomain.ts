import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api-client";
import type {
  ServiceTemplate,
  ServiceTemplateInput,
  DashboardSummary,
  DashboardCharts,
  Document,
  DocumentFolder,
  Task,
  Payment,
  SearchResults,
  OfficeInfo,
} from "@/lib/types";

// Read-only — Settings -> Office info is the only place that writes this.
export function useOfficeInfo() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => unwrap<Record<string, unknown>>(api.get("/settings")),
    select: (data) => (data?.office_info as OfficeInfo) ?? null,
  });
}

export function useUploadOfficeLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return unwrap<{ value: OfficeInfo }>(api.post("/settings/logo", form, { headers: { "Content-Type": "multipart/form-data" } }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

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
    mutationFn: async ({
      caseId,
      file,
      category,
      folderId,
    }: {
      caseId: string;
      file: File;
      category: string;
      folderId?: string;
    }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      if (folderId) form.append("folderId", folderId);
      return unwrap<Document>(api.post(`/documents/case/${caseId}`, form, { headers: { "Content-Type": "multipart/form-data" } }));
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["documents", vars.caseId] });
      qc.invalidateQueries({ queryKey: ["cases", vars.caseId] });
    },
  });
}

export function useMoveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; caseId: string; folderId: string | null }) =>
      unwrap<Document>(api.patch(`/documents/${id}`, { folderId })),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["documents", vars.caseId] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; caseId: string }) => api.delete(`/documents/${id}`),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["documents", vars.caseId] }),
  });
}

export function useDocumentFolders(caseId: string | undefined) {
  return useQuery({
    queryKey: ["document-folders", caseId],
    queryFn: () => unwrap<DocumentFolder[]>(api.get(`/document-folders/case/${caseId}`)),
    enabled: !!caseId,
  });
}

export function useCreateDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, name }: { caseId: string; name: string }) =>
      unwrap<DocumentFolder>(api.post(`/document-folders/case/${caseId}`, { name })),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["document-folders", vars.caseId] }),
  });
}

export function useRenameDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; caseId: string; name: string }) =>
      unwrap<DocumentFolder>(api.patch(`/document-folders/${id}`, { name })),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["document-folders", vars.caseId] }),
  });
}

export function useDeleteDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; caseId: string }) => api.delete(`/document-folders/${id}`),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["document-folders", vars.caseId] });
      qc.invalidateQueries({ queryKey: ["documents", vars.caseId] });
    },
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
    mutationFn: (data: { caseId: string; amount: number; method: string }) => unwrap<Payment>(api.post("/payments", data)),
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
