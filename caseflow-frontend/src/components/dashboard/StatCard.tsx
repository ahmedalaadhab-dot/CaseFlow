import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "text-primary",
  isLoading,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold font-tag">{isLoading ? "—" : value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-secondary", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
