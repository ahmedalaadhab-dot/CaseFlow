import { Badge } from "@/components/ui/badge";
import type { CaseStatus, Priority, PaymentStatus } from "@/lib/types";

const STATUS_CONFIG: Record<CaseStatus, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  NEW: { label: "New", variant: "muted" },
  IN_PROGRESS: { label: "In Progress", variant: "info" },
  WAITING_FOR_CLIENT: { label: "Waiting for Client", variant: "warning" },
  WAITING_FOR_GOVERNMENT: { label: "Waiting for Government", variant: "violet" },
  WAITING_FOR_PAYMENT: { label: "Waiting for Payment", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  ARCHIVED: { label: "Archived", variant: "muted" },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  LOW: { label: "Low", variant: "muted" },
  NORMAL: { label: "Normal", variant: "info" },
  HIGH: { label: "High", variant: "warning" },
  URGENT: { label: "Urgent", variant: "destructive" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export const PRIORITY_ACCENT: Record<Priority, string> = {
  LOW: "border-l-priority-low",
  NORMAL: "border-l-priority-normal",
  HIGH: "border-l-priority-high",
  URGENT: "border-l-priority-urgent",
};

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  UNPAID: { label: "Unpaid", variant: "destructive" },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  REFUNDED: { label: "Refunded", variant: "muted" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = PAYMENT_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
