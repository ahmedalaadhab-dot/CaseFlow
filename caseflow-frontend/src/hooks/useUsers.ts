import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api-client";
import type { StaffUser, CreateUserInput, UpdateUserInput, Role } from "@/lib/types";

export interface UserQuery {
  search?: string;
  role?: Role;
}

export function useUsers(query: UserQuery = {}) {
  return useQuery({
    queryKey: ["users", query],
    queryFn: () => unwrap<StaffUser[]>(api.get("/users", { params: query })),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => unwrap<StaffUser>(api.post("/users", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      unwrap<StaffUser>(api.patch(`/users/${id}`, data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.post(`/users/${id}/reset-password`, { newPassword }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<StaffUser>(api.post(`/users/${id}/deactivate`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<StaffUser>(api.post(`/users/${id}/reactivate`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
