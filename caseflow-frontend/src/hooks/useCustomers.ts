import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api-client";
import type { Customer, PaginatedMeta } from "@/lib/types";

export interface CustomerQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "fullName" | "createdAt" | "updatedAt";
  sortDir?: "asc" | "desc";
}

export function useCustomers(query: CustomerQuery) {
  return useQuery({
    queryKey: ["customers", query],
    queryFn: async () => {
      const res = await api.get<{ data: Customer[]; meta: PaginatedMeta }>("/customers", { params: query });
      return { items: res.data.data, meta: res.data.meta! };
    },
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => unwrap<Customer>(api.get(`/customers/${id}`)),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) => unwrap<Customer>(api.post("/customers", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      unwrap<Customer>(api.patch(`/customers/${id}`, data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
