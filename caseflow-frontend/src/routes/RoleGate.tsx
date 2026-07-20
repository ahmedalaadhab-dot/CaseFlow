import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

export function RoleGate({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return null;
  return <>{children}</>;
}

export function ForbiddenPage() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">You don't have access to this page</h2>
      <p className="text-sm text-muted-foreground">Ask an owner or manager if you think this is a mistake.</p>
    </div>
  );
}

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return <ForbiddenPage />;
  return <>{children}</>;
}
