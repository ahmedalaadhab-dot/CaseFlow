import * as React from "react";
import { Plus, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCases, useRunRecurrenceCheck } from "@/hooks/useCases";
import { CaseCard } from "@/components/cases/CaseCard";
import { CaseFormDialog } from "@/components/cases/CaseFormDialog";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { RoleGate } from "@/routes/RoleGate";
import type { CaseStatus, Priority } from "@/lib/types";

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_FOR_CLIENT", label: "Waiting for Client" },
  { value: "WAITING_FOR_GOVERNMENT", label: "Waiting for Government" },
  { value: "WAITING_FOR_PAYMENT", label: "Waiting for Payment" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default function CasesListPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<CaseStatus | "ALL">("ALL");
  const [priority, setPriority] = React.useState<Priority | "ALL">("ALL");
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const { toast } = useToast();
  const runRecurrenceCheck = useRunRecurrenceCheck();

  const { data, isLoading } = useCases({
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    priority: priority === "ALL" ? undefined : priority,
    page,
    pageSize: 12,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cases</h1>
          <p className="text-sm text-muted-foreground">{data?.meta.totalCount ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <RoleGate roles={["MANAGER"]}>
            <Button
              variant="outline"
              isLoading={runRecurrenceCheck.isPending}
              onClick={async () => {
                try {
                  const result = await runRecurrenceCheck.mutateAsync();
                  toast({
                    title: result.processed > 0 ? `Generated ${result.processed} recurring case(s)` : "No recurring cases due",
                    description: result.created.join(", ") || undefined,
                    variant: "success",
                  });
                } catch (err) {
                  toast({ title: "Couldn't run recurrence check", description: getApiErrorMessage(err), variant: "destructive" });
                }
              }}
            >
              <RefreshCw className="h-4 w-4" /> Check recurring
            </Button>
          </RoleGate>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New case
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Case #, tracking #, customer…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(1); }}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => { setPriority(v as any); setPage(1); }}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All priorities</SelectItem>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data?.items.length === 0 && <p className="text-sm text-muted-foreground">No cases match your filters.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((c) => (
          <CaseCard key={c.id} item={c} />
        ))}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CaseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
