import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge, PRIORITY_ACCENT } from "@/components/status-badges";
import { useCases, useUpdateCase } from "@/hooks/useCases";
import { CaseFormDialog } from "@/components/cases/CaseFormDialog";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";
import type { Case, CaseStatus } from "@/lib/types";

const COLUMNS: { status: CaseStatus; label: string; accent: string }[] = [
  { status: "NEW", label: "New", accent: "bg-slate-100 text-slate-700" },
  { status: "IN_PROGRESS", label: "In Progress", accent: "bg-blue-100 text-blue-700" },
  { status: "WAITING_FOR_CLIENT", label: "Waiting for Client", accent: "bg-amber-100 text-amber-700" },
  { status: "WAITING_FOR_GOVERNMENT", label: "Waiting for Government", accent: "bg-violet-100 text-violet-700" },
  { status: "WAITING_FOR_PAYMENT", label: "Waiting for Payment", accent: "bg-orange-100 text-orange-700" },
  { status: "COMPLETED", label: "Completed", accent: "bg-emerald-100 text-emerald-700" },
];

function KanbanCard({ item }: { item: Case }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-lg border-l-4 border border-border bg-card p-3 shadow-sm active:cursor-grabbing",
        PRIORITY_ACCENT[item.priority],
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-tag text-xs font-semibold">{item.caseNumber}</p>
        <PriorityBadge priority={item.priority} />
      </div>
      <p className="mt-1 text-sm font-medium truncate">{item.customer?.fullName}</p>
      <p className="text-xs text-muted-foreground truncate">{item.serviceTemplate?.name}</p>
      <p className="mt-2 text-xs text-muted-foreground">Due {formatDate(item.dueDate)}</p>
    </div>
  );
}

function KanbanColumn({ status, label, accent, items }: { status: CaseStatus; label: string; accent: string; items: Case[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn("flex w-72 shrink-0 flex-col rounded-xl bg-secondary/60 p-3", isOver && "ring-2 ring-accent")}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", accent)}>{label}</span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[100px]">
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { data, isLoading } = useCases({ pageSize: 100, isArchived: false });
  const updateCase = useUpdateCase();
  const { toast } = useToast();
  const [activeItem, setActiveItem] = React.useState<Case | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const casesByStatus = React.useMemo(() => {
    const map = new Map<CaseStatus, Case[]>();
    COLUMNS.forEach((c) => map.set(c.status, []));
    data?.items.forEach((item) => {
      if (map.has(item.status)) map.get(item.status)!.push(item);
    });
    return map;
  }, [data]);

  function handleDragStart(event: DragStartEvent) {
    const item = data?.items.find((c) => c.id === event.active.id);
    setActiveItem(item ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;
    const item = data?.items.find((c) => c.id === active.id);
    const targetStatus = over.id as CaseStatus;
    if (!item || item.status === targetStatus) return;

    try {
      await updateCase.mutateAsync({ id: item.id, data: { status: targetStatus } as any });
      toast({ title: `Moved to ${targetStatus.replace(/_/g, " ")}`, variant: "success" });
    } catch {
      toast({ title: "Couldn't update case status", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Kanban</h1>
          <p className="text-sm text-muted-foreground">Drag a case to change its status.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New case
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn key={col.status} status={col.status} label={col.label} accent={col.accent} items={casesByStatus.get(col.status) ?? []} />
          ))}
        </div>
        <DragOverlay>{activeItem && <KanbanCard item={activeItem} />}</DragOverlay>
      </DndContext>

      <CaseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
