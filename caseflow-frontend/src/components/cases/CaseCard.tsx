import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { PriorityBadge, PRIORITY_ACCENT } from "@/components/status-badges";
import { formatDate, cn } from "@/lib/utils";
import type { Case } from "@/lib/types";
import { Clock, AlertTriangle } from "lucide-react";

export function CaseCard({ item }: { item: Case }) {
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "COMPLETED";

  return (
    <Link to={`/cases/${item.id}`}>
      <Card className={cn("border-l-4 p-4 transition-shadow hover:shadow-md", PRIORITY_ACCENT[item.priority])}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-tag text-sm font-semibold">{item.caseNumber}</p>
          <PriorityBadge priority={item.priority} />
        </div>
        <p className="mt-1 text-sm font-medium">{item.customer?.fullName}</p>
        <p className="text-xs text-muted-foreground">{item.serviceTemplate?.name}</p>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {isOverdue ? <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> : <Clock className="h-3.5 w-3.5" />}
            <span className={cn(isOverdue && "text-red-600 font-medium")}>{formatDate(item.dueDate)}</span>
          </span>
          {item.assignedEmployee && (
            <span>
              {item.assignedEmployee.firstName} {item.assignedEmployee.lastName}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
