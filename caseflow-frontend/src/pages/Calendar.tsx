import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { useCases } from "@/hooks/useCases";
import { formatDate, cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// A focused view over the same case data the list/kanban pages use,
// sorted by due date — full appointment/expiry scheduling (a distinct
// Appointment model) is a natural next module once the office wants to
// track in-person visits separately from case due dates.
export default function CalendarPage() {
  const { data, isLoading } = useCases({ pageSize: 100, sortBy: "dueDate", sortDir: "asc", isArchived: false });

  const withDueDate = (data?.items ?? []).filter((c) => c.dueDate && c.status !== "COMPLETED" && c.status !== "CANCELLED");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">Upcoming due dates across all active cases.</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {withDueDate.length === 0 && <p className="p-6 text-sm text-muted-foreground">No upcoming deadlines.</p>}
          {withDueDate.map((c) => {
            const isOverdue = new Date(c.dueDate!) < new Date();
            return (
              <Link key={c.id} to={`/cases/${c.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-secondary/50">
                <div className="flex items-center gap-3">
                  <CalendarDays className={cn("h-4 w-4", isOverdue ? "text-red-600" : "text-muted-foreground")} />
                  <div>
                    <p className="font-tag text-sm font-medium">{c.caseNumber}</p>
                    <p className="text-xs text-muted-foreground">{c.customer?.fullName} · {c.serviceTemplate?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm", isOverdue && "text-red-600 font-medium")}>{formatDate(c.dueDate)}</span>
                  <PriorityBadge priority={c.priority} />
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
