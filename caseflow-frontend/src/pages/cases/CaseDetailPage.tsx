import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Archive as ArchiveIcon, Pencil, Trash2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { useCase, useUpdateCase, useArchiveCase, useHardDeleteCase } from "@/hooks/useCases";
import { StagePanel } from "@/components/cases/StagePanel";
import { DocumentsPanel } from "@/components/cases/DocumentsPanel";
import { TasksPanel } from "@/components/cases/TasksPanel";
import { PaymentsPanel } from "@/components/cases/PaymentsPanel";
import { TimelinePanel } from "@/components/cases/TimelinePanel";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDate, formatBHD } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { RECURRENCE_PERIODS, RECURRENCE_PERIOD_LABELS, RECURRENCE_UNITS, RECURRENCE_UNIT_LABELS } from "@/lib/recurrence";
import type { CaseStatus, Priority, RecurrencePeriod, RecurrenceUnit } from "@/lib/types";

const STATUS_OPTIONS: CaseStatus[] = [
  "NEW", "IN_PROGRESS", "WAITING_FOR_CLIENT", "WAITING_FOR_GOVERNMENT", "WAITING_FOR_PAYMENT", "COMPLETED", "CANCELLED",
];
const PRIORITY_OPTIONS: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: caseData, isLoading } = useCase(id);
  const updateCase = useUpdateCase();
  const archiveCase = useArchiveCase();
  const hardDeleteCase = useHardDeleteCase();
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const [notes, setNotes] = React.useState("");
  React.useEffect(() => setNotes(caseData?.internalNotes ?? ""), [caseData?.internalNotes]);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

  const [customValue, setCustomValue] = React.useState("");
  React.useEffect(() => setCustomValue(caseData?.recurrenceCustomValue ? String(caseData.recurrenceCustomValue) : ""), [caseData?.recurrenceCustomValue]);

  if (isLoading || !caseData) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const canEdit = hasRole("MANAGER", "EMPLOYEE");

  async function saveRecurrence(data: {
    isRecurring?: boolean;
    recurrencePeriod?: RecurrencePeriod;
    recurrenceCustomValue?: number;
    recurrenceCustomUnit?: RecurrenceUnit;
  }) {
    try {
      await updateCase.mutateAsync({ id: caseData!.id, data });
    } catch (err) {
      toast({ title: "Couldn't update recurrence", description: getApiErrorMessage(err), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/cases")}>
          <ArrowLeft className="h-4 w-4" /> Back to cases
        </Button>
        <div className="flex items-center gap-2">
          {caseData.status === "COMPLETED" && !caseData.isArchived && canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await archiveCase.mutateAsync(caseData.id);
                toast({ title: "Case archived", variant: "success" });
              }}
            >
              <ArchiveIcon className="h-4 w-4" /> Archive case
            </Button>
          )}
          {hasRole("MANAGER") && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setDeleteConfirmText("");
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete permanently
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-tag text-sm text-muted-foreground">{caseData.caseNumber}</p>
          <h1 className="text-xl font-semibold">{caseData.customer?.fullName}</h1>
          <p className="text-sm text-muted-foreground">{caseData.serviceTemplate?.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={caseData.status} />
          <PriorityBadge priority={caseData.priority} />
          {caseData.isRecurring && (
            <Badge variant="outline" className="gap-1">
              <Repeat className="h-3 w-3" /> Recurring
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Case details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Select
                      value={caseData.status}
                      onValueChange={(v) => updateCase.mutate({ id: caseData.id, data: { status: v as CaseStatus } })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <Select
                      value={caseData.priority}
                      onValueChange={(v) => updateCase.mutate({ id: caseData.id, data: { priority: v as Priority } })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Due date</p>
                    <p className="mt-2 text-sm font-medium">{formatDate(caseData.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned to</p>
                    <p className="mt-2 text-sm font-medium">
                      {caseData.assignedEmployee
                        ? `${caseData.assignedEmployee.firstName} ${caseData.assignedEmployee.lastName}`
                        : "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Government reference #</p>
                    <p className="mt-2 font-tag text-sm">{caseData.governmentReferenceNumber ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Government tracking #</p>
                    <p className="mt-2 font-tag text-sm">{caseData.governmentTrackingNumber ?? "—"}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isRecurring"
                      checked={caseData.isRecurring}
                      disabled={!canEdit}
                      onCheckedChange={(checked) => {
                        const isRecurring = !!checked;
                        if (isRecurring && !caseData.dueDate) {
                          toast({
                            title: "Set a due date first",
                            description: "Recurring cases need a due date to know when to generate the next one.",
                            variant: "destructive",
                          });
                          return;
                        }
                        saveRecurrence({ isRecurring, recurrencePeriod: isRecurring ? (caseData.recurrencePeriod ?? "MONTHLY") : undefined });
                      }}
                    />
                    <label htmlFor="isRecurring" className="cursor-pointer text-xs text-muted-foreground">
                      Recurring case
                    </label>
                  </div>

                  {caseData.isRecurring && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Select
                        value={caseData.recurrencePeriod ?? undefined}
                        onValueChange={(v) => saveRecurrence({ recurrencePeriod: v as RecurrencePeriod })}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRENCE_PERIODS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {RECURRENCE_PERIOD_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {caseData.recurrencePeriod === "CUSTOM" && (
                        <>
                          <Input
                            type="number"
                            min="1"
                            className="h-8 w-16 text-xs"
                            value={customValue}
                            disabled={!canEdit}
                            onChange={(e) => setCustomValue(e.target.value)}
                            onBlur={() => {
                              const n = Number(customValue);
                              if (n > 0 && n !== caseData.recurrenceCustomValue) {
                                saveRecurrence({
                                  recurrenceCustomValue: n,
                                  recurrenceCustomUnit: caseData.recurrenceCustomUnit ?? "DAYS",
                                });
                              }
                            }}
                          />
                          <Select
                            value={caseData.recurrenceCustomUnit ?? undefined}
                            onValueChange={(v) =>
                              saveRecurrence({
                                recurrenceCustomUnit: v as RecurrenceUnit,
                                recurrenceCustomValue: caseData.recurrenceCustomValue ?? (Number(customValue) || 1),
                              })
                            }
                            disabled={!canEdit}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {RECURRENCE_UNITS.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {RECURRENCE_UNIT_LABELS[u]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  )}

                  {caseData.recurrenceParentId && (
                    <p className="mt-2 text-xs text-muted-foreground">Auto-generated from a previous recurring case.</p>
                  )}
                </div>

                {caseData.description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="mt-1 text-sm">{caseData.description}</p>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Internal notes</p>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => {
                      if (notes !== caseData.internalNotes) {
                        updateCase.mutate({ id: caseData.id, data: { internalNotes: notes } });
                      }
                    }}
                    disabled={!canEdit}
                    placeholder="Notes visible only to staff…"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Case cost</span>
                  <span className="font-tag">{formatBHD(caseData.caseCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer price</span>
                  <span className="font-tag">{formatBHD(caseData.customerPrice)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 font-medium">
                  <span>Profit</span>
                  <span className="font-tag">
                    {formatBHD(Number(caseData.customerPrice ?? 0) - Number(caseData.caseCost ?? 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stages">
          <StagePanel caseData={caseData} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsPanel caseId={caseData.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksPanel caseId={caseData.id} tasks={caseData.tasks ?? []} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsPanel caseData={caseData} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelinePanel events={caseData.timelineEvents ?? []} />
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {caseData.caseNumber} permanently?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes the case and everything tied to it — documents, payments, tasks, checklist
            progress, and timeline history — from the database. This cannot be undone.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="deleteConfirm" className="text-xs text-muted-foreground">
              Type <span className="font-tag font-medium text-foreground">{caseData.caseNumber}</span> to confirm
            </label>
            <Input
              id="deleteConfirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== caseData.caseNumber}
              isLoading={hardDeleteCase.isPending}
              onClick={async () => {
                try {
                  await hardDeleteCase.mutateAsync(caseData.id);
                  toast({ title: "Case permanently deleted", variant: "success" });
                  navigate("/cases");
                } catch (err) {
                  toast({ title: "Couldn't delete case", description: getApiErrorMessage(err), variant: "destructive" });
                }
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
